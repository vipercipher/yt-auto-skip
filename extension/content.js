// Auto Ad Skipper - content script (v2.0)
//
// Runs in every page and every iframe (so it also covers YouTube videos
// embedded in other websites, and ad players that live inside iframes).
//
// Rule: it ONLY acts when a real "Skip Ad" button is visible. It never
// touches the video itself and never clicks countdowns ("Skip in 5"),
// "Skip intro", "Skip to content" and the like.
//
// 1. Normal click on the button.
// 2. If the button is still there 1 s later (some players ignore script
//    clicks), ask the background worker for ONE real mouse click at the
//    button's position (Chrome/Edge/Brave only - Safari has no such API).

(() => {
  if (window.__autoAdSkipperLoaded) return;
  window.__autoAdSkipperLoaded = true;

  const IS_TOP = window === window.top;
  const HOST = location.hostname;
  const IS_YT = /(^|\.)youtube(-nocookie)?\.com$/i.test(HOST);
  const LOG = (...a) => console.log("[Auto Ad Skipper]", ...a);

  // --- Known skip buttons -------------------------------------------------
  const YT_SELECTORS = [
    ".ytp-skip-ad-button",
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-ad-skip-button-container button",
    ".ytp-ad-skip-button-slot button",
    "button[id^='skip-button']",
  ];
  // Ad-only classes used by common video ad players (Google IMA, JW Player...)
  const KNOWN_AD_SELECTORS = [
    ".videoAdUiSkipButton",
    ".jw-skip.jw-skippable",
    ".vast-skip-button",
  ];

  // "Skip", "Skip Ad", "Skip Ads", "Skip advert", "Skip advertisement", with
  // optional arrow. Rejects "Skip in 5", "Skip intro", "Skip to content"...
  const SKIP_LABEL = /^skip(\s+(the\s+)?(ad|ads|advert|adverts|advertisement|advertisements|advertising))?[^\p{L}\p{N}]*$/iu;
  const EXPLICIT_AD_LABEL = /\b(ad|ads|advert\w*)\b/i;
  const AD_CONTEXT = /(^|[\s_-])(ad|ads|advert\w*|ima|vast|vpaid|preroll|midroll|videoad\w*)([\s_-]|$)|videoAd|adContainer|ad-container|ad-overlay|advert/i;
  const AD_FRAME_HOST = /(imasdk\.googleapis\.com|doubleclick\.net|googlesyndication\.com|googleadservices\.com|adnxs\.com|springserve|spotx|teads|innovid|jwpltx)/i;

  let enabled = true;
  let skipCount = 0;
  let timer = null;
  const handled = new WeakMap(); // element -> { at, trustedSent }

  function alive() {
    try {
      return !!(chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  try {
    chrome.storage.local.get({ enabled: true, skipCount: 0 }, (d) => {
      enabled = d.enabled;
      skipCount = d.skipCount;
    });
    chrome.storage.onChanged.addListener((c) => {
      if (c.enabled) enabled = c.enabled.newValue;
      if (c.skipCount) skipCount = c.skipCount.newValue;
    });
  } catch (e) {
    return;
  }

  // --- Helpers ------------------------------------------------------------
  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || s.pointerEvents === "none") return false;
    if (parseFloat(s.opacity) < 0.5) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0;
  }

  function labelOf(el) {
    const raw = el.getAttribute("aria-label") || el.innerText || el.textContent || "";
    return raw.replace(/\s+/g, " ").trim();
  }

  function isSafeToClick(el) {
    if (el.disabled || el.getAttribute("aria-disabled") === "true") return false;
    if (el.tagName === "A") {
      const href = (el.getAttribute("href") || "").trim();
      if (href && href !== "#" && !href.startsWith("javascript:")) return false; // don't navigate away
    }
    return true;
  }

  function inAdContext(el) {
    if (AD_FRAME_HOST.test(HOST)) return true;
    let n = el;
    for (let i = 0; n && i < 10; i++, n = n.parentElement) {
      const id = n.id || "";
      const cls = typeof n.className === "string" ? n.className : "";
      if (AD_CONTEXT.test(id) || AD_CONTEXT.test(cls)) return true;
    }
    return false;
  }

  // --- Finding the button -------------------------------------------------
  function findYouTubeSkip() {
    const players = document.querySelectorAll(".html5-video-player");
    for (const player of players) {
      if (!player.classList.contains("ad-showing") && !player.classList.contains("ad-interrupting")) continue;
      for (const sel of YT_SELECTORS) {
        const el = player.querySelector(sel);
        if (isVisible(el)) return el;
      }
      for (const el of player.querySelectorAll("button, [role='button']")) {
        if (SKIP_LABEL.test(labelOf(el)) && isVisible(el)) return el;
      }
    }
    return null;
  }

  function findGenericSkip() {
    for (const sel of KNOWN_AD_SELECTORS) {
      for (const el of document.querySelectorAll(sel)) {
        if (isVisible(el) && isSafeToClick(el) && !/\d/.test(labelOf(el))) return el;
      }
    }

    const hasVideo = !!document.querySelector("video");
    // Only scan pages that have a video, or iframes (ad players often sit in one).
    if (!hasVideo && IS_TOP) return null;

    const sel = hasVideo
      ? "button, [role='button'], [class*='skip' i], [id*='skip' i], [aria-label*='skip' i]"
      : "[class*='skip' i], [id*='skip' i], [aria-label*='skip' i]";

    const candidates = new Set(document.querySelectorAll(sel));
    // Also catch plain elements whose own text says "Skip..." (e.g. <span>Skip Ad</span>)
    if (hasVideo) {
      const it = document.evaluate(
        "//*[not(self::script or self::style)][text()[contains(translate(., 'SKIP', 'skip'), 'skip')]]",
        document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (let i = 0; i < Math.min(it.snapshotLength, 50); i++) candidates.add(it.snapshotItem(i));
    }

    for (const el of candidates) {
      const label = labelOf(el);
      if (!label || label.length > 30 || !SKIP_LABEL.test(label)) continue;
      // A bare "Skip" only counts inside something that is clearly an ad.
      if (!EXPLICIT_AD_LABEL.test(label) && !inAdContext(el)) continue;
      if (isVisible(el) && isSafeToClick(el)) return el;
    }
    return null;
  }

  // --- Clicking -----------------------------------------------------------
  function countSkip(where) {
    skipCount += 1;
    try {
      chrome.storage.local.set({ skipCount });
    } catch (e) {}
    LOG(`Skipped ad #${skipCount} (${where})`);
  }

  function stillThere(el) {
    return el.isConnected && isVisible(el);
  }

  function requestRealClick(el, where) {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    LOG("Normal click ignored, asking for a real click");
    try {
      chrome.runtime.sendMessage({ type: "trustedClick", x, y }, (res) => {
        void chrome.runtime.lastError;
        setTimeout(() => {
          if (!stillThere(el)) countSkip(where + ", real click");
          else if (res && res.unsupported) LOG("This browser can't send real clicks (e.g. Safari) - skip button ignored our click");
          else LOG("Real click didn't skip either", JSON.stringify(res));
        }, 600);
      });
    } catch (e) {
      stop();
    }
  }

  function check() {
    if (!alive()) return stop();
    if (!enabled) return;

    const btn = IS_YT ? findYouTubeSkip() || findGenericSkip() : findGenericSkip();
    if (!btn) return;

    const where = IS_YT ? (IS_TOP ? "YouTube" : "embedded YouTube") : HOST || "page";
    const now = Date.now();
    const state = handled.get(btn);

    if (!state) {
      handled.set(btn, { at: now, trustedSent: false });
      btn.click();
      LOG(`Skip button found on ${where}: "${labelOf(btn)}", clicked`);
      setTimeout(() => {
        if (!stillThere(btn)) countSkip(where);
      }, 500);
      return;
    }

    if (!state.trustedSent && now - state.at > 1000) {
      state.trustedSent = true;
      requestRealClick(btn, where);
    }
  }

  // --- Frame position helper (lets the background click inside iframes) ---
  // The background sends a one-time token to this frame and asks the child
  // iframe to post it to us; we answer with that iframe's position.
  const pendingTokens = new Map();
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "expectToken") {
      const t = setTimeout(() => {
        if (pendingTokens.delete(msg.token)) sendResponse(null);
      }, 1500);
      pendingTokens.set(msg.token, (offset) => {
        clearTimeout(t);
        sendResponse(offset);
      });
      return true;
    }
    if (msg && msg.type === "postToken" && !IS_TOP) {
      window.parent.postMessage({ __aasToken: msg.token }, "*");
    }
  });
  window.addEventListener("message", (e) => {
    const token = e.data && e.data.__aasToken;
    if (!token || !pendingTokens.has(token)) return;
    const done = pendingTokens.get(token);
    pendingTokens.delete(token);
    const frame = Array.from(document.querySelectorAll("iframe, frame")).find((f) => f.contentWindow === e.source);
    if (!frame) return done(null);
    const r = frame.getBoundingClientRect();
    const cs = getComputedStyle(frame);
    done({
      x: r.left + frame.clientLeft + parseFloat(cs.paddingLeft || 0),
      y: r.top + frame.clientTop + parseFloat(cs.paddingTop || 0),
    });
  });

  timer = setInterval(check, IS_YT ? 250 : 400);
  if (IS_TOP || IS_YT) LOG(`loaded v2.0 on ${HOST || "page"}`);
})();

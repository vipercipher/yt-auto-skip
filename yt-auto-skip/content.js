// YouTube Auto Skip - content script (v1.2)
//
// Lightweight: checks 4x per second, never touches the video itself.
// When a Skip button is visible it clicks it once. If YouTube ignores that
// (it can reject script clicks), it asks the background worker to send one
// real browser-level mouse click at the button's position.

(() => {
  const LOG = (...a) => console.log("[YouTube Auto Skip]", ...a);

  const SKIP_SELECTORS = [
    ".ytp-skip-ad-button",
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-ad-skip-button-container button",
    ".ytp-ad-skip-button-slot button",
    ".videoAdUiSkipButton",
    "button[id^='skip-button']",
  ];

  let enabled = true;
  let skipCount = 0;
  let timer = null;
  const handled = new WeakMap(); // button -> { clickedAt, trustedSent }

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
    });
  } catch (e) {
    return;
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || parseFloat(s.opacity) < 0.5) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function findSkipButton() {
    const player = document.querySelector("#movie_player");
    if (!player || !player.classList.contains("ad-showing")) return null;
    for (const sel of SKIP_SELECTORS) {
      const el = player.querySelector(sel);
      if (isVisible(el)) return el;
    }
    return null;
  }

  function countSkip() {
    skipCount += 1;
    try {
      chrome.storage.local.set({ skipCount });
    } catch (e) {}
    LOG(`Skipped ad #${skipCount}`);
  }

  function check() {
    if (!alive()) return stop();
    if (!enabled) return;

    const btn = findSkipButton();
    if (!btn) return;

    const now = Date.now();
    const state = handled.get(btn);

    if (!state) {
      // First sighting: normal click.
      handled.set(btn, { clickedAt: now, trustedSent: false });
      btn.click();
      LOG("Skip button found, clicked");
      setTimeout(() => {
        if (!findSkipButton()) countSkip();
      }, 400);
      return;
    }

    // Still there 1s after our click -> YouTube ignored it. Send one real click.
    if (!state.trustedSent && now - state.clickedAt > 1000) {
      state.trustedSent = true;
      const r = btn.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      LOG("Normal click ignored, sending real click at", Math.round(x), Math.round(y));
      try {
        chrome.runtime.sendMessage({ type: "trustedClick", x, y }, () => {
          void chrome.runtime.lastError;
          setTimeout(() => {
            if (!findSkipButton()) countSkip();
            else LOG("Real click also didn't skip - please send a screenshot of Inspect on the Skip button");
          }, 500);
        });
      } catch (e) {
        stop();
      }
    }
  }

  timer = setInterval(check, 250);
  LOG("loaded v1.2");
})();

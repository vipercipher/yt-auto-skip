// Auto Ad Skipper - background worker (v2.0)
//
// Sends ONE real (trusted) mouse click at a skip button when a player ignored
// the normal script click. Uses the Chrome DevTools protocol, so Chrome shows
// a short "started debugging this browser" bar. Safari has no such API, so
// there it simply reports "unsupported".

const lastClick = new Map(); // tabId -> time (rate limit)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Position of a frame's top-left corner inside the tab's viewport.
async function frameOffset(tabId, frameId) {
  let x = 0;
  let y = 0;
  let cur = frameId;
  for (let depth = 0; cur !== 0 && depth < 10; depth++) {
    const info = await chrome.webNavigation.getFrame({ tabId, frameId: cur });
    if (!info || info.parentFrameId < 0) return null;
    const parent = info.parentFrameId;
    const token = crypto.randomUUID();
    const answer = chrome.tabs.sendMessage(tabId, { type: "expectToken", token }, { frameId: parent });
    await sleep(60);
    chrome.tabs.sendMessage(tabId, { type: "postToken", token }, { frameId: cur }).catch(() => {});
    const off = await answer.catch(() => null);
    if (!off) return null;
    x += off.x;
    y += off.y;
    cur = parent;
  }
  return cur === 0 ? { x, y } : null;
}

async function realClick(target, x, y) {
  const base = { x, y, button: "left", clickCount: 1 };
  await chrome.debugger.attach(target, "1.3");
  try {
    // Give Chrome a moment to route input into iframes after attaching.
    await sleep(150);
    await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", { ...base, type: "mouseMoved" });
    await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", { ...base, type: "mousePressed" });
    await sleep(40);
    await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", { ...base, type: "mouseReleased" });
  } finally {
    await chrome.debugger.detach(target).catch(() => {});
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "trustedClick" || !sender.tab) return;

  if (!chrome.debugger) {
    sendResponse({ ok: false, unsupported: true });
    return;
  }

  const tabId = sender.tab.id;
  const now = Date.now();
  if (now - (lastClick.get(tabId) || 0) < 1500) {
    sendResponse({ ok: false, error: "rate limited" });
    return;
  }
  lastClick.set(tabId, now);

  (async () => {
    try {
      let { x, y } = msg;
      let target = { tabId };
      if (sender.frameId && sender.frameId !== 0) {
        // Cross-site iframes run as their own target: click inside it directly.
        const targets = await chrome.debugger.getTargets();
        const own = targets.find((t) => t.type !== "page" && t.type !== "worker" && t.url === sender.url && !t.tabId);
        if (own) {
          target = { targetId: own.id };
        } else {
          // Same-site iframe: convert to page coordinates.
          const off = await frameOffset(tabId, sender.frameId);
          if (!off) throw new Error("could not locate the iframe on the page");
          x += off.x;
          y += off.y;
        }
      }
      await realClick(target, x, y);
      sendResponse({ ok: true });
    } catch (e) {
      console.warn("[Auto Ad Skipper] real click failed:", e);
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  return true;
});

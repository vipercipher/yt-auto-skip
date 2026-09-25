// YouTube Auto Skip - background worker (v1.2)
// Sends a real (trusted) mouse click at the given viewport position using the
// Chrome DevTools protocol. Chrome briefly shows a "started debugging this
// browser" bar while this happens - that's expected.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "trustedClick" || !sender.tab) return;
  const target = { tabId: sender.tab.id };
  const base = { x: msg.x, y: msg.y, button: "left", clickCount: 1 };

  (async () => {
    try {
      await chrome.debugger.attach(target, "1.3");
      await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", { ...base, type: "mouseMoved" });
      await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", { ...base, type: "mousePressed" });
      await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", { ...base, type: "mouseReleased" });
      sendResponse({ ok: true });
    } catch (e) {
      console.warn("[YouTube Auto Skip] real click failed:", e);
      sendResponse({ ok: false, error: String(e) });
    } finally {
      try {
        await chrome.debugger.detach(target);
      } catch (e) {}
    }
  })();

  return true; // keep sendResponse alive for the async work
});

const enabledBox = document.getElementById("enabled");
const countEl = document.getElementById("count");

chrome.storage.local.get({ enabled: true, skipCount: 0 }, (data) => {
  enabledBox.checked = data.enabled;
  countEl.textContent = data.skipCount;
});

enabledBox.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: enabledBox.checked });
});

document.getElementById("reset").addEventListener("click", () => {
  chrome.storage.local.set({ skipCount: 0 });
  countEl.textContent = 0;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.skipCount) countEl.textContent = changes.skipCount.newValue;
});

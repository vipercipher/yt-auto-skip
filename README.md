# YouTube Auto Skip

**Clicks YouTube's "Skip Ad" button for you, the moment it appears.**

You know the moment: an ad starts, you wait five seconds, and you reach for the mouse or remote just to press *Skip*. This small browser extension does that click for you, usually within half a second of the button appearing, so you can keep eating, cooking or working without breaking focus.

It doesn't block ads or change how YouTube works. It simply presses the same Skip button you'd press yourself.

![YouTube Auto Skip popup](images/popup.png)

---

## ✨ Features

- **Instant skipping:** clicks the Skip button as soon as it becomes visible
- **Closes banner ads:** dismisses the small overlay ads that pop up over videos
- **Skip counter:** see how many ads it has skipped for you
- **On/off switch:** pause it anytime from the popup
- **Private by design:** no tracking, no accounts, no data leaves your browser
- **Lightweight:** a few small files, no external libraries

---

## 🚀 Install

Works in **Chrome**, **Microsoft Edge** and **Brave** (any Chromium-based browser).

1. Download this repo: click the green **Code** button → **Download ZIP**, then unzip it somewhere permanent (e.g. `Documents\yt-auto-skip`)
2. Open your browser's extensions page:
   - Chrome / Brave: `chrome://extensions`
   - Edge: `edge://extensions`
3. Turn on **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `yt-auto-skip` folder
5. Pin the extension from the 🧩 puzzle-piece menu so it's easy to reach

Open any YouTube video, and skippable ads will now be skipped automatically.

---

## ⚙️ How it works

| File | Purpose |
|---|---|
| `manifest.json` | Tells the browser what the extension is and where it runs (youtube.com only) |
| `content.js` | Runs on YouTube and watches for the Skip button |
| `popup.html` / `popup.js` | The small window with the on/off switch and skip counter |

Under the hood, `content.js` uses:

- A **`MutationObserver`** to react the instant YouTube's player changes, e.g. when an ad starts
- A **lightweight 0.5-second check** as a fallback, because the Skip button sometimes fades in without triggering a page change
- A **visibility check** so it only clicks buttons that are actually on screen
- **Several button selectors**, because YouTube uses different names for the Skip button in different layouts

---

## 🔒 Privacy & permissions

| Permission | Why it's needed |
|---|---|
| Access to `youtube.com` | To find and click the Skip button on YouTube pages. It doesn't run on any other site. |
| `storage` | To remember your on/off setting and skip count, stored locally in your browser |

That's it. The extension makes **no network requests**, collects **no data**, and has **no analytics**. You can read every line of code in this repo to confirm it.

---

## ⚠️ Known limitations

Being upfront about what it can't do:

- **Non-skippable ads still play.** It can only click a Skip button that YouTube actually shows.
- **Desktop browsers only.** It won't work in the YouTube app on smart TVs, phones or streaming devices, because those can't run browser extensions.
- **YouTube changes its code from time to time.** If YouTube renames the Skip button, the extension may stop finding it until it's updated (see below).

---

## 🛠 Troubleshooting

**Ads aren't being skipped anymore?** YouTube has probably renamed the button. To fix it yourself:

1. When the Skip button appears, right-click it → **Inspect**
2. Copy the button's class name (e.g. `ytp-skip-ad-button`)
3. Add it to the `SKIP_SELECTORS` list at the top of `content.js`
4. Go to `chrome://extensions` and click the ↻ reload icon on YouTube Auto Skip

Or [open an issue](https://github.com/vipercipher/yt-auto-skip/issues) and I'll update it.

---

## 🤝 Contributing

Found a bug, or noticed YouTube changed the Skip button? Issues and pull requests are welcome. Please include your browser and what you saw.

---

## 💬 A note on creators

Ads help fund the creators you watch. This tool only saves you a click on ads YouTube already lets you skip. If you enjoy a channel, consider supporting it directly through memberships, Patreon or YouTube Premium.

---

## 📄 License

[MIT](LICENSE) © Jay

*Not affiliated with or endorsed by YouTube or Google.*
<p align="center"><img src="icon.png" width="96" alt=""></p>

<h1 align="center">Auto Ad Skipper</h1>

<p align="center">A browser extension that presses <b>Skip Ad</b> for you the moment it appears.</p>

---

## What it does

- ✅ Skips ads on **YouTube**
- ✅ Skips ads on **YouTube videos embedded in other websites** (blogs, news sites…)
- ✅ Skips ads on **other video players** that show a "Skip Ad" button (Google IMA, JW Player and similar)
- ✅ Only acts when a real Skip button is showing. It never blocks ads or touches the video.
- ✅ Leaves alone: countdowns ("Skip in 5"), "Skip intro", "Skip to content", and pages with no video
- ✅ Toolbar popup to turn it on/off and see how many ads were skipped

Works in **Chrome, Edge, Brave, Opera, Arc** (Windows, Mac, Linux) and **Safari** (Mac, with limits, see below).

## Install

### Chrome / Edge / Brave

1. Download the latest `auto-ad-skipper-chrome-*.zip` from [Releases](../../releases) (or clone this repo).
2. Unzip it somewhere permanent.
3. Go to `chrome://extensions` (Edge: `edge://extensions`) → turn on **Developer mode**.
4. Click **Load unpacked** → choose the unzipped folder (or the `extension/` folder of this repo).
5. Refresh any open video tabs.

> When a player ignores the normal click, the extension sends one real mouse click using Chrome's debugger API.
> Chrome briefly shows **"… started debugging this browser"**. That's expected.

### Safari (Mac)

Safari needs the extension wrapped in a small Mac app. Apple's free Xcode does this for you.

1. Install **Xcode** from the Mac App Store.
2. Download `auto-ad-skipper-safari-*.zip` from [Releases](../../releases) and unzip it.
3. In Terminal:
   ```bash
   xcrun safari-web-extension-converter ~/Downloads/auto-ad-skipper-safari --app-name "Auto Ad Skipper" --macos-only
   ```
4. In Xcode: **Signing & Capabilities** → Team: your Apple ID ("Personal Team") → press **▶ Run**.
5. Safari → **Settings → Advanced** → tick **Show features for web developers**, then **Develop → Allow Unsigned Extensions** (only if the extension isn't listed).
6. Safari → **Settings → Extensions** → enable **Auto Ad Skipper** → **Always Allow on Every Website**.

**Safari limitations**
- Safari has no API for "real" clicks, so players that ignore script clicks (sometimes YouTube) can't be skipped in Safari.
- "Allow Unsigned Extensions" resets when Safari quits unless the app is signed with a paid Apple Developer account.
- The Safari build hasn't been tested on a Mac yet. Reports welcome.

## How it works

| File | Job |
|---|---|
| `extension/content.js` | Runs in every page **and every iframe**. Several times a second it looks for a visible Skip button: YouTube's own buttons, known ad-player classes, or any button labelled "Skip" / "Skip Ad" inside an ad. It clicks it once. |
| `extension/background.js` | If the button is still there a second later (the player ignored the script click), it sends **one real mouse click** at the button through `chrome.debugger`. Cross-site iframes are clicked through their own debugger target; same-site iframes via their on-page position. Rate-limited to one click per 1.5 s per tab. |
| `extension/popup.*` | On/off switch and skip counter. |

## Build release zips

```bash
./scripts/build.sh
# -> dist/auto-ad-skipper-chrome-vX.Y.Z.zip
# -> dist/auto-ad-skipper-safari-vX.Y.Z.zip  (no "debugger" permission)
```

## Tests

Mock pages in `test/` imitate YouTube, an embedded YouTube iframe, an ad player inside a cross-site iframe, and decoy buttons. Some mock Skip buttons **only accept real clicks**, like YouTube.

```bash
cd test
npm install
npx playwright install chromium
python3 -m http.server 8001 &   # serve the mock pages
npm test
```

Expected:
```
PASS  YouTube (direct)
PASS  Embedded YouTube (cross-origin iframe)
PASS  Generic player, ad in cross-origin iframe + decoys
PASS  Same-site iframe (trusted-only button)
PASS  Plain "Skip Ad" button
PASS  Page without video: skip-looking buttons left alone
```

## A site isn't skipped?

Right-click its Skip button → **Inspect**, then open an issue with the button's class / text (or add it to `KNOWN_AD_SELECTORS` in `content.js`). Only English "Skip" labels are recognised for now.

## Permissions

| Permission | Why |
|---|---|
| All websites | Skip buttons can appear on any site that embeds a video |
| `debugger` | To send a real click when a player ignores script clicks (Chrome only) |
| `webNavigation` | To find where an iframe sits on the page |
| `storage` | On/off setting and skip counter |

Nothing is collected or sent anywhere.

## License

[MIT](LICENSE)

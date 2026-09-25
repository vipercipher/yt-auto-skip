# YouTube Auto Skip

A tiny Chrome / Edge / Brave extension that clicks YouTube's **Skip Ad** button the moment it appears, so you never have to reach for the mouse or remote.

## Install (takes 1 minute)

1. Unzip this folder somewhere permanent (e.g. `Documents/yt-auto-skip`).
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and pick the `yt-auto-skip` folder.
5. Open any YouTube video — skippable ads are skipped automatically.

Click the extension icon to turn it on/off and see how many ads it has skipped.

## How it works

- `content.js` checks the player 4 times a second for a visible Skip button (only while an ad is showing).
- It clicks the button once. If YouTube ignores that, `background.js` sends one real mouse click (Chrome briefly shows a "debugging this browser" bar — that is normal).
- It does **not** block ads — non-skippable ads still play, just like normal.

## If it stops working

YouTube occasionally renames the button's CSS class. Right-click the Skip button → **Inspect**, copy its class name, and add it to `SKIP_SELECTORS` at the top of `content.js`, then press the reload icon on `chrome://extensions`.

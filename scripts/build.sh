#!/usr/bin/env bash
# Builds release zips into dist/:
#   auto-ad-skipper-chrome.zip  - Chrome / Edge / Brave / Opera / Arc
#   auto-ad-skipper-safari.zip  - source for Safari's converter (no "debugger" permission)
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(python3 -c "import json;print(json.load(open('extension/manifest.json'))['version'])")
rm -rf dist && mkdir -p dist
cp -r extension dist/auto-ad-skipper-chrome
cp -r extension dist/auto-ad-skipper-safari
python3 - <<'PY'
import json
p = "dist/auto-ad-skipper-safari/manifest.json"
m = json.load(open(p))
m["permissions"] = [x for x in m["permissions"] if x != "debugger"]
m["content_scripts"][0].pop("match_origin_as_fallback", None)
json.dump(m, open(p, "w"), indent=2)
PY
(cd dist && zip -qr "auto-ad-skipper-chrome-v$VERSION.zip" auto-ad-skipper-chrome \
          && zip -qr "auto-ad-skipper-safari-v$VERSION.zip" auto-ad-skipper-safari)
echo "Built dist/*-v$VERSION.zip"

const { chromium } = require('playwright');
const path = require('path');
const EXT = path.resolve(__dirname, '../extension');
(async () => {
  const ctx = await chromium.launchPersistentContext(require('os').tmpdir() + '/aas-test-' + Date.now(), {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`,
           '--host-resolver-rules=MAP www.youtube.com 127.0.0.1, MAP ads.example 127.0.0.1'],
  });
  const logs = [];
  const tests = [
    ['YouTube (direct)', 'http://www.youtube.com:8001/yt.html', 'skipped'],
    ['Embedded YouTube (cross-origin iframe)', 'http://localhost:8001/embed-host.html', 'yt-skipped'],
    ['Generic player, ad in cross-origin iframe + decoys', 'http://localhost:8001/generic.html', 'ima-skipped'],
    ['Same-site iframe (trusted-only button)', 'http://localhost:8001/same-site.html', 'yt-skipped'],
    ['Plain "Skip Ad" button', 'http://localhost:8001/plain.html', 'plain-skipped'],
  ];
  for (const [name, url, want] of tests) {
    const page = await ctx.newPage();
    page.on('console', m => { if (m.text().includes('Auto Ad Skipper')) logs.push(`  [${name}] ${m.text()}`); });
    await page.goto(url);
    let got;
    for (let i = 0; i < 16; i++) { await page.waitForTimeout(500); got = await page.evaluate(() => window.result); if (got === want) break; }
    const decoys = await page.evaluate(() => window.decoys || []);
    console.log(`${got === want ? 'PASS' : 'FAIL'}  ${name}: result=${got}${decoys.length ? ' DECOYS CLICKED=' + decoys : ''}`);
    await page.close();
  }
  const p = await ctx.newPage(); await p.goto('http://localhost:8001/novideo.html'); await p.waitForTimeout(2500);
  console.log(`${(await p.evaluate(() => window.clicked)) ? 'FAIL' : 'PASS'}  Page without video: skip-looking buttons left alone`);
  console.log('\nLogs:\n' + logs.join('\n'));
  await ctx.close();
})().catch(e => { console.error(e); process.exit(1); });

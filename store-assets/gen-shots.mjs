// Store screenshots for Fire & Smoke, driven through the real UI by clicking.
//
// Headless Chrome's --screenshot captures from the layout origin, NOT the
// scrolled viewport, so scrolling to a panel and shooting yields a frame of
// empty background. Instead: render the page at its full height in one pass,
// have the page report the Y of the element we want to frame, then crop.
//
// Two sets, because the stores want different aspect ratios:
//   play/  1080x1920 (9:16)  - 540 CSS wide @2x
//   ios/   1290x2796 (6.7")  - headless Chrome clamps window width to 500 CSS
//                              px, so 430 would clip: shoot 500 wide @3x and
//                              sips down from 1500x3252.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PYTHON = '/Users/kieran.mccluskey/.pyenv/versions/3.13.13/bin/python3';
const ROOT = '/Users/kieran.mccluskey/Projects/BBQ-Smoker-Times';
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

const HELPERS = `
function byText(sel, t){
  return [].slice.call(document.querySelectorAll(sel))
    .filter(function(e){ return e.textContent.indexOf(t) !== -1; })[0];
}
function pickCut(n){ var c = document.querySelectorAll('.cut-card')[n||0]; if (c) c.click(); }
function setUnit(u){ var b = byText('button', '\\u00b0' + u); if (b) b.click(); }
function setMode(m){ var b = byText('button', m); if (b) b.click(); }
// Report where to frame the shot: absolute Y of the detail panel, or 0 for
// the top-of-page shots. Read back from the title by the runner.
function anchorOn(sel){
  var e = sel ? document.querySelector(sel) : null;
  var y = e ? Math.round(e.getBoundingClientRect().top + window.scrollY) : 0;
  document.title = 'ANCHOR=' + y;
}
`;

/* Captions, because a raw frame asks the viewer to work out what the app is,
   and Apple shows up to three screenshots in the search results themselves.
   Two lines, 21 characters or fewer each: that is what fits at the caption
   size without wrapping to three. Order follows the brief - lead with breadth
   (the reason to install), then a cut, then the timer and offline. */
const shots = [
  { name: '1-grill',  caption: ['70 cuts of meat.', 'Grill and smoker.'],
    setup: `anchorOn(null);` },
  { name: '2-detail', caption: ['Cook temp, pull temp.', 'Every single cut.'],
    setup: `pickCut(0); setTimeout(function(){ anchorOn('.detail-panel'); }, 400);` },
  { name: '3-timer',  caption: ['A live cook timer.', 'Pull it on time.'],
    setup: `pickCut(0);
      setTimeout(function(){ var b = byText('button','Start'); if (b) b.click(); }, 300);
      setTimeout(function(){ anchorOn('.detail-panel'); }, 700);` },
  { name: '4-smoker', caption: ['Low and slow.', 'Or hot and fast.'],
    setup: `setMode('Smoker');
      setTimeout(function(){ pickCut(0); }, 300);
      setTimeout(function(){ anchorOn('.detail-panel'); }, 700);` },
  { name: '5-units',  caption: ['Works offline.', 'No signal needed.'],
    setup: `setUnit('F');
      setTimeout(function(){ pickCut(0); }, 300);
      setTimeout(function(){ anchorOn('.detail-panel'); }, 700);` },
];

/* `shot` is the area the screenshot occupies inside the card; the rest is the
   caption band. Cropping straight to that ratio avoids scaling the capture
   twice. Band height is proportional, so both stores get the same design. */
const targets = [
  { dir: 'play', cssW: 540, dsf: 2, card: [1080, 1920], shot: [1080, 1289],
    crop: [1080, 1289], out: null },
  { dir: 'ios',  cssW: 500, dsf: 3, card: [1290, 2796], shot: [1290, 2042],
    crop: [1500, 2374], out: ['1290', '2042'] },
];

for (const t of targets) {
  const outDir = join(ROOT, 'store-assets/screenshots', t.dir);
  mkdirSync(outDir, { recursive: true });
  for (const s of shots) {
    // The page transpiles JSX in the browser, so let React mount before clicking.
    const inject = `\n<script>${HELPERS}\nsetTimeout(function(){ try{ ${s.setup} }catch(e){ document.title='ERR '+e.message; } }, 2200);<\/script>\n`;
    const tmp = join(tmpdir(), `fs_${t.dir}_${s.name}.html`);
    writeFileSync(tmp, html.replace('</body>', inject + '</body>'));
    const full = join(tmpdir(), `fs_full_${t.dir}_${s.name}.png`);
    // Tall window => whole page in one shot, no scrolling involved.
    const dom = execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--dump-dom',
      `--force-device-scale-factor=${t.dsf}`, `--window-size=${t.cssW},2400`,
      '--virtual-time-budget=9000', '--run-all-compositor-stages-before-draw',
      `--screenshot=${full}`, `file://${tmp}`], { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] });
    const m = dom.match(/<title>ANCHOR=(\d+)<\/title>/);
    if (!m) throw new Error(`${t.dir}/${s.name}: no anchor (title was ${(dom.match(/<title>[^<]*<\/title>/)||['?'])[0]})`);
    const png = join(outDir, `${s.name}.png`);
    // Frame from just above the anchor, clamped inside the image.
    execFileSync(PYTHON, ['-c', `
from PIL import Image
im = Image.open("${full}").convert("RGB")
y = max(0, min(${+m[1]} * ${t.dsf} - 90, im.height - ${t.crop[1]}))
im.crop((0, y, ${t.crop[0]}, y + ${t.crop[1]})).save("${png}")
`], { stdio: 'inherit' });
    if (t.out) execFileSync('/usr/bin/sips', ['-z', t.out[1], t.out[0], png], { stdio: 'ignore' });

    /* Composite onto the card with the caption band above. Rendered in Chrome
       rather than drawn in PIL so the type matches the other apps' cards. */
    const band = t.card[1] - t.shot[1];
    const scale = t.card[0] / 1290;              // iOS card is the reference
    const cardHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}
      html,body{width:${t.card[0]}px;height:${t.card[1]}px;overflow:hidden;
        background:linear-gradient(#140f0c,#1d1511);
        font-family:'Courier New',ui-monospace,monospace}
      .cap{position:absolute;top:${Math.round(170*scale)}px;left:${Math.round(64*scale)}px;
        right:${Math.round(64*scale)}px;text-align:center;color:#f3e7cb;font-weight:bold;
        font-size:${Math.round(90*scale)}px;line-height:1.26;letter-spacing:-${Math.round(2*scale)}px}
      .shot{position:absolute;left:0;bottom:0;width:${t.shot[0]}px;height:${t.shot[1]}px;overflow:hidden}
      .shot::before{content:'';position:absolute;top:0;left:0;right:0;
        height:${Math.max(3,Math.round(5*scale))}px;background:#c0392b;z-index:2;opacity:.9}
      .shot img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block}
    </style></head><body>
      <div class="cap">${s.caption.map(l => `<div>${l}</div>`).join('')}</div>
      <div class="shot"><img src="file://${png}"></div>
    </body></html>`;
    const cardTmp = join(tmpdir(), `fs_card_${t.dir}_${s.name}.html`);
    writeFileSync(cardTmp, cardHtml);
    execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
      `--window-size=${t.card[0]},${t.card[1]}`, '--virtual-time-budget=1500',
      '--run-all-compositor-stages-before-draw',
      `--screenshot=${png}`, `file://${cardTmp}`], { stdio: 'ignore' });
    console.log(t.dir, s.name, 'anchor', m[1], `band ${band}px`);
  }
}
console.log('DONE');

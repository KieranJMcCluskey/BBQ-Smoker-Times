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

const shots = [
  { name: '1-grill',  setup: `anchorOn(null);` },
  { name: '2-detail', setup: `pickCut(0); setTimeout(function(){ anchorOn('.detail-panel'); }, 400);` },
  { name: '3-timer',  setup: `pickCut(0);
      setTimeout(function(){ var b = byText('button','Start'); if (b) b.click(); }, 300);
      setTimeout(function(){ anchorOn('.detail-panel'); }, 700);` },
  { name: '4-smoker', setup: `setMode('Smoker');
      setTimeout(function(){ pickCut(0); }, 300);
      setTimeout(function(){ anchorOn('.detail-panel'); }, 700);` },
  { name: '5-units',  setup: `setUnit('F');
      setTimeout(function(){ pickCut(0); }, 300);
      setTimeout(function(){ anchorOn('.detail-panel'); }, 700);` },
];

const targets = [
  { dir: 'play', cssW: 540, dsf: 2, crop: [1080, 1920], out: null },
  { dir: 'ios',  cssW: 500, dsf: 3, crop: [1500, 3252], out: ['1290', '2796'] },
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
    console.log(t.dir, s.name, 'anchor', m[1]);
  }
}
console.log('DONE');

/* App Store creative assets — product page header and search results.
 *
 * Placement-specific assets, not screenshots. With none supplied Apple falls
 * back to cropping your previews and screenshots.
 * Specs: developer.apple.com/help/app-store-connect/reference/app-information/
 *        creative-assets-specifications/
 *
 *   header 21:9  3840 x 1646   search 3:2  3840 x 2560
 *
 * 3840 wide for both rather than the universal 16:9 at 5244 x 2950: this app
 * renders at 500 CSS px, so filling 5244 would mean upscaling. 3840 is in
 * spec for both placements and needs no upscale.
 *
 * Must obey the asset rules on the same page: no other marketplaces, no
 * prices, no URLs, no copyright symbols, no Apple accolades, 4+ appropriate,
 * and no alpha channel.
 *
 * Usage: node store-assets/gen-creative-assets.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PYTHON = '/Users/kieran.mccluskey/.pyenv/versions/3.13.13/bin/python3';
const ROOT = '/Users/kieran.mccluskey/Projects/BBQ-Smoker-Times';
const OUT = join(ROOT, 'store-assets/creative-assets');
mkdirSync(OUT, { recursive: true });

/* ---- 1. capture a clean hero frame (no caption band) ------------------ */
/* A cut with its numbers on screen: cook temp, pull temp, rest, timer. That
   is the whole product in one frame, which is what Apple asks a search
   result to do — state the obvious. */
const INJECT = `
<script>
  function byText(sel, t){
    return [].slice.call(document.querySelectorAll(sel))
      .filter(function(e){ return e.textContent.indexOf(t) !== -1; })[0];
  }
  setTimeout(function(){
    var c = document.querySelectorAll('.cut-card')[0]; if (c) c.click();
    setTimeout(function(){
      var e = document.querySelector('.detail-panel');
      document.title = 'ANCHOR=' + (e ? Math.round(e.getBoundingClientRect().top + window.scrollY) : 0);
    }, 500);
  }, 2200);
<\/script>`;

const page = readFileSync(join(ROOT, 'index.html'), 'utf8').replace('</body>', INJECT + '</body>');
const tmp = join(tmpdir(), 'fs_creative_src.html');
writeFileSync(tmp, page);

const FULL = join(tmpdir(), 'fs_creative_full.png');
const dom = execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--dump-dom',
  '--force-device-scale-factor=4', '--window-size=500,2400', '--virtual-time-budget=9000',
  '--run-all-compositor-stages-before-draw', `--screenshot=${FULL}`, `file://${tmp}`],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const m = dom.match(/<title>ANCHOR=(\d+)<\/title>/);
if (!m) throw new Error('no anchor — did the page mount?');

/* Crop a portrait frame starting just above the detail panel. */
const RAW = join(tmpdir(), 'fs_creative_raw.png');
execFileSync(PYTHON, ['-c', `
from PIL import Image
im = Image.open("${FULL}").convert("RGB")
y = max(0, min(${+m[1]} * 4 - 120, im.height - 3040))
im.crop((0, y, 1920, y + 3040)).save("${RAW}")
`], { stdio: 'inherit' });
console.log('hero frame captured at anchor', m[1]);

/* ---- 2. compose each placement --------------------------------------- */
const card = ({ w, h, phoneH, padX, titlePx, subPx, tagPx, gap }) => `
<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${w}px;height:${h}px;overflow:hidden}
  /* Ember on charcoal — the app's own palette, so asset and icon read as one. */
  body{background:
    radial-gradient(115% 95% at 80% 16%, #6b2f17 0%, #3a1c10 40%, #1a110c 76%, #120c09 100%);
    color:#f3e7cb;display:flex;align-items:center;gap:${gap}px;padding:0 ${padX}px;
    font-family:'Playfair Display',Georgia,serif}
  .copy{flex:1 1 52%;min-width:0}
  .eyebrow{font-family:'Courier New',monospace;font-size:${tagPx}px;letter-spacing:.3em;
    color:#e8a05a;text-transform:uppercase;margin-bottom:${Math.round(tagPx*1.2)}px}
  h1{font-size:${titlePx}px;font-weight:900;line-height:.92;letter-spacing:-${Math.round(titlePx*0.02)}px}
  .sub{font-family:'Courier New',monospace;font-size:${subPx}px;line-height:1.34;
    color:#d8c8ae;white-space:nowrap;margin-top:${Math.round(subPx*0.85)}px}
  .frame{flex:0 0 auto;height:${phoneH}px;aspect-ratio:1920/3040;
    border-radius:${Math.round(phoneH*0.045)}px;overflow:hidden;transform:rotate(-3deg);
    box-shadow:0 ${Math.round(phoneH*0.05)}px ${Math.round(phoneH*0.11)}px rgba(0,0,0,.6),
               0 0 0 ${Math.max(2,Math.round(phoneH*0.004))}px rgba(243,231,203,.16)}
  .frame img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block}
</style></head><body>
  <div class="copy">
    <div class="eyebrow">The pitmaster's reference</div>
    <h1>FIRE &amp;<br>SMOKE</h1>
    <div class="sub">70 cuts of meat.<br>Cook temp, pull temp.<br>Works offline.</div>
  </div>
  <div class="frame"><img src="file://${RAW}"></div>
</body></html>`;

const PLACEMENTS = [
  { name: 'header-21x9-3840x1646', w: 3840, h: 1646,
    phoneH: 1430, padX: 300, titlePx: 300, subPx: 92, tagPx: 58, gap: 260 },
  { name: 'search-3x2-3840x2560', w: 3840, h: 2560,
    phoneH: 2080, padX: 240, titlePx: 420, subPx: 118, tagPx: 72, gap: 150 },
];

for (const p of PLACEMENTS) {
  const t = join(tmpdir(), `fs_creative_${p.name}.html`);
  writeFileSync(t, card(p));
  const out = join(OUT, `${p.name}.png`);
  /* --run-all-compositor-stages-before-draw is load-bearing, and a shared
     --user-data-dir across sequential headless launches deadlocks. */
  execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${p.w},${p.h}`, '--virtual-time-budget=1800',
    '--run-all-compositor-stages-before-draw', `--screenshot=${out}`, `file://${t}`],
    { stdio: 'ignore' });
  console.log('composed', p.name);
}
console.log(`\nDONE -> ${OUT}`);

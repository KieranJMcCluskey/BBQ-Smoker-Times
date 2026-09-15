// Build www/ from index.html.
//
// index.html stays THE source of truth and keeps its in-browser Babel setup,
// so editing and opening it in a browser works exactly as before. What ships
// inside the native apps must not depend on a network, though: loading React
// and Babel from unpkg meant the app opened to a blank page with no
// connectivity, which is no good for something used in a backyard. So this
// build:
//   1. compiles the JSX ahead of time (no Babel in the bundle at all - it is
//      ~3MB and was re-compiling the whole app on every launch),
//   2. vendors React and ReactDOM locally,
//   3. self-hosts the two webfonts.
// Result: www/ has zero external requests.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as Babel from '@babel/standalone';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WWW = join(ROOT, 'www');
const VENDOR = join(WWW, 'vendor');
const FONTS = join(VENDOR, 'fonts');

let html = readFileSync(join(ROOT, 'index.html'), 'utf8');

rmSync(VENDOR, { recursive: true, force: true });
mkdirSync(FONTS, { recursive: true });

// --- 1. vendor React (UMD production builds, same pinned versions) ----------
for (const [from, to] of [
  ['node_modules/react/umd/react.production.min.js', 'react.production.min.js'],
  ['node_modules/react-dom/umd/react-dom.production.min.js', 'react-dom.production.min.js'],
]) copyFileSync(join(ROOT, from), join(VENDOR, to));

html = html
  .replace(/\s*<script src="https:\/\/unpkg\.com\/react@[^"]+"[^>]*><\/script>/,
           '\n  <script src="vendor/react.production.min.js"></script>')
  .replace(/\s*<script src="https:\/\/unpkg\.com\/react-dom@[^"]+"[^>]*><\/script>/,
           '\n  <script src="vendor/react-dom.production.min.js"></script>')
  // Babel is compiled away entirely, so its tag goes.
  .replace(/\s*<script src="https:\/\/unpkg\.com\/@babel\/standalone@[^"]+"[^>]*><\/script>/, '');

// --- 2. self-host the fonts -------------------------------------------------
for (const f of readdirSync(join(ROOT, 'assets/fonts')))
  if (f.endsWith('.woff2')) copyFileSync(join(ROOT, 'assets/fonts', f), join(FONTS, f));

const faces = readFileSync(join(ROOT, 'assets/fonts/fonts.css'), 'utf8').trim();
const importLine = /^.*@import url\('https:\/\/fonts\.googleapis\.com[^\n]*\n/m;
if (!importLine.test(html)) throw new Error('font @import not found - did the CSS move?');
// The @import lives inside a JSX template literal; the generated @font-face
// rules contain no backticks or ${ so they drop straight in.
html = html.replace(importLine, faces.split('\n').map(l => '            ' + l).join('\n') + '\n');

// --- 3. compile the JSX -----------------------------------------------------
const m = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!m) throw new Error('no <script type="text/babel"> block found');
const { code } = Babel.transform(m[1], {
  presets: [['react', { runtime: 'classic' }]],
  filename: 'index.jsx',
  compact: false,
});
html = html.replace(m[0], '<script>\n' + code + '\n  </script>');

// --- 4. write + verify ------------------------------------------------------
writeFileSync(join(WWW, 'index.html'), html);

const external = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map(x => x[1])
  .concat([...html.matchAll(/@import url\((['"]?https?:\/\/[^)]+)\)/g)].map(x => x[1]));
if (external.length) throw new Error('www still references the network:\n  ' + external.join('\n  '));
if (/text\/babel/.test(html)) throw new Error('www still contains an untranspiled babel block');

console.log(`built www/index.html (${(html.length / 1024).toFixed(0)} KB) - no external requests`);

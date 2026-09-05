# Fire & Smoke — BBQ Smoker Times (web + Capacitor mobile)

Single-file React app: a pitmaster reference for cook temps, internal/pull
temps, timings and notes across smoker (low-and-slow) and BBQ grill modes,
with a live cook timer. Wrapped with Capacitor 8 for iOS/Android, mirroring
ItsPink / Daredevil Dennis / BinChicken.

## THE ONE RULE: edit `index.html`, then run `npm run sync`

`index.html` (repo root) is the **only** source of truth — CSS, markup and one
in-browser Babel `<script type="text/babel">`. `www/index.html` is a
byte-for-byte copy Capacitor bundles into the native apps; never edit it
directly. After any change:

```
npm run sync        # copies index.html -> www/index.html
```

## Pinned CDN — do not float (this took the site down in June 2026)

React and Babel load from unpkg and MUST stay pinned:
- `react@18.3.1`, `react-dom@18.3.1`
- `@babel/standalone@7.29.7` — **Babel 7.x only** (Babel 8 changed how inline
  scripts pick presets), and the script tag keeps `data-presets="react"`.
Because JSX transpiles in the browser, a data typo blanks the page — sanity-
check by rendering `index.html` (headless Chrome screenshot) after edits.

## Architecture

- Two datasets near the top of the script: `smokerCuts` (low-and-slow,
  ~100–165°C) and `bbqCuts` (grill, ~180–250°C), each keyed by category
  (beef, wagyu, pork, …). Each cut: `name, emoji, cookTemp, internalTemp
  {min,max}, restTime, timeGuide`, a time model (`minHrsPerKg`/`maxHrsPerKg`
  or `fixedHrs`), `notes`, optional `doneness`.
- `smokerCategoryColors/Labels` + `bbqCategoryColors/Labels` drive the tabs.
- Text palette on the near-black (#0d0d0d) background: main text `#f3e7cb`,
  labels `#a89372`, notes `#d3b98d`, time guide `#dcc79c` (all brightened
  July 2026 — the old label grey `#363636` was near-invisible).

## Celsius / Fahrenheit (added Sep 2026)

**All temperature DATA stays Celsius. Fahrenheit is a display conversion
only** — cook logic, `TempGauge` bounds and pull-temp comparisons all run in
Celsius, so there is one place a unit bug can live: the helpers next to
`donenessTemps` (`toF` / `toC` / `dispTemp` / `tempStr` / `rangeStr` /
`convertNotes`). Never store a Fahrenheit number in `smokerCuts`/`bbqCuts`.

- `UnitToggle` sits under `ModeToggle`; state lives in `BBQApp` as `unit`,
  persisted to `localStorage` under **`fs_unit`** (try/catch — a blocked store
  falls back gracefully).
- First run with nothing stored calls `localeDefaultUnit()`, which needs an
  **explicit** region on `navigator.language`/`languages`. Deliberately does
  NOT use `Intl.Locale.maximize()`: that expands a bare `"en"` to `"US"`, and
  some Android WebViews report exactly `"en"` — which would hand Fahrenheit to
  an Australian. No region ⇒ Celsius. `FAHRENHEIT_REGIONS` covers US/LR/MM
  plus US territories and the Caribbean/Pacific Fahrenheit states.
- The probe box is in display units; `probeC` is the single conversion point
  back to Celsius. Switching units converts a value already typed rather than
  reinterpreting it (62°C is 144°F, not 62°F).

### ⚠ Adding or editing a `notes` string

`convertNotes()` rewrites inline temps in the notes with the regex
`/(\d+)(?:–(\d+))?°C/g`, so "wrap at 74°C" and "the stall (65–75°C)" convert.
**It cannot tell a temperature from a temperature DIFFERENCE.** A note saying
"pull 5°C below target" would render as "41°F below target" when the correct
answer is 9°F. One note (Ribeye, smoker) already hit this and was reworded to
"a few degrees". Write deltas in words, never as `N°C`.

## Builds

```
npm run android:build     # sync + cap sync + debug APK
npm run android:install   # adb install + launch (com.sugarolly.bbqsmokertimes)
npm run ios:build         # iPhone 17 simulator build
npm run ios:sim           # boot sim, install + launch
npm run android:release   # signed AAB (needs keystore.properties)
```

Toolchain (JDK 21, Android command-line tools, Xcode) is shared with the other
Sugarolly apps — see ItsPink's CLAUDE.md for install notes. `android/local.properties`
(SDK path) and `android/keystore.properties` are gitignored/machine-local.

## Store go-live

- **No in-app purchases** — free app, so no StoreKit/Play Billing wiring
  (unlike the games). No `DEV_FREE_CONTINUES` blocker.
- **Android signing** (done): keystore `~/Keys/BBQSmokerTimes/bbq-release.jks`
  (alias `bbqsmokertimes`, RSA-4096). **NOT in the repo — back up the file and
  its password (password manager). Losing it = losing the app identity.**
  `android/keystore.properties` holds the credentials. `npm run android:release`
  → signed AAB. Bump `versionCode`/`versionName` in `android/app/build.gradle`
  for every Play upload.
- **Icons** done (flame `icon-1024.png` → Android mipmaps + iOS AppIcon).
- **Still needed before submit**: splash screen; Play/App Store listing assets
  (screenshots, feature graphic, privacy policy URL); Apple Developer signing
  team for iOS archive/upload.

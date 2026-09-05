# Fire & Smoke — store listing copy

App name (both stores): **Fire & Smoke**
Android package: `com.sugarolly.bbqsmokertimes`   ·   iOS bundle id: TBC (register under the org team first)

## App title (max 30 chars — currently 12)
Fire & Smoke

## Short description (Play, max 80 — currently 65)
Cook temps, pull temps and timings for 70 cuts. Smoker and grill.

## Full description (Play: max 4000 — currently 1280)

LIGHT IT. WATCH IT. PULL IT AT THE RIGHT MOMENT.

Fire & Smoke is a pitmaster's reference for the two ways you cook over fire —
low and slow in the smoker, or hot and fast on the grill. 70 cuts, each with
the numbers that actually decide whether dinner works.

FOR EVERY CUT

• Cook temp — what to hold the smoker or grill at
• Pull temp — the internal range to take it off at, which is the number that
  matters most and the one most people guess
• Rest time — because resting is not optional
• Time guide — hours per kilo, or minutes per side
• Pitmaster notes — the wrap point, the stall, when to reverse sear

TWO MODES

Smoker mode covers the long cooks: brisket, pork shoulder, short ribs, lamb
shoulder, whole birds. Grill mode covers the fast ones: steaks, chops,
burgers, skewers, seafood, vegetables.

BUILT FOR THE BACKYARD

• Celsius or Fahrenheit — switch any time, and every temperature in the app,
  including the notes, changes with it
• Live cook timer with an estimate from your meat's weight
• Enter your probe reading and see at a glance whether it's time to pull
• Doneness options for the cuts where rare to medium actually matters
• No account, no ads, no tracking, nothing collected

Cook to temperature, not to time. Rest your meat. Always rest your meat.

## App Store-specific fields

### Subtitle (max 30 — currently 29)
Cook temps, pull temps, timer

### Promotional text (max 170 — currently 159)
Stop guessing. 70 cuts across smoker and grill, each with its cook temp, the internal temp to pull at, a timing guide and notes worth knowing. Now in °C or °F.

(Editable any time WITHOUT submitting a new version.)

### Keywords (max 100 — currently 96)
bbq,smoker,grill,brisket,meat,temperature,thermometer,pitmaster,barbecue,cooking,ribs,pork,steak

Comma-separated, no spaces. Excludes the app name and subtitle words (Apple
indexes those already) and "app"/"free" (ignored).

### Description
Same as the Play full description above.

## Assets
- App icon: `../icon-1024.png` (1024x1024, no alpha). Play listing icon:
  `play-icon-512.png`.
- Feature graphic (Play): `feature-graphic.png` 1024x500, no alpha.
  Source `feature-graphic.html`.
- Screenshots: `screenshots/play/` at 1080x1920 and `screenshots/ios/` at
  1290x2796 — 1-grill, 2-detail, 3-timer, 4-smoker, 5-units.
  Regenerate both sets with `node store-assets/gen-shots.mjs`.
- Splash source: `splash-source.html` -> `assets/splash.png` (2732x2732),
  then `npx @capacitor/assets generate`.

## Notes for console entry
- Category: Food & Drink (both stores)
- Contains in-app purchases: **no** — free app, no billing wired at all
- Contains ads: no
- Privacy policy URL: https://sugarollymountain.com/firesmoke-privacy.html
- Data safety / App Privacy: **no data collected, no data shared.** The only
  stored value is the °C/°F preference in localStorage; probe readings and
  weights are session-only.
- Content rating: no objectionable content — expect Everyone / PEGI 3
- 70 cuts total (34 smoker + 36 grill), 7 categories each — keep this number
  honest if cuts are added

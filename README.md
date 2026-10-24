# Fitlog — 12-week home training log

A small, mobile-first workout app. It's plain HTML, CSS and JavaScript with no build step, so it can be hosted on GitHub Pages.

- **Today / Log:** sets and targets for each exercise come from the plan (`js/program.js`). You only enter **reps and weight**.
  - Fields start with the target reps and your last weight. Use the ± steppers (2.5 kg, or 1.25 kg for triceps extension) or type a value, then tap ✓.
  - Tapping ✓ starts a rest timer. Optional exercises can be switched on or off.
  - A **Ready to progress** badge appears once you hit the top of the rep range on every set. Tap it to apply the next weight.
- **Upper Body pull slot:** pick whichever machine is free: **Iso-Lateral Row** or **Lat Pulldown** (4 sets), or **Both free** (3 sets of each). History and the progress badge stay per exercise. Exercises without a starting weight (Lat Pulldown, Chest Fly, Reverse Fly) start blank; type your weight the first time and it's remembered after that.
- **Equipment notes:** KB Oblique (standing side bend) and KB Around use **one 15.5 kg bell** and show *each side* / *each direction*. Old logs of 31 kg (both sides added up) prefill as 15.5. Reverse Lunge is a goblet hold at the chest (11 kg, each leg). Upper Body triceps is a **cable pushdown** (same id as the old Triceps Extension, so history carries over). Chest Fly / Reverse Fly are on the pec-deck. Hammer Curl now lives only on the KB + Legs day (optional); old gym Hammer Curl history is still under History → Exercises.
- **Schedule:** a weekly plan you can edit (day and time, plus adding or removing sessions), with a 3-day/4-day toggle.
  - Progress through the 12-week program is shown, with deload weeks 4, 8 and 12 highlighted. Logged days get a ✓.
- **Muscles:** front and back body maps showing the primary (bright) and secondary (dim) muscles. You can view them per exercise, per session, or as a heatmap of sets per muscle this week.
- **History:** past workouts, plus per-exercise history with best weight and a trend line.
- **Settings:** export/import a JSON backup, sound/vibration/keep-awake options, and optional Google sign-in with cloud sync.

Data is stored in the browser's `localStorage`, so it works offline (PWA: you can add it to your home screen). Without Firebase, data lives only on that device and browser, so export a backup now and then.

## Run locally

```bash
cd fitness-app
python3 -m http.server 8765     # then open http://localhost:8765/
```
(ES modules need http://, not file://.)

## Deploy to GitHub Pages

1. Create a new repository, for example `fitlog`, and push the contents of this folder to the `main` branch. `index.html` must be at the repo root.
2. In the repo, go to **Settings → Pages → Build and deployment → Source: Deploy from a branch**, then pick **Branch: `main` / `/ (root)`** and click Save.
3. After about a minute the app is live at `https://<username>.github.io/fitlog/`. On iPhone, open it in Safari and choose Share → **Add to Home Screen**. On Android, open it in Chrome and choose ⋮ → **Install app**.
4. When you deploy changes, bump `VERSION` in `sw.js` so installed copies pick up the new files.

`.nojekyll` is included so Pages serves the files exactly as they are.

## Optional: Firebase cloud sync (Google sign-in + Firestore)

When `firebase-config.js` is empty, the app is local-only and shows no sign-in UI. To sync across devices:

1. Go to https://console.firebase.google.com and click **Add project** (Google Analytics isn't needed).
2. Under **Build → Authentication → Get started → Sign-in method**, enable **Google** and save.
3. Under **Authentication → Settings → Authorized domains**, add `<username>.github.io` (or your custom domain). `localhost` is already there.
4. Under **Build → Firestore Database → Create database**, choose **Production mode** and a location such as `asia-northeast1` (Tokyo).
5. Under **Firestore → Rules**, replace the contents with [`firestore.rules`](firestore.rules) and click **Publish**. These rules only let a signed-in user read or write `users/{their uid}/…`.
   (Or use the CLI: `npm i -g firebase-tools && firebase login && firebase init firestore && firebase deploy --only firestore:rules`.)
6. Go to **Project settings (⚙) → General → Your apps → Web (`</>`)** and register an app (no Hosting needed). Copy the values from the `firebaseConfig` object into `firebase-config.js`.
7. Commit and push. Then open **Settings → Sign in with Google** in the app. Local workouts are uploaded and merged; the newest edit wins.

**Is it safe to commit `firebase-config.js`?** Yes. A Firebase *web* config (apiKey, projectId and so on) is not a secret. It only identifies your project, and anyone loading the site can read it. Access to your data is protected by Google sign-in plus `firestore.rules`. Never commit real secrets such as service-account JSON files or admin SDK keys. For extra safety you can also restrict the API key to your domain in Google Cloud Console → APIs & Services → Credentials.

Data layout: `users/{uid}/meta/state` holds settings and schedule, and `users/{uid}/sessions/{sessionId}` holds one doc per workout. The in-progress workout is never synced.

## Changing the program

Everything about the plan lives in `js/program.js`:
- start date, number of weeks, deload weeks
- each workout's exercises (sets, rep range, plan weight or `null` for blank, rest, step size, bodyweight/optional/per-side flags, primary and secondary muscles)
- `perSide: 'leg' | 'side' | 'direction'`, `note`, and `legacyWeights` (remap an old logged weight when prefilling)
- `retired`: exercises removed from the plan whose history should stay visible
- "pick one" slots (`options`, plus `bothSets` for a "Both free" choice), like the Upper Body pull slot

History is keyed by exercise `id`, so keep ids stable when you rename or reorder things.
- the default 3-day and 4-day schedules

Muscle ids must be one of the 19 keys in `MUSCLES`. Changing `schedules` only affects new installs, or the next time you press the 3-day/4-day toggle.

## Files

```
index.html, styles.css, manifest.webmanifest, sw.js, .nojekyll
firebase-config.js, firestore.rules
icons/         app icons (svg + png)
js/app.js      router + boot          js/program.js  plan data (edit me)
js/store.js    localStorage state     js/logic.js    progression, schedule, stats
js/muscles.js  SVG body map           js/sync.js     optional Firebase sync
js/ui.js       sheet, toast, rest timer, icons
js/views/      log, schedule, muscles, history, settings
tests/qa.mjs   Playwright end-to-end check (phone viewport)
screenshots/   QA screenshots
```

## Tests

```bash
npm i playwright-core          # in this folder (or anywhere on your NODE_PATH)
python3 -m http.server 8765 &
CHROME=/path/to/chrome node tests/qa.mjs http://localhost:8765/
```

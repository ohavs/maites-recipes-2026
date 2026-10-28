# What this repository ships

The product is the **Android app**. The web app is where it started; it has
moved into the app, and the app is the only target we work on now. Assume
every change is for a phone with the APK installed, and judge it there.

## What that means in practice

- **A Firebase Hosting deploy reaches nobody.** Capacitor packs `dist/`
  inside the APK (`"webDir": "dist"` in `capacitor.config.json`), so the app
  carries its own copy of the web layer and never fetches one.
  `.github/workflows/deploy.yml` still publishes the site, but nobody runs
  the app from there.
- **Shipping a change means a new APK.** Push a branch named
  `release/1.2.3`; `.github/workflows/android.yml` builds it, signs it, tags
  the commit and publishes the release, then deletes the branch. The app's
  own updater (`updates.jsx`, on the settings screen) offers that release to
  the phone. Dispatching the workflow directly needs `actions:write`, which
  an assistant working here does not have — hence the branch.
- **There is no service worker inside the app.** `index.html` removes any it
  finds in the WebView on purpose: that cache outlives the app's own update
  and would serve the old version after an install. "I deployed and nothing
  changed" is nearly always a new web build and an old APK.
- **Design for a phone**, not a desktop window: a narrow viewport, RTL
  Hebrew, and touch targets.

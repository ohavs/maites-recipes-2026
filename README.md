# Maites

A Hebrew recipe app: a PWA today, an Android app in progress.

## Running it

The sources at the root are plain files — no install, no watcher. Serve the
folder and open it:

    python3 -m http.server 8899

In development the browser compiles the `.jsx` files itself (Babel is loaded
from `vendor/`), so a change is live on reload.

## Building and deploying

What ships is compiled ahead of time, because a 2.4 MB Babel download and a
compile pause on every cold start is the whole first impression on a phone:

    node build.js            # → dist/
    node build.js --test     # → dist/, including the smoke-test harness

`dist/` is generated and never committed. Firebase Hosting serves it:

    node build.js
    firebase deploy --only hosting

The service worker's cache name is a hash of what was built, so every deploy
invalidates the old cache on its own — there is no version number to remember.

`build.js` reads the list of sources, and their order, out of `index.html`, so
a new file is added in one place.

## The Android app

The same code. Capacitor puts `dist/` inside a WebView, and `native.jsx` is
the one place that knows the difference — camera, vibration, system bars,
the hardware back button and Google sign-in each have a native path and a
web fallback. Nothing above that file asks which it is running on.

    node build.js && npx cap sync android    # or: npm run sync

The APK is built by `.github/workflows/android.yml`, not locally: the
Android SDK is a few gigabytes, and a release has to be signed by the same
key every time or it will not install over the copy already on the phone.
Run the workflow by hand with a version number, or push a `v1.2.3` tag.

Four repository secrets feed it: `GOOGLE_SERVICES_JSON`,
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`
and `ANDROID_KEY_PASSWORD`. None of them are in this repository, and the
build stops with a clear message if one is missing.

`vendor/capacitor.js` is Capacitor's own JavaScript, bundled once because
it ships as ES modules and this project has no bundler. Regenerate it after
changing `src/capacitor-entry.js`:

    npm run vendor:cap

## The test harness

`__test.html` and `__stub.jsx` run the app against a stubbed backend, for
screenshots and smoke tests. They are gitignored and never deployed.

---

# CODING AGENTS: READ THIS FIRST

This is a **handoff bundle** from Claude Design (claude.ai/design).

A user mocked up designs in HTML/CSS/JS using an AI design tool, then exported this bundle so a coding agent can implement the designs for real.

## What you should do — IMPORTANT

**Read the chat transcripts first.** There are 2 chat transcript(s) in `chats/`. The transcripts show the full back-and-forth between the user and the design assistant — they tell you **what the user actually wants** and **where they landed** after iterating. Don't skip them. The final HTML files are the output, but the chat is where the intent lives.

**Read `project/index.html` in full.** The user had this file open when they triggered the handoff, so it's almost certainly the primary design they want built. Read it top to bottom — don't skim. Then **follow its imports**: open every file it pulls in (shared components, CSS, scripts) so you understand how the pieces fit together before you start implementing.

**If anything is ambiguous, ask the user to confirm before you start implementing.** It's much cheaper to clarify scope up front than to build the wrong thing.

## About the design files

The design medium is **HTML/CSS/JS** — these are prototypes, not production code. Your job is to **recreate them pixel-perfectly** in whatever technology makes sense for the target codebase (React, Vue, native, whatever fits). Match the visual output; don't copy the prototype's internal structure unless it happens to fit.

**Don't render these files in a browser or take screenshots unless the user asks you to.** Everything you need — dimensions, colors, layout rules — is spelled out in the source. Read the HTML and CSS directly; a screenshot won't tell you anything they don't.

## Bundle contents

- `README.md` — this file
- `chats/` — conversation transcripts (read these!)
- `project/` — the `receips` project files (HTML prototypes, assets, components)

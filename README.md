# MSLX Android website

This folder is a dependency-light static page for GitHub Pages.

Set GitHub Pages to deploy from the `main` branch and choose `/website` as the published folder. The page is served directly from `index.html`; `styles.css`, `script.js`, and `assets/` stay alongside it.

The first visit includes a short boot/loading screen, and the pages remain usable without a build step. `download.html` reads the latest CNB Release API response in the browser, resolves `app-release.apk` and `app-release-lite.apk`, and falls back to the public CNB/GitHub release pages when metadata is unavailable.

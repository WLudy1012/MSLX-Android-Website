# Rolithax Launcher website

This is the dependency-light static website for Rolithax Launcher, the third-party Android client for MSLX Daemon with local Minecraft Java server hosting.

Set GitHub Pages to deploy from the `main` branch and choose `/(root)` as the published folder. The site is served directly from `index.html`; `styles.css`, `script.js`, and `assets/` stay alongside it.

The first visit includes a short boot/loading screen, and the pages remain usable without a build step. `download.html` reads the latest public release metadata and resolves `app-release.apk` and `app-release-lite.apk` to CNB direct links. The download page also explains encrypted backup migration from the previous MSLX Android package.

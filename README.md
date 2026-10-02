# Rolithax Launcher website

This is the static GitHub Pages site for Rolithax Launcher, the independent Android client for managing MSLX Daemon and running Minecraft Java servers locally.

Publish the repository root from `main` (`/(root)`). `index.html` is the desktop experience; narrow screens route to the separately composed `mobile.html`. Add `?desktop=1` to the desktop URL to view its compact layout on a narrow screen.

The desktop page uses Three.js for a visible 3D instance map with a server core, orbit paths, signal particles, and Motion for scroll and interface animation. The mobile page uses Motion without starting WebGL. Both libraries load from version-pinned jsDelivr URLs; when 3D or motion libraries are unavailable, the content and image fallbacks remain usable. Motion follows `prefers-reduced-motion`. All routes include the Rolithax favicon and touch icon.

`download.html` independently reads public Release metadata and resolves the full and lite APK attachments to CNB direct links, with cached and public-page fallbacks. The site needs no build step or server-side runtime. The latest Android source currently identifies itself as version `1.7.9` (`versionCode` `41`); the download page always describes the actual public Release separately from unpublished source changes.

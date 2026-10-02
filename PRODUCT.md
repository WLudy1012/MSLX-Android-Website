# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS, and JavaScript deployed from the repository root with GitHub Pages.

## Users

The website serves two equally important groups: people who already manage MSLX Daemon servers and Android Minecraft players who want to create or run a Java server from a phone.

## Product Purpose

Rolithax Launcher is an Android client for managing remote MSLX Daemon instances and running Minecraft Java servers locally on Android. The site explains those uses and helps visitors choose and download a public APK release.

## Positioning

The Android app brings remote Daemon management and local phone hosting into one server overview and workflow.

## Operating Context

Visitors arrive from a public static website, learn how remote and local server workflows fit together, then open the APK download page. Downloads are resolved from public release metadata in the browser.

## Capabilities and Constraints

- Connects to multiple MSLX Daemon instances and shows their connection and server status.
- Can create and run Minecraft Java servers on Android using Java 8, 17, 21, or 25; Shizuku can provide an isolated Java subprocess engine.
- Supports QR pairing, HTTPS-first connections, resource discovery through Modrinth, dependency checks, live ANSI console output, and server file/configuration maintenance.
- The website is served directly by GitHub Pages without a server-side runtime or build step.
- The latest source uses application ID `com.wludy.rolithax.launcher`, version name `1.7.9`, and version code `41`; published APK contents and naming remain determined by the public release.
- Motion must respect reduced-motion preferences, and Three.js content must have a readable static fallback when WebGL is unavailable.

## Brand Commitments

Use the name Rolithax Launcher, retain the supplied Rolithax logo, describe the project as an independent third-party client, and retain its AGPL-3.0 and disclaimer links.

## Evidence on Hand

- Android source and usage guide in the sibling `MSLX-Android` repository.
- Supplied visual assets: `assets/rolithax-logo.png` and `assets/daemon-night.jpg`.
- Public APK Release metadata and direct-link resolution in `download.js`.

## Product Principles

- Keep remote management and local hosting understandable as related workflows.
- Use accurate, current release information for download decisions.
- Distinguish public APK facts from changes that exist only in source.
- Make the site usable without relying on 3D rendering or motion.

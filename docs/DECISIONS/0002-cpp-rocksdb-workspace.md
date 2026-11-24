# 0002 — C++ and RocksDB workspace backend

**Status:** Accepted  
**Date:** 2026-11-24

## Context

The original site stored a single signature draft in browser local storage. Team profiles, presets, durable persistence and cross-device restoration require a server-side boundary. The existing product is React + JavaScript + Vite; the backend request explicitly specifies C++ and RocksDB.

## Decision

- Keep the frontend in React, JSX and plain JavaScript.
- Add a small C++17 HTTP server using Boost.Beast.
- Store validated anonymous workspaces in RocksDB, keyed by the SHA-256 digest of a secure random browser session token.
- Use an HttpOnly, SameSite=Lax session cookie and a double-submit CSRF cookie. Require same-origin requests for writes.
- Serve built static files and the API from the same origin in the Docker runtime.
- Keep GitHub Pages as a static preview deployment; it cannot host the C++ process or RocksDB.
- Do not introduce accounts or server-side analytics as part of this change.

## Consequences

The UI can persist one browser's team workspace without relying on local storage. The interface uses grayscale palettes and a grayscale Three.js atmosphere; the Custom signature style remains available for teams that explicitly choose their own brand colors. The anonymous cookie is the only way to return to that workspace; the user should export JSON before clearing cookies or changing browsers. The RocksDB volume must be persistent and protected by the deployment host. GitHub Pages users see a clear offline state until the full container runtime is deployed.

Automated email rendering is a controlled browser simulation matrix. It does not substitute for live testing in each proprietary mail client.

# Vireon Signature

A monochrome email-signature studio for individuals and teams. Build one brand system, manage employee profiles, and export email-safe HTML signatures in bulk.

## What it includes

- Live signature editor and conservative email-safe HTML/text renderer
- Multiple employee profiles and reusable brand presets
- CSV/JSON team import/export and bulk signature generation
- C++17 API with RocksDB-backed anonymous workspaces
- HttpOnly session cookie and CSRF protection for workspace writes
- PWA manifest, service worker and genuine browser install prompt where supported
- Gmail, Outlook, Apple Mail and Proton Mail preview profiles across light/dark and desktop/mobile layouts
- Geist Sans and Geist Mono TTF declarations; no Google Fonts

Font assets are the Geist Sans and Geist Mono variable `.ttf` files from the [official Vercel Geist repository](https://github.com/vercel/geist-font), pinned to the `v1.9.2` release and served through jsDelivr. The fonts are not loaded from Google Fonts.

## Run the complete app

```bash
docker compose up --build
```

Open http://localhost:8080. Local Compose uses non-Secure cookies for localhost. For production, set `COOKIE_SECURE=true` and `APP_ORIGIN=https://your-domain`, then place the container behind HTTPS.

## Development

See [Project Setup](docs/PROJECT_SETUP.md) for C++ dependencies, the Vite API proxy, tests and deployment details.

## Important deployment note

The existing GitHub Pages deployment remains a static frontend preview. GitHub Pages cannot execute the C++ API or mount RocksDB. Team persistence requires the Docker runtime; the static Pages page reports when the API is unavailable rather than claiming it has saved data.

## Email-client testing scope

The automated matrix uses Chromium and WebKit browser simulations labelled as Gmail, Outlook, Apple Mail and Proton Mail, with light/dark themes and mobile/desktop viewports. It checks email-safe markup and layout regressions. It does not sign into or claim pixel-perfect output from real inbox applications.

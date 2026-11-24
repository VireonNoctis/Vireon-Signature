# Signature Studio

**Frontend preview:** https://vireonnoctis.github.io/Vireon-Signature/

## Team workspace

- Create and edit multiple employee profiles.
- Save reusable brand presets that contain visual styling rather than employee contact details.
- Apply a shared layout, style and palette to individual profiles.
- Import profiles from CSV or full teams from JSON.
- Export all profiles as JSON or CSV. CSV export includes each employee's rendered HTML and plain-text signature.
- Generate a single HTML file containing each employee's individual signature.

CSV accepts a header row with a \`name\` column. Common aliases include \`employee_name\`, \`full_name\`, \`job_title\`, \`title\`, \`email_address\`, \`company_name\` and \`website_url\`. Optional columns use the signature configuration names such as \`phone\`, \`location\`, \`logo_url\` and \`linkedin_url\`.

The C++ service validates profiles and stores them in RocksDB. The browser shows the connection and save state. When the API is unavailable, edits and exports remain usable in the current tab, but are not represented as saved.

## Email previews and exports

Preview controls cover Gmail, Outlook, Apple Mail and Proton Mail labels, light/dark themes and desktop/mobile widths. Playwright runs this matrix in Chromium and WebKit and checks the table-based renderer and inline email-safe output.

These are browser-based simulations and renderer regression tests, not authenticated testing in live inbox applications. Proprietary client sanitization and dark-mode behavior can still vary. Copied HTML intentionally uses Arial fallbacks rather than web fonts.

## PWA setup

The app registers a service worker and exposes a native installation prompt when the browser sends \`beforeinstallprompt\`. Otherwise, the action is named **Setup** and provides the browser's manual Add to Home Screen / Install app guidance. The service worker caches the app shell, not private team API data.

## Fonts and design

The interface uses local CSS font declarations for the official Geist Sans and Geist Mono variable TTF assets published by Vercel's Geist font project. It does not import Google Fonts. The email signature output does not depend on Geist or any web font.

## Data and privacy

The C++ service creates an anonymous workspace using a secure random session cookie. Signature profiles and presets are scoped to that cookie and stored in RocksDB. The session cookie is HttpOnly, SameSite=Lax and Secure in production; a separate double-submit CSRF cookie protects writes.

There is no user login, account recovery or shared cloud team membership in this version. Clearing the browser's cookies removes the link to the anonymous workspace. Export JSON to preserve a backup.

## Deployment

Run the full product with Docker Compose. The container serves the Vite build and C++ API from one origin and mounts RocksDB at \`/data\`. GitHub Pages continues to host a static frontend only and cannot provide persistent database support.

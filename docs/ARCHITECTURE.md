# Architecture

## Product boundary

Vireon Signature is a React + JavaScript + Vite application backed by a C++ HTTP service and RocksDB. The UI and API are served from one origin by the Docker runtime. GitHub Pages remains a static frontend preview; it cannot run the C++ process or persist team data.

## Runtime

\`\`\`text
Browser
├── React / Vite frontend
│   ├── Signature editor and team workspace
│   ├── Email-safe HTML / plain-text renderer
│   ├── CSV and JSON import/export
│   └── PWA service worker
└── Same-origin C++ API (Boost.Beast)
    ├── Anonymous workspace cookie + CSRF double-submit cookie
    ├── Team/profile/preset validation
    └── RocksDB (one namespace per anonymous session token)
\`\`\`

## Ownership

| Area | Owns | Must not depend on |
| --- | --- | --- |
| \`src/app/\` | Root React composition | Feature-private implementation |
| \`src/features/signature-studio/components/\` | Editor, preview, PWA setup and Three.js scene | Backend persistence details |
| \`src/features/signature-studio/hooks/\` | API workspace lifecycle, clipboard, install prompt | Domain renderer |
| \`src/features/signature-studio/domain/\` | Signature HTML/text renderer, validated team/CSV transformations | React, DOM, storage or clipboard |
| \`src/features/signature-studio/styles/\` | Signature Studio presentation | Domain rendering |
| \`backend/src/\` | HTTP routing, cookie validation, RocksDB persistence and static delivery | Frontend component state |
| \`tests/domain/\` | Pure renderer and team import/export contracts | Browser-private state |
| \`tests/email-client/\` | Browser-rendered client/theme/viewport regression matrix | Production inbox credentials |
| \`backend/tests/\` | HTTP, cookie, CSRF and persistence integration | External services |

## Data flow

1. The editor creates one employee profile using a validated JavaScript configuration.
2. The browser receives an anonymous 256-bit session token in an HttpOnly, SameSite=Lax cookie. The server stores only its SHA-256 digest as the RocksDB namespace.
3. A separate readable CSRF cookie is echoed in the \`X-CSRF-Token\` header for workspace writes. Writes also require a same-origin \`Origin\` header.
4. The React hook debounces and serializes team saves to \`PUT /api/team\`. A network failure is visible; edits remain in the current tab but are not falsely presented as saved.
5. C++ validates the data allowlist and size limits before persisting it in RocksDB.
6. The framework-independent domain renderer creates conservative email-safe HTML and plain text.
7. CSV and JSON exports are generated locally. CSV bulk export includes each employee's individual HTML and text signature.

## API contract

| Method | Path | Purpose |
| --- | --- | --- |
| GET | \`/api/health\` | Service health |
| GET | \`/api/session\` | Issue/check anonymous workspace and CSRF cookies |
| GET | \`/api/team\` | Read the active team's profiles and brand presets |
| PUT | \`/api/team\` | Validate and persist profiles/presets to RocksDB |

The team endpoint supports up to 500 employee profiles, 50 brand presets and a 1 MiB request body. The service does not expose a public user directory or accept arbitrary configuration keys.

## Security and privacy

- The workspace cookie is HttpOnly, Secure in production, SameSite=Lax and scoped to \`/\`.
- The CSRF cookie is Secure in production and SameSite=Lax; writes require a matching header and same-origin request.
- Configure \`APP_ORIGIN\` to the exact HTTPS origin when running behind a reverse proxy. The server does not enable cross-origin credentialed requests.
- Session tokens are generated with OpenSSL secure random bytes. RocksDB keys use SHA-256 digests, not raw cookie values.
- The service does not log signature contents or cookie values.
- Team data is stored unencrypted in the mounted RocksDB volume. Protect the host and volume with normal infrastructure access controls and backups.
- This version uses anonymous browser sessions, not accounts or team invitations. Clearing the workspace cookie loses access to that session; export a JSON backup before clearing browser data.
- The public GitHub Pages frontend cannot reach a bundled C++ backend. On Pages, the workspace reports that saving is unavailable; local edits and exports still work.

## Email output and compatibility

The renderer uses presentation tables, inline styles, HTTPS images and Arial-family fallbacks. It deliberately excludes scripts, external stylesheets, tracking pixels, Canvas output, blur and web-font dependencies from copied email HTML.

The automated preview matrix covers Gmail, Outlook, Apple Mail and Proton Mail labels across light/dark themes, mobile/desktop viewports, and Chromium/WebKit. These are conservative browser-based simulations and HTML regression checks, not live inbox tests or a claim of pixel-identical rendering by proprietary clients. Real inbox behavior can vary by product version and account settings.

## PWA

The app has a web manifest and a scoped service worker. The browser's \`beforeinstallprompt\` event is used when available. When the browser does not expose a native prompt, the action is labelled **Setup** and displays the platform's manual installation path. API requests are never cached.

## Three.js

Three.js is decorative only. It must not block editor or export behavior. The scene caps pixel ratio, respects reduced motion, pauses while hidden, handles context loss and disposes GPU resources.

## Deployment

- \`docker compose up --build\` builds and serves the frontend and C++ API together on port 8080, with RocksDB data in the named \`signature-data\` volume.
- Set \`COOKIE_SECURE=true\` and \`APP_ORIGIN=https://your-hostname\` behind HTTPS in production.
- GitHub Pages continues to deploy only the static frontend at \`/Vireon-Signature/\`. It does not run C++ or RocksDB; use the container deployment for persistent team support.

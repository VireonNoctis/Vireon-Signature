# Project Setup

## Requirements

- Node.js 24 and npm
- CMake 3.20+
- C++17 compiler
- RocksDB development files
- Boost.System
- OpenSSL development files
- nlohmann-json
- Python 3.10+
- Docker and Docker Compose (recommended runtime)

## Local development

Build the frontend first so the static server root exists, then start the C++ API in one terminal:

\`\`\`bash
npm run build
cmake -S backend -B backend/build -DCMAKE_BUILD_TYPE=Debug
cmake --build backend/build --parallel
COOKIE_SECURE=false DATA_DIR=./data WEB_ROOT=./dist ./backend/build/signature-api
\`\`\`

In a second terminal, run Vite. Its \`/api\` proxy forwards requests to port 8080:

\`\`\`bash
npm install
npm run dev
\`\`\`

Build the frontend before starting the API because the C++ server also serves the static \`dist/\` directory. During development, Vite serves the UI and proxies API requests.

## Complete validation

\`\`\`bash
python3 scripts/validate.py
npm test
npm run test:backend
npm run build
npx playwright install chromium webkit
npm run test:email
\`\`\`

\`npm run validate\` runs the repository checks, domain/team tests, C++ build and API tests, frontend build, and Playwright email-preview matrix in sequence.

## Docker Compose

\`\`\`bash
docker compose up --build
\`\`\`

Open \`http://localhost:8080\`. Local Compose defaults \`COOKIE_SECURE=false\`; do not use that setting on a public HTTPS deployment.

For production, create an environment file beside \`compose.yaml\`:

\`\`\`env
COOKIE_SECURE=true
APP_ORIGIN=https://signatures.example.com
\`\`\`

Place the container behind a TLS reverse proxy and expose only the HTTPS origin. Keep the named \`signature-data\` volume persistent and back it up. Team data is not encrypted by the application.

## GitHub Pages

The GitHub Pages workflow builds the UI with the \`/Vireon-Signature/\` base path. Pages is static hosting and cannot run the C++ service or RocksDB. The static page remains available for design/preview and local exports, but team persistence requires the Docker runtime or a separately hosted same-origin API.

## Session privacy

The service uses anonymous per-browser workspace cookies, not user accounts. The HttpOnly session cookie identifies an opaque RocksDB namespace. Clearing cookies loses access to the workspace. Use JSON export for a portable backup before clearing browser data or changing browsers.

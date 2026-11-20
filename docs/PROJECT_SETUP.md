# Project Setup

## Requirements

- Node.js 22.12 or newer
- npm 10 or newer
- Git

## Local development

```bash
npm install
npm run dev
```

## Verification

```bash
python3 scripts/validate.py
npm run typecheck
npm test
npm run build
```

The application is static and browser-only. It requires no environment variables, server, database or account integration.

## GitHub Pages

The deployment workflow builds with the `/Vireon-Signature/` base path and publishes `dist/`. In repository settings, enable GitHub Pages with **GitHub Actions** as the source.

## Local privacy

Drafts remain in the browser's local storage. Do not add analytics, server-side capture or remote draft persistence without updating the privacy documentation and reviewing consent requirements.

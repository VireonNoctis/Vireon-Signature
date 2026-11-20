# Project Setup

## Requirements

- Node.js 22.12 or newer
- npm 11 or newer
- Git

## Local development

```bash
npm install
npm run dev
```

## Verification

```bash
python3 scripts/validate.py
npm test
npm run build
```

No environment variables, API keys or backend services are required.

## GitHub Pages

The Vite build uses the repository path `/Vireon-Signature/`. Enable GitHub Pages with **GitHub Actions** as the publishing source in repository settings. The deployment workflow builds and publishes `dist/`.

## Draft privacy

Drafts remain in browser local storage. Do not add analytics or server-side capture without changing the privacy model and reviewing consent requirements.

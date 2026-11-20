# Architecture

## Product boundary

Vireon Signature is a browser-only React application built with JavaScript, Vite and Three.js. It ships as static files to GitHub Pages. It has no backend, database, account system, remote draft storage or analytics endpoint.

## Runtime

```text
index.html
└── src/main.jsx
    └── src/app/App.jsx
        └── features/signature-studio/components/SignatureStudio.jsx
            ├── components/ThreeAtmosphere.jsx
            ├── hooks/useSignatureDraft.js
            ├── hooks/useSignatureExport.js
            └── domain/emailSignature.js
```

## Ownership

| Area | Owns | Must not depend on |
| --- | --- | --- |
| `app/` | Root React composition | Feature-private implementation |
| `features/signature-studio/components/` | Editor, preview, style picker and Three.js scene | Deployment concerns |
| `features/signature-studio/hooks/` | Browser draft lifecycle and clipboard/download behavior | Component markup |
| `features/signature-studio/domain/` | Configuration, URL validation, palette and email HTML/text rendering | React, DOM, storage or clipboard |
| `features/signature-studio/styles/` | Feature presentation, responsive behavior and animation | Domain rendering |
| `styles/` | Shared reset and design tokens | Feature-specific selectors |
| `tests/domain/` | Observable contracts of the pure renderer | Component-private state |

## Data flow

1. The editor updates a plain JavaScript signature configuration.
2. The draft hook restores validated local data and writes edits to local storage.
3. The domain module turns configuration into conservative email-safe HTML and plain text.
4. The preview displays the generated HTML inside the app's glass presentation.
5. The export hook copies both HTML and plain-text alternatives, copies raw HTML, or downloads a self-contained HTML document.

## Dependency direction

The email renderer is the stable center. React components and hooks depend on it; it does not import React, browser APIs or DOM utilities. Three.js owns only the atmospheric background. Neither Three.js nor editor CSS enters copied email HTML.

## Visual system

The product UI is a restrained monochrome glass workspace over a procedural Three.js coastal atmosphere. Ten preset signature finishes and a custom palette affect the signature card and exported static colour treatment. The main editor remains grayscale to preserve hierarchy.

The Three.js scene:
- Caps device pixel ratio for mobile performance.
- Stops when the document is hidden.
- Supports a pause control and reduced-motion preference.
- Handles context loss with a CSS background fallback.
- Disposes renderer, geometry and material on unmount.

## Failure and security boundaries

- Stored drafts are treated as untrusted and restored only into known fields.
- User-controlled text is HTML-escaped.
- Web links are limited to HTTP/HTTPS and reject embedded credentials.
- Images require HTTPS and may still be blocked by email clients.
- Clipboard permission failures are visible; raw HTML copy and file export are alternatives.
- Invalid name or email prevents export and focuses the relevant input.
- WebGL2 unavailability does not block editor or export functionality.

## Deployment

GitHub Actions runs repository validation and domain regression tests, then builds the Vite application with the `/Vireon-Signature/` base path and deploys the static `dist/` output to GitHub Pages.

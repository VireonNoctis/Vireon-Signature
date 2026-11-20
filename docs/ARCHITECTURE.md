# Architecture

## System boundary

Vireon Signature is a single-page Vue application. It runs entirely in the browser and builds to static files for GitHub Pages. There is no backend, account system, database, analytics endpoint or remote draft store.

## Runtime

```text
index.html
└── src/main.ts
    └── src/app/App.vue
        └── features/signature-studio/components/SignatureStudio.vue
            ├── components/SignatureAtmosphere.vue
            ├── components/PretextHeadline.vue
            ├── composables/useSignatureDraft.ts
            ├── composables/useSignatureExport.ts
            └── domain/emailSignature.ts
```

## Ownership

| Area | Owns | Must not depend on |
| --- | --- | --- |
| `app/` | App composition and application entry shell | Feature internals beyond its public component |
| `features/signature-studio/components/` | Editor controls, preview and canvas presentation | Deployment configuration |
| `features/signature-studio/composables/` | Browser draft lifecycle and clipboard/download interactions | Component markup |
| `features/signature-studio/domain/` | Configuration types, URL validation and HTML/text rendering | Vue, DOM, local storage, clipboard |
| `features/signature-studio/styles/` | Feature presentation, responsive behavior and motion | Domain rendering |
| `styles/` | App-wide typography, reset and design tokens | Feature-specific selectors |
| `tests/domain/` | Observable contracts of the pure renderer | Component-private state |

## Data flow

1. The editor updates a typed `SignatureConfig`.
2. The draft composable restores a validated local draft on mount and persists changes locally.
3. The domain renderer turns the current config into a table-based HTML fragment and a plain-text representation.
4. The preview renders that exact HTML fragment in the browser.
5. The export composable copies rich HTML plus plain text, copies raw HTML, or downloads a standalone HTML document.

## Dependency direction

The domain renderer is the stable center. Vue components and composables depend on it; the domain does not import Vue or browser APIs. Canvas components are presentation-only and are not included in the exported email HTML.

## Failure and security boundaries

- Restored local data is treated as untrusted and merged against the known configuration shape.
- User-provided text is HTML-escaped before output.
- Web links are limited to HTTP and HTTPS and URLs containing credentials are rejected.
- Remote images require HTTPS.
- Clipboard access may be blocked by browser permissions; the UI reports this and exposes raw HTML and file export alternatives.
- WebGL2 may be unavailable or lost; CSS background treatment remains available.
- Reduced-motion preferences disable continuous motion.

## Deployment

GitHub Actions builds the Vite application with the repository Pages base path and deploys static `dist/` output. Generated build output is not committed to the source branch.

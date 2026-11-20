# Extraction, untangling and stack migration audit

- Date: 2026-11-20
- Scope: standalone Vireon Signature repository
- Optional comments/tests cleanup: neither

## Previous coupling

The editor originated inside the Vireon portfolio and depended on its Vue entry point, global styles, root asset assumptions and portfolio-specific route inlining. The first standalone extraction retained Vue and TypeScript. This change replaces that stack at the owner's request.

## New ownership

```text
src/
├── app/                              # React app shell
├── features/
│   └── signature-studio/
│       ├── components/               # Studio editor and Three.js scene
│       ├── hooks/                    # Local draft and export interactions
│       ├── domain/                   # Plain JS email renderer and palette
│       └── styles/                   # Studio presentation and motion
├── styles/                           # Global tokens
└── main.jsx                          # React entry

tests/domain/                         # Email renderer tests
public/                               # Static assets and metadata
docs/                                 # Architecture, setup and decisions
scripts/                              # Configuration validation
.github/workflows/                    # CI and Pages deployment
```

## Structural decisions

- Replaced Vue SFCs and Composition API with React JSX components and hooks.
- Removed TypeScript source and the Vue type-check toolchain.
- Replaced the Vue Vite plugin with the React Vite plugin.
- Replaced the native custom WebGL wrapper with a Three.js-owned scene.
- Kept email HTML generation in a framework-independent JavaScript module.
- Separated browser local storage and clipboard/download behavior into React hooks.
- Moved layout, theme selection and custom colours into an explicit studio design surface.
- Added the insertion guide as a progressive-disclosure section after the designer.

## Old path → new path

| Previous source | New source |
| --- | --- |
| `src/main.ts` | `src/main.jsx` |
| `src/app/App.vue` | `src/app/App.jsx` |
| `src/features/signature-studio/components/SignatureStudio.vue` | `src/features/signature-studio/components/SignatureStudio.jsx` |
| `SignatureAtmosphere.vue` | `ThreeAtmosphere.jsx` |
| `PretextHeadline.vue` | Removed; headline is semantic HTML with CSS reveal motion |
| `useSignatureDraft.ts` | `hooks/useSignatureDraft.js` |
| `useSignatureExport.ts` | `hooks/useSignatureExport.js` |
| `domain/emailSignature.ts` | `domain/emailSignature.js` |
| Vue-specific stylesheet imports | `styles/studio.css` and `styles/tokens.css` |
| `vite.config.ts` | `vite.config.js` |

## Tests and comments

Existing useful comments and tests are retained in spirit. The renderer is now tested with Node's built-in test runner using plain JavaScript. The test suite covers HTML escaping, unsafe URLs, HTTPS image policy, table output, ten presets plus Custom, validated saved configuration and custom colour boundaries. The selection was "neither", so no generic deletion pass was performed.

## Verification

Run:

```bash
python3 scripts/validate.py
npm test
npm run build
```

CI and Pages workflows repeat the relevant test/build checks. Browser-level interaction testing across multiple email clients is not automated by this repository and remains a manual release review.

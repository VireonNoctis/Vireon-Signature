# VIREON / SIGNATURE

<p align="left"><img src="public/vireon-mark.svg" width="48" height="48" alt="Vireon mark" /></p>

**Your identity, in every email.**

A considered, animated email-signature studio. Build a personal signature, preview it in context, and export portable HTML designed for real inboxes.

<p>
  <a href="https://github.com/VireonNoctis/Vireon-Signature/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/VireonNoctis/Vireon-Signature/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white" />
  <img alt="WebGL2" src="https://img.shields.io/badge/Canvas-WebGL2-101820" />
</p>

---

## The studio

Design once. Use it everywhere.

| Identity | Design | Export |
| --- | --- | --- |
| Name, role and company | Portrait, brand mark or minimal | Formatted clipboard copy |
| Contact details and social links | Ink and paper themes | Raw HTML copy |
| Logo and portrait URLs | Custom accent colour | Standalone HTML file |

The interface features a shader-driven atmosphere, responsive Canvas typography, a live email preview, and glass-surface controls. The email output is deliberately simpler: table-based layout, inline styles, safe links, and optional HTTPS images.

## Built with

- **Vue 3** — reactive application UI.
- **TypeScript** — typed signature data and renderer contracts.
- **Vite** — lean development and production builds.
- **Pretext** — responsive text measurement for the Canvas headline.
- **Native WebGL2** — atmospheric shader without a second 3D runtime.

No account, server, analytics endpoint, or remote draft storage is required.

## Get started

**Requirements:** Node.js 22.12+ and npm 10+.

```bash
git clone https://github.com/VireonNoctis/Vireon-Signature.git
cd Vireon-Signature
npm install
npm run dev
```

Open the local URL printed by Vite.

### Quality checks

```bash
python3 scripts/validate.py
npm run typecheck
npm test
npm run build
```

For the GitHub Pages base path:

```bash
npm run build:pages
npm run preview
```

## Project map

```text
src/
├── app/                         # Application composition and entry shell
├── features/
│   └── signature-studio/
│       ├── components/          # Editor, preview and visual presentation
│       ├── composables/         # Draft persistence and export actions
│       ├── domain/              # Signature model and email-safe renderer
│       └── styles/              # Feature-scoped visual system and motion
├── styles/                      # Application-wide design tokens
└── main.ts                      # Vue and feature-style entry point

tests/
└── domain/                      # Renderer and data-boundary regression tests

docs/
├── DECISIONS/                   # Accepted architectural decisions
├── ARCHITECTURE.md              # Runtime and dependency boundaries
└── SIGNATURE_STUDIO.md          # Output, compatibility and data handling
```

The feature owns its UI, state orchestration, output generation and presentation. The domain renderer has no Vue or browser dependency, so it can be tested independently.

## Email compatibility

The output uses table layouts, inline CSS, common system fonts, explicit image dimensions, ordinary text links and a plain-text clipboard alternative. It is designed for broad compatibility with Gmail, Outlook, Apple Mail, Proton Mail, Yahoo Mail, Thunderbird, and other clients that accept HTML signatures.

**No HTML signature can guarantee identical rendering in every inbox.** Clients may sanitize markup, block remote images, substitute fonts or apply their own dark-mode transformations.

Cloudflare Email Routing is inbound forwarding. For outbound sending with Cloudflare Email Service, include the exported HTML in the message body from the sending application.

## Privacy and data

- Drafts are stored in this browser's local storage only.
- Signature details are not sent to a Vireon server.
- Images must be public HTTPS URLs; recipients' email clients may still block them.
- Exported HTML contains no JavaScript, remote stylesheets, web fonts or tracking pixels.

## Documentation

- [Extraction and untangling audit](docs/UNTANGLE_AUDIT.md)

- [Architecture](docs/ARCHITECTURE.md)
- [Signature output and compatibility](docs/SIGNATURE_STUDIO.md)
- [Architecture decisions](docs/DECISIONS/README.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## Development principles

Keep the domain renderer independent. Keep browser storage and clipboard access at the UI boundary. Keep email output conservative, even when the editor becomes more expressive. Prefer a small, complete change over speculative layers.

---

<p align="center"><sub>VIREON / SIGNATURE — DESIGNED TO SIGN OFF.</sub></p>

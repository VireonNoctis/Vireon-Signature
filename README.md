# VIREON / SIGNATURE

<p><img src="public/vireon-mark.svg" width="46" height="46" alt="Vireon mark" /></p>

**One signature. Your whole team.**

A cinematic, monochrome signature studio. Shape your identity, choose a finish, preview the result and insert it into your inbox.

<p>
  <a href="https://github.com/VireonNoctis/Vireon-Signature/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/VireonNoctis/Vireon-Signature/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="React 19" src="https://img.shields.io/badge/React-19.3-61dafb?logo=react&logoColor=111" />
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-ES2022-f7df1e?logo=javascript&logoColor=111" />
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-WebGL-111?logo=threedotjs" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=fff" />
</p>

---

## The studio

A calm, animated workspace built around the signature itself.

- Live identity, contact and brand editing.
- A three-dimensional atmospheric background inspired by the supplied coastal reference.
- Ten ready-made finishes, plus a Custom palette.
- Portrait, brand-mark and minimal compositions.
- Formatted signature copy, raw HTML copy and standalone HTML export.
- In-context insertion guidance for Gmail, Outlook, Proton Mail, Apple Mail, Thunderbird and Cloudflare Email Service.

### Signature finishes

| Style | Character |
| --- | --- |
| Liquid Glass | Cool, translucent graphite |
| Sakura Glass | Soft rose glass |
| Obsidian | Deep black and silver |
| Frost | Quiet, pale mineral |
| Aurora | Muted green light |
| Chrome | Brushed metal |
| Editorial | Warm paper |
| Midnight | Blue-black |
| Monochrome | Pure grayscale |
| Holographic | Restrained iridescence |
| Custom | Your own accent and surfaces |

The editor's materials never enter the copied email HTML. Email output stays table-based, inline-styled and text-first.

## Built with

- **JavaScript** — ES modules, no TypeScript.
- **React 19** — interface, editor state and transitions.
- **Three.js** — procedural WebGL background.
- **Vite** — local development and static production builds.

No backend, account system, analytics endpoint or remote draft store.

## Get started

**Requirements:** Node.js 22.12+ and npm 11+.

```bash
git clone https://github.com/VireonNoctis/Vireon-Signature.git
cd Vireon-Signature
npm install
npm run dev
```

Open the local URL printed by Vite.

## Quality checks

```bash
python3 scripts/validate.py
npm test
npm run build
```

For the GitHub Pages repository path:

```bash
npm run build:pages
npm run preview
```

## Project map

```text
src/
├── app/                         # React app composition
├── features/
│   └── signature-studio/
│       ├── components/          # Editor, preview and Three.js scene
│       ├── hooks/               # Browser draft and export behavior
│       ├── domain/              # Framework-free email renderer
│       └── styles/              # Studio design system and motion
├── styles/                      # Global tokens and reset
└── main.jsx                     # React entry point

tests/domain/                    # Email renderer regression tests
public/                          # Icons, social preview and site metadata
docs/                            # Architecture, setup, decisions and compatibility
scripts/                         # Repository validation
.github/workflows/               # CI and GitHub Pages deployment
```

## Compatibility

The generated signature uses presentation tables, inline CSS, system fonts, explicit image dimensions, safe links and a plain-text clipboard alternative. It is intended for broad compatibility with Gmail, Outlook, Apple Mail, Proton Mail, Yahoo Mail and Thunderbird. Individual clients can sanitize markup, block remote images or apply dark-mode transformations, so identical rendering cannot be guaranteed.

Cloudflare Email Routing is inbound forwarding. For outbound Cloudflare Email Service messages, include the exported HTML in the sending application's HTML body.

## Privacy

- Drafts stay in this browser's local storage.
- Signature details are not sent to Vireon.
- Images must be publicly accessible HTTPS URLs; recipients may still block them.
- Exported email HTML contains no scripts, tracking pixels, remote CSS or web fonts.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Project setup](docs/PROJECT_SETUP.md)
- [Signature output and compatibility](docs/SIGNATURE_STUDIO.md)
- [Migration and untangling audit](docs/UNTANGLE_AUDIT.md)
- [Architecture decisions](docs/DECISIONS/README.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

---

<p align="center"><sub>VIREON / SIGNATURE — DESIGNED TO SIGN OFF.</sub></p>

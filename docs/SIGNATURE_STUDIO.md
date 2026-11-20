# Vireon Signature Studio

**Standalone application:** https://vireonnoctis.github.io/Vireon-Signature/

## Product

A browser-only email signature builder built with Vue 3 + Vite. It uses the Vireon Nothing-inspired visual language, Pretext for responsive Canvas headline layout, and a small native WebGL2 atmosphere. No backend, account system or remote draft storage is required.

The editor offers three layouts (portrait, brand mark, minimal), ink and paper palettes, editable accent colour, identity and contact details, social links, an optional tagline, and a call-to-action link. The preview renders the same HTML fragment that is exported.

## Motion and visual references

The decorative background is a native WebGL2 shader inspired by ShaderGradient's moving colour fields, density, grain, light and slow motion controls. It uses native WebGL rather than adding a second Three.js/TresJS runtime. The background has a pause control, stops when the page is hidden, respects reduced motion, caps pixel density, and uses a CSS fallback when WebGL2 is unavailable.

The animated two-line headline uses `@chenglou/pretext` to measure and lay out text before painting it on Canvas. Its semantic heading remains available to assistive technology. The email HTML fragment is separate from these effects: no canvas, blur, animation, or external font is included in copied email output.

## Data handling

- Draft values are saved in this browser's local storage under `vireon.signature-studio.v1`.
- No form values are sent to Vireon servers.
- Images are referenced by public HTTPS URLs. Local paths, `blob:` URLs, and `data:` URLs are not exported because email clients cannot reliably retrieve them.
- Recipients may block remote images until they explicitly allow them.
- Exported HTML contains no scripts, external stylesheets, web fonts, tracking pixels or analytics.

## Email markup strategy

The renderer emits a compact fragment built from presentation tables and inline styles. It uses explicit dimensions, system fonts, ordinary text links, and a text-only clipboard fallback.

Three layouts are available:

- **Portrait:** portrait image when a valid HTTPS image URL is supplied; otherwise initials.
- **Brand mark:** logo image when supplied; otherwise initials.
- **Minimal:** type-led layout without an image column.

The **Copy signature** action writes both `text/html` and `text/plain` when rich clipboard writes are supported. **Copy HTML** writes the HTML fragment as text. **Export .html** downloads a standalone preview document.

## Compatibility

The fragment is designed for broad interoperability with Gmail, Proton Mail, Outlook, Apple Mail, Yahoo Mail, Thunderbird, and other clients that accept HTML signatures. Email clients can rewrite HTML, substitute fonts, block images, or transform dark-mode colours; pixel parity cannot be guaranteed across every client or version.

Proton Mail supports pasting a formatted signature from a third-party builder into Settings → Identity and addresses → Display name and signature:
https://proton.me/support/display-name-email-signature

Cloudflare Email Service can send outbound messages through a Workers binding, REST API, or SMTP. For programmatic sending, include the exported fragment in the outgoing message's HTML body. Cloudflare Email Routing handles inbound forwarding and does not install a signature in an outgoing composer:
https://developers.cloudflare.com/email-service/get-started/send-emails/
https://developers.cloudflare.com/email-service/

## Build and deployment

The Vite app builds as a static site at the `/Vireon-Signature/` base path. GitHub Actions validates configuration, type-checks, runs domain regression tests, builds the application and deploys the `dist/` directory to GitHub Pages.

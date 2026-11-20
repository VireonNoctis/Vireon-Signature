# Signature Studio

**Live project path:** https://vireonnoctis.github.io/Vireon-Signature/

## Editor

The editor configures name, role, company, email, phone, website, location, tagline, logo, portrait and social links. It supports portrait, brand-mark and minimal compositions.

Ten signature finishes are provided:

1. Liquid Glass
2. Sakura Glass
3. Obsidian
4. Frost
5. Aurora
6. Chrome
7. Editorial
8. Midnight
9. Monochrome
10. Holographic

Custom exposes accent, surface, foreground, muted and border colours.

The preview uses the same HTML renderer as the export. The on-screen card adds glass, clipping and motion treatments, but those effects are not included in copied HTML.

## Insertion

The installation panel is revealed below the editor. It contains separate instructions for Gmail, Outlook, Proton Mail, Apple Mail, Thunderbird and Cloudflare Email Service.

Cloudflare Email Routing is an inbound forwarding service, not a signature editor. For Cloudflare Email Service outbound messages, place the exported fragment in the sending application's HTML body.

## Email output

The renderer uses nested presentation tables, inline styles, safe text links, explicit image dimensions and text-based fallbacks. Remote image URLs must be public HTTPS URLs. Images may be blocked by recipients.

No external CSS, JavaScript, tracking pixels, Canvas output, blur or web-font dependencies are included in the exported signature. Email clients may sanitize HTML or modify dark-mode colours; identical rendering cannot be guaranteed across every client.

## Privacy

The browser stores drafts locally under `vireon.signature.studio.v3`. Signature details are not sent to Vireon servers. Exported files are created locally in the browser.

export const SIGNATURE_STYLES = [
  { id: "liquid-glass", name: "Liquid Glass", accent: "#dce9ef", background: "#121820", foreground: "#f2f5f8", muted: "#9eacb6", border: "#52616b" },
  { id: "sakura-glass", name: "Sakura Glass", accent: "#ebbdca", background: "#201619", foreground: "#fff4f5", muted: "#c4a8b0", border: "#694d56" },
  { id: "obsidian", name: "Obsidian", accent: "#ffffff", background: "#090909", foreground: "#f4f4f4", muted: "#a5a5a5", border: "#414141" },
  { id: "frost", name: "Frost", accent: "#7f9da9", background: "#f4f7f8", foreground: "#151d22", muted: "#5a6a71", border: "#c6d0d4" },
  { id: "aurora", name: "Aurora", accent: "#8fd6c1", background: "#0b1818", foreground: "#ecf7f3", muted: "#96b9af", border: "#345a50" },
  { id: "chrome", name: "Chrome", accent: "#d3d6d7", background: "#151617", foreground: "#f6f6f6", muted: "#a5aaad", border: "#666b6e" },
  { id: "editorial", name: "Editorial", accent: "#2e3132", background: "#f2efe8", foreground: "#171717", muted: "#62615c", border: "#c8c4bb" },
  { id: "midnight", name: "Midnight", accent: "#afc2ed", background: "#10182a", foreground: "#f3f5ff", muted: "#acb5cd", border: "#465574" },
  { id: "monochrome", name: "Monochrome", accent: "#cfcfcf", background: "#111111", foreground: "#f3f3f3", muted: "#9a9a9a", border: "#484848" },
  { id: "holographic", name: "Holographic", accent: "#cbc6e8", background: "#12151c", foreground: "#f6f6f8", muted: "#abb0c3", border: "#54566b" },
  { id: "custom", name: "Custom", accent: "#d9d9d9", background: "#111111", foreground: "#f4f4f4", muted: "#a5a5a5", border: "#4b4b4b" }
];

export function createDefaultSignatureConfig() {
  return {
    name: "", role: "", company: "", email: "", phone: "", website: "", location: "",
    tagline: "", logoUrl: "", portraitUrl: "", linkedinUrl: "", instagramUrl: "", xUrl: "",
    ctaLabel: "", ctaUrl: "", styleId: "liquid-glass",
    customAccent: "#d9d9d9", customBackground: "#111111", customForeground: "#f4f4f4",
    customMuted: "#a5a5a5", customBorder: "#4b4b4b", layout: "portrait",
    showCompany: true, showPhone: true, showLocation: true, showSocials: true
  };
}

export function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function restoreSignatureConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const defaults = createDefaultSignatureConfig();
  const restored = { ...defaults };
  const stringKeys = Object.keys(defaults).filter((key) => typeof defaults[key] === "string");
  for (const key of stringKeys) {
    if (typeof value[key] === "string") { const limit = key === "tagline" ? 120 : key === "name" || key === "role" || key === "company" ? 80 : 180; restored[key] = value[key].slice(0, limit); }
  }
  if (!SIGNATURE_STYLES.some((style) => style.id === restored.styleId)) restored.styleId = defaults.styleId;
  if (!["portrait", "brand", "minimal"].includes(restored.layout)) restored.layout = defaults.layout;
  for (const key of ["showCompany", "showPhone", "showLocation", "showSocials"]) {
    if (typeof value[key] === "boolean") restored[key] = value[key];
  }
  for (const key of ["customAccent", "customBackground", "customForeground", "customMuted", "customBorder"]) {
    if (!isHexColor(restored[key])) restored[key] = defaults[key];
  }
  return restored;
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function normalizeWebUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
    const url = new URL(candidate);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url.toString();
  } catch { return null; }
}

export function normalizeImageUrl(value) {
  const url = normalizeWebUrl(value);
  return url && new URL(url).protocol === "https:" ? url : null;
}

export function getSignaturePalette(config) {
  const preset = SIGNATURE_STYLES.find((style) => style.id === config.styleId) || SIGNATURE_STYLES[0];
  if (config.styleId !== "custom") return preset;
  const safe = (value, fallback) => isHexColor(value) ? value : fallback;
  return {
    id: "custom", name: "Custom",
    accent: safe(config.customAccent, preset.accent),
    background: safe(config.customBackground, preset.background),
    foreground: safe(config.customForeground, preset.foreground),
    muted: safe(config.customMuted, preset.muted),
    border: safe(config.customBorder, preset.border)
  };
}

function initials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.length ? parts.map((part) => Array.from(part)[0]?.toUpperCase() ?? "").join("") : "YN";
}
function safeEmail(value) {
  const email = String(value ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
function safePhone(value) {
  const phone = String(value ?? "").trim();
  const compact = phone.replace(/[^\d+]/g, "");
  return compact.replace(/\+/g, "").length >= 5 ? compact : null;
}
function makeLink(label, href, color) {
  return '<a href="' + escapeHtml(href) + '" style="color:' + color + ';font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;text-decoration:none;">' + escapeHtml(label) + "</a>";
}

export function buildSignatureHtml(config) {
  const palette = getSignaturePalette(config);
  const name = config.name.trim() || "Your name";
  const title = [config.role.trim(), config.showCompany ? config.company.trim() : ""].filter(Boolean).join(" · ");
  const email = safeEmail(config.email);
  const phone = config.showPhone ? safePhone(config.phone) : null;
  const website = normalizeWebUrl(config.website);
  const websiteLabel = website ? website.replace(/^https?:\/\//i, "").replace(/\/$/, "") : "";
  const contacts = [];
  if (email) contacts.push(makeLink(email, "mailto:" + email, palette.foreground));
  if (phone) contacts.push(makeLink(config.phone.trim(), "tel:" + phone, palette.foreground));
  if (website) contacts.push(makeLink(websiteLabel, website, palette.foreground));
  const socials = [];
  if (config.showSocials) {
    for (const [label, raw] of [["LinkedIn", config.linkedinUrl], ["Instagram", config.instagramUrl], ["X", config.xUrl]]) {
      const href = normalizeWebUrl(raw);
      if (href) socials.push(makeLink(label, href, palette.muted));
    }
  }
  const logoUrl = normalizeImageUrl(config.logoUrl);
  const portraitUrl = normalizeImageUrl(config.portraitUrl);
  const logoCell = config.layout === "minimal" ? "" : '<td width="46" valign="middle" style="width:46px;padding:0 14px 0 0;">' +
    (logoUrl
      ? '<img src="' + escapeHtml(logoUrl) + '" width="40" height="40" alt="' + escapeHtml(config.company || "Company logo") + '" style="display:block;width:40px;height:40px;border:0;" />'
      : '<table role="presentation" width="40" height="40" cellpadding="0" cellspacing="0" border="0" bgcolor="' + palette.accent + '" style="border-collapse:collapse;"><tr><td align="center" valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:' + palette.background + ';">' + escapeHtml(initials(config.company || name)) + "</td></tr></table>") + "</td>";
  const portraitCell = config.layout === "portrait" && portraitUrl
    ? '<td width="92" valign="middle" align="right" style="width:92px;padding:0 0 0 14px;"><img src="' + escapeHtml(portraitUrl) + '" width="82" height="96" alt="' + escapeHtml(name) + '" style="display:block;width:82px;height:96px;border:0;outline:none;" /></td>'
    : "";
  const body = [
    '<div style="margin:0;color:' + palette.foreground + ';font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;line-height:25px;">' + escapeHtml(name) + "</div>",
    title ? '<div style="margin:3px 0 0;color:' + palette.muted + ';font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;">' + escapeHtml(title) + "</div>" : "",
    contacts.length ? '<div style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;">' + contacts.join('<span style="color:' + palette.muted + ';">&nbsp;&nbsp;·&nbsp;&nbsp;</span>') + "</div>" : "",
    config.showLocation && config.location.trim() ? '<div style="margin:4px 0 0;color:' + palette.muted + ';font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:15px;">' + escapeHtml(config.location.trim()) + "</div>" : "",
    config.tagline.trim() ? '<div style="margin:9px 0 0;color:' + palette.muted + ';font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:15px;">' + escapeHtml(config.tagline.trim()) + "</div>" : "",
    socials.length ? '<div style="margin:10px 0 0;color:' + palette.muted + ';font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:16px;">' + socials.join('<span style="color:' + palette.border + ';">&nbsp;&nbsp; / &nbsp;&nbsp;</span>') + "</div>" : "",
    config.ctaLabel.trim() && normalizeWebUrl(config.ctaUrl)
      ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:13px 0 0;border-collapse:collapse;"><tr><td bgcolor="' + palette.accent + '" style="padding:7px 11px;"><a href="' + escapeHtml(normalizeWebUrl(config.ctaUrl)) + '" style="color:' + palette.background + ';font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;line-height:15px;text-decoration:none;">' + escapeHtml(config.ctaLabel.trim()) + "</a></td></tr></table>" : ""
  ].filter(Boolean).join("");
  const content = '<td valign="middle" style="padding:0 0 0 14px;border-left:2px solid ' + palette.accent + ';">' + body + "</td>";
  const columns = config.layout === "minimal" ? content : logoCell + content + portraitCell;
  return '<table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" bgcolor="' + palette.background + '" style="width:100%;max-width:580px;border-collapse:collapse;background-color:' + palette.background + ';font-family:Arial,Helvetica,sans-serif;color:' + palette.foreground + ';"><tr><td style="padding:18px 20px;border:1px solid ' + palette.border + ';"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr>' + columns + "</tr></table></td></tr></table>";
}

export function buildSignaturePlainText(config) {
  return [
    config.name.trim(),
    [config.role.trim(), config.showCompany ? config.company.trim() : ""].filter(Boolean).join(" · "),
    safeEmail(config.email) || "",
    config.showPhone ? config.phone.trim() : "",
    normalizeWebUrl(config.website) || "",
    config.showLocation ? config.location.trim() : "",
    config.tagline.trim(),
    config.showSocials ? [normalizeWebUrl(config.linkedinUrl), normalizeWebUrl(config.instagramUrl), normalizeWebUrl(config.xUrl)].filter(Boolean).join(" | ") : ""
  ].filter(Boolean).join("\n");
}

export function buildSignatureDocument(config) {
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email signature</title></head><body style="margin:24px;padding:0;background:#f3f4f4;">' + buildSignatureHtml(config) + "</body></html>";
}

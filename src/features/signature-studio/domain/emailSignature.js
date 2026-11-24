export const SIGNATURE_STYLES = [
  { id: "liquid-glass", name: "Liquid Glass", accent: "#e3e3e3", background: "#121212", foreground: "#f2f2f2", muted: "#a0a0a0", border: "#555555" },
  { id: "sakura-glass", name: "Sakura Glass", accent: "#c8c8c8", background: "#1d1d1d", foreground: "#f4f4f4", muted: "#b0b0b0", border: "#5b5b5b" },
  { id: "obsidian", name: "Obsidian", accent: "#ffffff", background: "#090909", foreground: "#f4f4f4", muted: "#a5a5a5", border: "#414141" },
  { id: "frost", name: "Frost", accent: "#777777", background: "#f4f4f4", foreground: "#151515", muted: "#5a5a5a", border: "#c6c6c6" },
  { id: "aurora", name: "Aurora", accent: "#bdbdbd", background: "#111111", foreground: "#eeeeee", muted: "#a0a0a0", border: "#454545" },
  { id: "chrome", name: "Chrome", accent: "#d3d3d3", background: "#151515", foreground: "#f6f6f6", muted: "#a5a5a5", border: "#666666" },
  { id: "editorial", name: "Editorial", accent: "#2e2e2e", background: "#f2f2f2", foreground: "#171717", muted: "#626262", border: "#c8c8c8" },
  { id: "midnight", name: "Midnight", accent: "#b3b3b3", background: "#101010", foreground: "#f3f3f3", muted: "#acacac", border: "#464646" },
  { id: "monochrome", name: "Monochrome", accent: "#cfcfcf", background: "#111111", foreground: "#f3f3f3", muted: "#9a9a9a", border: "#484848" },
  { id: "holographic", name: "Holographic", accent: "#c9c9c9", background: "#121212", foreground: "#f6f6f6", muted: "#aaaaaa", border: "#555555" },
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

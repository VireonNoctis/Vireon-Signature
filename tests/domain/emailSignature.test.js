import assert from "node:assert/strict";
import test from "node:test";
import {
  SIGNATURE_STYLES, buildSignatureHtml, buildSignaturePlainText,
  createDefaultSignatureConfig, escapeHtml, getSignaturePalette,
  normalizeImageUrl, normalizeWebUrl, restoreSignatureConfig
} from "../../src/features/signature-studio/domain/emailSignature.js";

test("escapes HTML-sensitive characters", () => assert.equal(escapeHtml(`<&>"'`), "&lt;&amp;&gt;&quot;&#39;"));
test("normalizes links and rejects unsafe protocols and credentials", () => {
  assert.equal(normalizeWebUrl("example.com"), "https://example.com/");
  assert.equal(normalizeWebUrl("javascript:alert(1)"), null);
  assert.equal(normalizeWebUrl("https://user:pass@example.com"), null);
});
test("only includes public HTTPS images", () => {
  assert.equal(normalizeImageUrl("https://cdn.example.com/photo.png"), "https://cdn.example.com/photo.png");
  assert.equal(normalizeImageUrl("http://cdn.example.com/photo.png"), null);
});
test("escapes text and omits unsafe calls to action", () => {
  const config = { ...createDefaultSignatureConfig(), name: '<img src=x onerror="alert(1)">', ctaLabel: "<Open>", ctaUrl: "javascript:alert(1)" };
  const html = buildSignatureHtml(config);
  assert.match(html, /&lt;img src=x onerror=/);
  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /&lt;Open&gt;/);
});
test("renders tables and a plain-text alternative", () => {
  const config = { ...createDefaultSignatureConfig(), name: "Vir Example", email: "vir@example.com", phone: "+353 00 000 0000", website: "example.com" };
  const html = buildSignatureHtml(config);
  assert.match(html, /^<table role="presentation"/);
  assert.match(html, /mailto:vir@example\.com/);
  assert.match(html, /tel:\+353000000000/);
  assert.match(buildSignaturePlainText(config), /Vir Example/);
});
test("offers ten styles plus a custom style", () => {
  assert.equal(SIGNATURE_STYLES.length, 11);
  assert.equal(SIGNATURE_STYLES.filter((style) => style.id !== "custom").length, 10);
});
test("restores only recognized fields and safe enum/colour values", () => {
  const config = restoreSignatureConfig({ name: "Saved", styleId: "unknown", customAccent: "red", extra: "ignored" });
  assert.equal(config.name, "Saved");
  assert.equal(config.styleId, "liquid-glass");
  assert.equal(config.customAccent, "#d9d9d9");
  assert.equal("extra" in config, false);
  assert.equal(restoreSignatureConfig(null), null);
});
test("uses validated custom colors only", () => {
  const config = { ...createDefaultSignatureConfig(), styleId: "custom", customAccent: "#abcdef" };
  assert.equal(getSignaturePalette(config).accent, "#abcdef");
  assert.equal(getSignaturePalette({ ...config, customAccent: "pink" }).accent, "#d9d9d9");
});

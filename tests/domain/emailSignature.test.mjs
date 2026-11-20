import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSignatureHtml, buildSignaturePlainText, createDefaultSignatureConfig,
  escapeHtml, normalizeImageUrl, normalizeWebUrl, restoreSignatureConfig
} from "../../src/features/signature-studio/domain/emailSignature.ts";

test("escapes HTML-sensitive characters", () => {
  assert.equal(escapeHtml(`<&>"'`), "&lt;&amp;&gt;&quot;&#39;");
});
test("normalizes web URLs and rejects unsafe protocols and credentials", () => {
  assert.equal(normalizeWebUrl("example.com"), "https://example.com/");
  assert.equal(normalizeWebUrl("javascript:alert(1)"), null);
  assert.equal(normalizeWebUrl("https://user:pass@example.com"), null);
  assert.equal(normalizeWebUrl(""), null);
});
test("accepts HTTPS image URLs only", () => {
  assert.equal(normalizeImageUrl("https://cdn.example.com/avatar.png"), "https://cdn.example.com/avatar.png");
  assert.equal(normalizeImageUrl("http://cdn.example.com/avatar.png"), null);
  assert.equal(normalizeImageUrl("data:image/png;base64,AAAA"), null);
});
test("escapes user text and never emits javascript links", () => {
  const config = {
    ...createDefaultSignatureConfig(),
    name: '<img src=x onerror="alert(1)">',
    ctaLabel: "<Open>",
    ctaUrl: "https://example.com/book"
  };
  const html = buildSignatureHtml(config);
  assert.match(html, /&lt;img src=x onerror=/);
  assert.doesNotMatch(html, /<img src=x onerror=/);
  assert.match(html, /&lt;Open&gt;/);

  const unsafeConfig = { ...config, ctaUrl: "javascript:alert(1)" };
  const unsafeHtml = buildSignatureHtml(unsafeConfig);
  assert.doesNotMatch(unsafeHtml, /javascript:/);
  assert.doesNotMatch(unsafeHtml, /&lt;Open&gt;/);
});
test("renders table-based HTML and plain-text output", () => {
  const config = {
    ...createDefaultSignatureConfig(),
    name: "Vir Example", role: "Director", company: "Vireon",
    email: "vir@example.com", phone: "+353 00 000 0000",
    website: "example.com", linkedinUrl: "https://linkedin.com/in/example"
  };
  const html = buildSignatureHtml(config);
  const plain = buildSignaturePlainText(config);
  assert.match(html, /^<table role="presentation"/);
  assert.match(html, /mailto:vir@example\.com/);
  assert.match(html, /tel:\+353000000000/);
  assert.match(plain, /Vir Example/);
  assert.match(plain, /https:\/\/example\.com\//);
});
test("restores only known fields and valid enum and colour values", () => {
  const config = restoreSignatureConfig({
    name: "Saved name", layout: "unrecognized", theme: "paper", accent: "red",
    showCompany: false, arbitrary: "ignored"
  });
  assert.ok(config);
  assert.equal(config.name, "Saved name");
  assert.equal(config.layout, "portrait");
  assert.equal(config.theme, "paper");
  assert.equal(config.accent, "#a9dce3");
  assert.equal(config.showCompany, false);
  assert.equal("arbitrary" in config, false);
  assert.equal(restoreSignatureConfig(null), null);
});

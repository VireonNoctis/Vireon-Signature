import assert from "node:assert/strict";
import test from "node:test";
import {
  createTeamProfile, exportProfilesCsv, exportTeamJson, importProfilesFromCsv,
  normalizeTeamData, parseCsvRows
} from "../../src/features/signature-studio/domain/teamData.js";
import {
  buildSignatureHtml, buildSignaturePlainText, createDefaultSignatureConfig
} from "../../src/features/signature-studio/domain/emailSignature.js";

test("parses commas, escaped quotes and embedded newlines in CSV", () => {
  assert.deepEqual(parseCsvRows('"name","role"\r\n"Vir, Example","Director"\r\n"Jo ""J"" Doe","Line one\nLine two"'), [
    ["name", "role"], ["Vir, Example", "Director"], ['Jo "J" Doe', "Line one\nLine two"]
  ]);
});
test("rejects incomplete quoted CSV fields", () => {
  assert.throws(() => parseCsvRows('name,email\n"Vir,vir@example.com'), /unfinished quoted field/i);
});
test("imports multiple employee profiles with aliases and a shared brand preset", () => {
  const preset = { id: "brand-main", name: "Main brand",
    config: { ...createDefaultSignatureConfig(), styleId: "monochrome", layout: "minimal", company: "Vireon" } };
  const profiles = importProfilesFromCsv(
    "employee_name,job_title,email_address,phone\nVir Example,Director,vir@example.com,+353 111 222\nAri Example,Designer,ari@example.com,+353 333 444",
    preset
  );
  assert.equal(profiles.length, 2);
  assert.equal(profiles[0].name, "Vir Example");
  assert.equal(profiles[0].config.role, "Director");
  assert.equal(profiles[1].config.email, "ari@example.com");
  assert.equal(profiles[0].config.styleId, "monochrome");
  assert.equal(profiles[0].presetId, "brand-main");
});
test("requires a name column and at least one valid employee", () => {
  assert.throws(() => importProfilesFromCsv("email,role\nvir@example.com,Director"), /name/i);
  assert.throws(() => importProfilesFromCsv("name,email\n"), /at least one employee/i);
});
test("normalizes imported teams and removes unknown properties", () => {
  const team = normalizeTeamData({
    profiles: [
      { id: "one", name: "One", config: { name: "One", email: "one@example.com", unknown: "ignored" } },
      { id: "one", name: "Two", config: { name: "Two" } }
    ],
    presets: [{ id: "brand", name: "Default", config: createDefaultSignatureConfig() }],
    unknown: "ignored"
  });
  assert.equal(team.profiles.length, 2);
  assert.notEqual(team.profiles[0].id, team.profiles[1].id);
  assert.equal("unknown" in team.profiles[0].config, false);
  assert.equal(team.presets[0].name, "Default");
});
test("creates employee profiles from a reusable preset without copying identity", () => {
  const preset = { id: "brand-1",
    config: { ...createDefaultSignatureConfig(), company: "Vireon", styleId: "obsidian", name: "Brand" } };
  const profile = createTeamProfile("New person", preset);
  assert.equal(profile.name, "New person");
  assert.equal(profile.config.name, "New person");
  assert.equal(profile.config.company, "Vireon");
  assert.equal(profile.config.styleId, "obsidian");
  assert.equal(profile.presetId, "brand-1");
});
test("exports JSON and CSV with each employee's HTML and plain-text signature", () => {
  const profiles = [{
    id: "one", name: "Vir Example", presetId: "brand-1",
    config: { ...createDefaultSignatureConfig(), name: "Vir Example", email: "vir@example.com" }
  }];
  const data = JSON.parse(exportTeamJson({ profiles, presets: [] }));
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.profiles[0].name, "Vir Example");
  const csv = exportProfilesCsv(profiles, buildSignatureHtml, buildSignaturePlainText);
  assert.match(csv, /signature_html/);
  assert.match(csv, /signature_text/);
  assert.match(csv, /mailto:vir@example\.com/);
  assert.match(csv, /Vir Example/);
});

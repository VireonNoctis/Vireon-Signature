import {
  createDefaultSignatureConfig,
  restoreSignatureConfig
} from "./emailSignature.js";

const CONFIG_KEYS = Object.keys(createDefaultSignatureConfig());

function makeId(prefix) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

function cleanName(value, fallback = "Untitled employee") {
  return String(value ?? "").trim().slice(0, 80) || fallback;
}

export function normalizeTeamData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { profiles: [], presets: [] };
  }

  const ids = new Set();
  const profiles = Array.isArray(value.profiles) ? value.profiles.slice(0, 500).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const config = restoreSignatureConfig(item.config ?? item);
    if (!config) return [];
    let id = typeof item.id === "string" ? item.id.slice(0, 80) : makeId("employee");
    if (!id || ids.has(id)) id = makeId("employee");
    ids.add(id);
    const name = cleanName(item.name || config.name);
    if (!config.name) config.name = name;
    return [{
      id,
      name,
      presetId: typeof item.presetId === "string" ? item.presetId.slice(0, 80) : "",
      config
    }];
  }) : [];

  const presetIds = new Set();
  const presets = Array.isArray(value.presets) ? value.presets.slice(0, 50).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const config = restoreSignatureConfig(item.config);
    if (!config) return [];
    let id = typeof item.id === "string" ? item.id.slice(0, 80) : makeId("brand");
    if (!id || presetIds.has(id)) id = makeId("brand");
    presetIds.add(id);
    return [{ id, name: cleanName(item.name, "Brand preset"), config }];
  }) : [];

  return { profiles, presets };
}

export function createTeamProfile(name = "", preset = null) {
  const base = createDefaultSignatureConfig();
  const config = restoreSignatureConfig({
    ...base,
    ...(preset?.config || {}),
    name
  }) || base;
  return {
    id: makeId("employee"),
    name: cleanName(name, ""),
    presetId: preset?.id || "",
    config
  };
}

export function parseCsvRows(source) {
  const text = String(source ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("The CSV file contains an unfinished quoted field.");
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function importProfilesFromCsv(source, preset = null) {
  const rows = parseCsvRows(source);
  if (rows.length < 2) throw new Error("Add a header row and at least one employee row.");

  const headers = rows[0].map(normalizeHeader);
  const aliases = new Map([
    ["employeename", "name"],
    ["fullname", "name"],
    ["jobtitle", "role"],
    ["title", "role"],
    ["emailaddress", "email"],
    ["companyname", "company"],
    ["websiteurl", "website"]
  ]);
  const indexByKey = new Map(headers.map((header, index) => [aliases.get(header) || header, index]));
  if (!indexByKey.has("name")) throw new Error("The CSV needs a name or employee_name column.");

  const profiles = rows.slice(1).map((cells) => {
    const config = { ...createDefaultSignatureConfig(), ...(preset?.config || {}) };
    for (const key of CONFIG_KEYS) {
      const cellIndex = indexByKey.get(normalizeHeader(key));
      if (cellIndex === undefined) continue;
      const raw = String(cells[cellIndex] ?? "").trim();
      if (typeof config[key] === "boolean") {
        if (raw) config[key] = !["false", "0", "no", "off"].includes(raw.toLowerCase());
      } else if (typeof config[key] === "string" && raw) {
        config[key] = raw;
      }
    }
    const restored = restoreSignatureConfig(config);
    const name = cleanName(restored.name, "");
    if (!name) return null;
    return {
      id: makeId("employee"),
      name,
      presetId: preset?.id || "",
      config: restored
    };
  }).filter(Boolean);

  if (!profiles.length) throw new Error("No employee rows with a valid name were found.");
  if (profiles.length > 500) throw new Error("A team import can contain up to 500 employees.");
  return profiles;
}

function csvCell(value) {
  const text = String(value ?? "");
  return '"' + text.replace(/"/g, '""') + '"';
}

export function exportProfilesCsv(profiles, buildHtml, buildPlainText) {
  const headers = ["profile_name", "preset_id", ...CONFIG_KEYS, "signature_html", "signature_text"];
  const rows = [headers];
  for (const profile of profiles) {
    const config = restoreSignatureConfig(profile.config);
    rows.push([
      profile.name,
      profile.presetId || "",
      ...CONFIG_KEYS.map((key) => config[key]),
      buildHtml(config),
      buildPlainText(config)
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function exportTeamJson(team) {
  return JSON.stringify({
    schemaVersion: 1,
    profiles: team.profiles || [],
    presets: team.presets || []
  }, null, 2);
}

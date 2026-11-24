import { useMemo, useRef, useState } from "react";
import ThreeAtmosphere from "./ThreeAtmosphere.jsx";
import { useSignatureExport } from "../hooks/useSignatureExport.js";
import { useTeamWorkspace } from "../hooks/useTeamWorkspace.js";
import { usePwaInstall } from "../hooks/usePwaInstall.js";
import {
  SIGNATURE_STYLES,
  buildSignatureHtml,
  buildSignaturePlainText,
  createDefaultSignatureConfig,
  normalizeImageUrl,
  normalizeWebUrl,
  restoreSignatureConfig
} from "../domain/emailSignature.js";
import {
  createTeamProfile,
  exportProfilesCsv,
  exportTeamJson,
  importProfilesFromCsv,
  normalizeTeamData
} from "../domain/teamData.js";

const GUIDE = {
  Gmail: ["Open Gmail settings.", "Go to See all settings → General → Signature.", "Create a signature and paste the copied design."],
  Outlook: ["Open Outlook settings.", "Choose Accounts → Signatures, or Mail → Compose and reply.", "Create a signature and paste the copied design."],
  "Proton Mail": ["Open Settings → Identity and addresses.", "Choose the address you want to configure.", "Paste the formatted signature and save."],
  "Apple Mail": ["Open Mail → Settings → Signatures.", "Choose the account and create a signature.", "Paste the copied design into the signature area."]
};

const FIELDS = [
  ["name", "Name", "Your name", "text"],
  ["role", "Role", "Position / title", "text"],
  ["company", "Company", "Company or studio", "text"],
  ["email", "Email", "name@company.com", "email"],
  ["phone", "Phone", "+353 00 000 0000", "tel"],
  ["website", "Website", "yourcompany.com", "url"],
  ["location", "Location", "City, country", "text"],
  ["tagline", "Short line", "A concise line about your work", "text"],
  ["logoUrl", "Logo URL", "https://…", "url"],
  ["portraitUrl", "Portrait URL", "https://…", "url"],
  ["linkedinUrl", "LinkedIn URL", "https://…", "url"],
  ["instagramUrl", "Instagram URL", "https://…", "url"],
  ["xUrl", "X URL", "https://…", "url"],
  ["ctaLabel", "Button label", "Schedule a call", "text"],
  ["ctaUrl", "Button URL", "https://…", "url"]
];

const CLIENTS = ["Gmail", "Outlook", "Apple Mail", "Proton Mail"];

function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Arrow() {
  return <span aria-hidden="true" className="arrow-mark">↗</span>;
}

function previewDocument(html, theme, client) {
  const background = theme === "dark" ? "#171717" : "#ffffff";
  const foreground = theme === "dark" ? "#e9e9e9" : "#252525";
  const title = client + " preview";
  const clientRules = {
    Gmail: "table{border-collapse:collapse}a{word-break:break-word}",
    Outlook: "table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}a{mso-line-height-rule:exactly}",
    "Apple Mail": "body{-webkit-text-size-adjust:100%;text-size-adjust:100%}img{height:auto}",
    "Proton Mail": "body{overflow-wrap:anywhere;word-break:normal}img{max-width:100%;object-fit:contain}"
  }[client] || "";
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="' + theme + '"><title>' + title + '</title><style>html,body{margin:0;min-height:100%;background:' + background + ';color:' + foreground + ';font:13px/1.6 Arial,Helvetica,sans-serif}body{padding:18px;box-sizing:border-box}main{max-width:580px;margin:0 auto;overflow-wrap:anywhere}table{max-width:100%}img{max-width:100%;height:auto}' + clientRules + '</style></head><body data-client="' + client + '"><main>' + html + '</main></body></html>';
}

export default function SignatureStudio() {
  const {
    team,
    setTeam,
    activeProfileId,
    setActiveProfileId,
    connection,
    saveState,
    reconnect
  } = useTeamWorkspace();
  const { canInstall, installed, install } = usePwaInstall();
  const [paused, setPaused] = useState(false);
  const [tab, setTab] = useState("Identity");
  const [previewTheme, setPreviewTheme] = useState("light");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [client, setClient] = useState("Gmail");
  const [insertOpen, setInsertOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [notice, setNotice] = useState({ text: "", kind: "info" });
  const [presetId, setPresetId] = useState("");
  const [presetName, setPresetName] = useState("");
  const importRef = useRef(null);

  const activeProfile = team.profiles.find((profile) => profile.id === activeProfileId) || team.profiles[0] || null;
  const config = activeProfile?.config || createDefaultSignatureConfig();
  const html = useMemo(() => buildSignatureHtml(config), [config]);
  const plain = useMemo(() => buildSignaturePlainText(config), [config]);
  const emailInvalid = Boolean(config.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email.trim()));
  const websiteInvalid = Boolean(config.website && !normalizeWebUrl(config.website));
  const imageInvalid = Boolean((config.logoUrl && !normalizeImageUrl(config.logoUrl)) || (config.portraitUrl && !normalizeImageUrl(config.portraitUrl)));
  const selectedPreset = team.presets.find((preset) => preset.id === presetId) || null;

  const { copySignature, copyHtml, exportHtml } = useSignatureExport({
    config,
    signatureHtml: html,
    plainText: plain,
    onStatus: (text, kind) => setNotice({ text, kind })
  });

  function update(key, value) {
    if (!activeProfile) return;
    setTeam((current) => ({
      ...current,
      profiles: current.profiles.map((profile) => profile.id === activeProfile.id
        ? {
            ...profile,
            name: key === "name" ? String(value).trim().slice(0, 80) : profile.name,
            config: restoreSignatureConfig({ ...profile.config, [key]: value })
          }
        : profile)
    }));
    setNotice({ text: "", kind: "info" });
  }

  function addProfile() {
    if (team.profiles.length >= 500) {
      setNotice({ text: "A workspace supports up to 500 employees.", kind: "error" });
      return;
    }
    const preset = selectedPreset;
    const profile = createTeamProfile("", preset);
    setTeam((current) => ({ ...current, profiles: [...current.profiles, profile] }));
    setActiveProfileId(profile.id);
    setTab("Identity");
    setNotice({ text: "Employee profile added.", kind: "success" });
  }

  function removeProfile() {
    if (!activeProfile) return;
    const remaining = team.profiles.filter((profile) => profile.id !== activeProfile.id);
    setTeam((current) => ({ ...current, profiles: remaining }));
    setActiveProfileId(remaining[0]?.id || "");
    setNotice({ text: "Employee profile removed.", kind: "success" });
  }

  function savePreset() {
    if (team.presets.length >= 50) {
      setNotice({ text: "A workspace supports up to 50 brand presets.", kind: "error" });
      return;
    }
    if (!presetName.trim()) {
      setNotice({ text: "Enter a name for this brand preset.", kind: "error" });
      return;
    }
    const preset = {
      id: "brand-" + Date.now().toString(36),
      name: presetName.trim().slice(0, 60),
      config: {
        styleId: config.styleId,
        layout: config.layout,
        customAccent: config.customAccent,
        customBackground: config.customBackground,
        customForeground: config.customForeground,
        customMuted: config.customMuted,
        customBorder: config.customBorder
      }
    };
    setTeam((current) => ({ ...current, presets: [...current.presets, preset] }));
    setPresetId(preset.id);
    setPresetName("");
    setNotice({ text: "Brand preset saved.", kind: "success" });
  }

  function applyPreset() {
    if (!activeProfile || !selectedPreset) return;
    const nextConfig = restoreSignatureConfig({
      ...activeProfile.config,
      styleId: selectedPreset.config.styleId,
      layout: selectedPreset.config.layout,
      customAccent: selectedPreset.config.customAccent,
      customBackground: selectedPreset.config.customBackground,
      customForeground: selectedPreset.config.customForeground,
      customMuted: selectedPreset.config.customMuted,
      customBorder: selectedPreset.config.customBorder
    });
    setTeam((current) => ({
      ...current,
      profiles: current.profiles.map((profile) => profile.id === activeProfile.id
        ? { ...profile, presetId: selectedPreset.id, config: nextConfig }
        : profile)
    }));
    setNotice({ text: "Brand preset applied.", kind: "success" });
  }

  function exportJson() {
    downloadFile("vireon-signature-team.json", exportTeamJson(team), "application/json;charset=utf-8");
    setNotice({ text: "Team JSON exported.", kind: "success" });
  }

  function exportCsv() {
    const csv = exportProfilesCsv(team.profiles, buildSignatureHtml, buildSignaturePlainText);
    downloadFile("vireon-signature-team.csv", csv, "text/csv;charset=utf-8");
    setNotice({ text: "Team CSV exported with individual signatures.", kind: "success" });
  }

  function generateTeam() {
    if (!team.profiles.length) {
      setNotice({ text: "Add an employee before generating the team.", kind: "error" });
      return;
    }
    const sections = team.profiles.map((profile) => {
      const name = profile.name.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      })[character]);
      return '<section style="margin:0 0 34px;padding:0 0 24px;border-bottom:1px solid #dedede;"><h2 style="font:600 16px Arial,sans-serif;color:#222;">' + name + '</h2>' + buildSignatureHtml(profile.config) + '</section>';
    }).join("");
    const document = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vireon team signatures</title></head><body style="margin:0;padding:32px;background:#f5f5f5;">' + sections + '</body></html>';
    downloadFile("vireon-team-signatures.html", document, "text/html;charset=utf-8");
    setNotice({ text: "Individual signatures generated for " + team.profiles.length + " employees.", kind: "success" });
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const source = await file.text();
      if (file.name.toLowerCase().endsWith(".csv")) {
        const imported = importProfilesFromCsv(source, selectedPreset);
        const available = Math.max(0, 500 - team.profiles.length);
        const accepted = imported.slice(0, available);
        if (!accepted.length) throw new Error("The workspace already contains 500 employee profiles.");
        setTeam((current) => ({ ...current, profiles: [...current.profiles, ...accepted] }));
        setActiveProfileId(accepted[0]?.id || "");
        setNotice({ text: accepted.length + " employee profiles imported.", kind: "success" });
      } else {
        const restored = normalizeTeamData(JSON.parse(source));
        if (!restored.profiles.length && !restored.presets.length) throw new Error("The JSON file contains no team profiles or brand presets.");
        setTeam(restored);
        setActiveProfileId(restored.profiles[0]?.id || "");
        setPresetId(restored.presets[0]?.id || "");
        setNotice({ text: "Team JSON imported.", kind: "success" });
      }
    } catch (error) {
      setNotice({ text: error.message || "The selected file could not be imported.", kind: "error" });
    }
  }

  async function installOrSetup() {
    if (canInstall) {
      const accepted = await install();
      if (accepted) setNotice({ text: "Vireon Signature installed.", kind: "success" });
      return;
    }
    setSetupOpen((value) => !value);
  }

  function resetCurrent() {
    if (!activeProfile) return;
    const defaults = createDefaultSignatureConfig();
    setTeam((current) => ({
      ...current,
      profiles: current.profiles.map((profile) => profile.id === activeProfile.id
        ? { ...profile, name: "", presetId: "", config: defaults }
        : profile)
    }));
    setNotice({ text: "Current signature reset.", kind: "success" });
  }

  const statusText = connection === "connecting"
    ? "Connecting to workspace"
    : connection === "offline"
      ? "Workspace service offline · edits are temporary"
      : saveState === "saving"
        ? "Saving to RocksDB"
        : saveState === "error"
          ? "Save failed · reconnect"
          : "Saved to workspace";
  const tabs = ["Identity", "Contact", "Brand"];

  function renderFields(keys) {
    return FIELDS.filter(([key]) => keys.includes(key)).map(([key, label, placeholder, type]) => (
      <label className="editor-field" key={key}>
        <span>{label}</span>
        <input
          id={"signature-" + key}
          type={type}
          value={config[key]}
          placeholder={placeholder}
          maxLength={key === "tagline" ? 120 : key === "name" || key === "role" || key === "company" ? 80 : 180}
          aria-invalid={(key === "email" && emailInvalid) || (key === "website" && websiteInvalid)}
          onChange={(event) => update(key, event.target.value)}
        />
        {key === "email" && emailInvalid ? <small>Check this email address.</small> : null}
        {key === "website" && websiteInvalid ? <small>Enter a valid web address.</small> : null}
      </label>
    ));
  }

  return (
    <div className="signature-app">
      <ThreeAtmosphere paused={paused} />
      <header className="topbar">
        <a className="wordmark" href="https://vireonnoctis.github.io/" aria-label="Vireon home">
          <img src={import.meta.env.BASE_URL + "vireon-mark.svg"} alt="" />
          <span>VIREON<span className="wordmark-slash">/</span>SIGNATURE</span>
        </a>
        <nav className="topbar-actions" aria-label="Workspace actions">
          <span className={"workspace-state state-" + connection}>{statusText}</span>
          {connection === "offline" || saveState === "error"
            ? <button className="quiet-button" type="button" onClick={reconnect}>Reconnect</button>
            : null}
          <button className="motion-control" type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
            <i className={paused ? "paused" : ""} /><span>{paused ? "Resume" : "Pause scene"}</span>
          </button>
          <button className="install-top" type="button" onClick={installOrSetup} disabled={installed}>
            {installed ? "Installed" : canInstall ? "Install app" : "Setup"} <Arrow />
          </button>
        </nav>
      </header>

      <main className="page-shell">
        <section className="hero">
          <div className="hero-kicker"><i /> SIGNATURE SYSTEM <span>/ 02</span></div>
          <h1 className="hero-title"><span>One signature.</span><span>Your whole team.</span></h1>
          <div className="hero-foot"><p>One brand system. Every person, ready to send.</p><span>DESIGN / GENERATE / INSERT</span></div>
        </section>

        {connection === "offline" ? (
          <div className="service-warning" role="status">
            <span>WORKSPACE UNAVAILABLE</span>
            <p>The C++ service is not connected. Editing and exports still work in this tab, but changes will not be saved.</p>
          </div>
        ) : null}

        <section className="team-section" aria-label="Team workspace">
          <div className="section-heading"><span>01 / TEAM</span><span>{team.profiles.length} EMPLOYEE PROFILES</span></div>
          <div className="team-toolbar">
            <div className="profile-controls">
              <label htmlFor="employee-select">Employee</label>
              <select id="employee-select" value={activeProfile?.id || ""} onChange={(event) => setActiveProfileId(event.target.value)} disabled={!team.profiles.length}>
                {team.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name || "New employee"}</option>)}
              </select>
              <button className="small-button primary" type="button" onClick={addProfile}>Add employee</button>
              <button className="small-button" type="button" onClick={removeProfile} disabled={!activeProfile}>Remove</button>
            </div>
            <div className="team-actions">
              <input ref={importRef} className="visually-hidden" type="file" accept=".json,.csv,application/json,text/csv" onChange={importFile} />
              <button className="small-button" type="button" onClick={() => importRef.current?.click()}>Import JSON / CSV</button>
              <button className="small-button" type="button" onClick={exportJson}>Export JSON</button>
              <button className="small-button" type="button" onClick={exportCsv}>Export CSV</button>
              <button className="small-button primary" type="button" onClick={generateTeam}>Generate all</button>
            </div>
          </div>
          <div className="preset-row">
            <label htmlFor="brand-preset">Brand preset</label>
            <select id="brand-preset" value={presetId} onChange={(event) => setPresetId(event.target.value)}>
              <option value="">Choose a saved preset</option>
              {team.presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
            </select>
            <button className="small-button" type="button" onClick={applyPreset} disabled={!selectedPreset || !activeProfile}>Apply to employee</button>
            <input className="preset-name-input" value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="New preset name" maxLength={60} aria-label="New preset name" />
            <button className="small-button" type="button" onClick={savePreset}>Save current brand</button>
          </div>
        </section>

        <section className="workspace" aria-label="Signature designer">
          <div className="preview-column">
            <div className="section-label"><span>02 / EMAIL PREVIEW</span><span className="simulation-label">CLIENT SIMULATION</span></div>
            <div className="preview-controls">
              <div className="client-tabs" role="group" aria-label="Email client simulation">
                {CLIENTS.map((item) => (
                  <button key={item} type="button" className={client === item ? "active" : ""} aria-pressed={client === item} onClick={() => setClient(item)}>{item}</button>
                ))}
              </div>
              <div className="preview-options">
                <div className="preview-toggle" role="group" aria-label="Preview colour scheme">
                  <button type="button" className={previewTheme === "light" ? "active" : ""} onClick={() => setPreviewTheme("light")}>Light</button>
                  <button type="button" className={previewTheme === "dark" ? "active" : ""} onClick={() => setPreviewTheme("dark")}>Dark</button>
                </div>
                <button type="button" className={"device-toggle" + (mobilePreview ? " active" : "")} aria-pressed={mobilePreview} onClick={() => setMobilePreview((value) => !value)}>
                  {mobilePreview ? "Mobile 390px" : "Desktop"}
                </button>
              </div>
            </div>
            <div className={"preview-stage preview-" + previewTheme + (mobilePreview ? " is-mobile" : "")}>
              <div className="preview-meta">
                <span>{client.toUpperCase()}</span><span>{previewTheme.toUpperCase()} · {mobilePreview ? "390PX" : "1280PX"}</span>
              </div>
              <iframe
                className="preview-frame"
                title={client + " " + previewTheme + (mobilePreview ? " mobile" : " desktop") + " signature preview"}
                sandbox=""
                srcDoc={previewDocument(html, previewTheme, client)}
              />
              <div className="preview-caption"><span>{config.styleId.toUpperCase()}</span><span>STATIC EMAIL HTML</span></div>
            </div>
            <div className="export-row">
              <button className="copy-primary" type="button" onClick={copySignature}>Copy signature <Arrow /></button>
              <button className="copy-secondary" type="button" onClick={copyHtml}>HTML</button>
              <button className="copy-secondary" type="button" onClick={exportHtml}>Export</button>
            </div>
            <p className={"action-feedback " + notice.kind} role="status" aria-live="polite">{notice.text || statusText}</p>
            <p className="compatibility-note">Previews emulate common browser rendering conditions. Final inbox rendering can vary by client version and account settings.</p>
          </div>

          <aside className="editor-panel">
            <div className="editor-top"><span>03 / EMPLOYEE EDITOR</span><button type="button" onClick={resetCurrent} disabled={!activeProfile}>Reset ↺</button></div>
            <h2>{activeProfile?.name || "New employee"}</h2>
            <div className="editor-tabs" role="tablist" aria-label="Signature fields">
              {tabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}
            </div>
            {activeProfile ? (
              <>
                <div className="editor-fields">
                  {tab === "Identity" ? renderFields(["name", "role", "company"]) : null}
                  {tab === "Contact" ? renderFields(["email", "phone", "website", "location"]) : null}
                  {tab === "Brand" ? renderFields(["tagline", "logoUrl", "portraitUrl", "linkedinUrl", "instagramUrl", "xUrl", "ctaLabel", "ctaUrl"]) : null}
                </div>
                {tab === "Contact" ? <div className="editor-switches">
                  <label><input type="checkbox" checked={config.showPhone} onChange={(event) => update("showPhone", event.target.checked)} /> Phone</label>
                  <label><input type="checkbox" checked={config.showLocation} onChange={(event) => update("showLocation", event.target.checked)} /> Location</label>
                  <label><input type="checkbox" checked={config.showCompany} onChange={(event) => update("showCompany", event.target.checked)} /> Company</label>
                  <label><input type="checkbox" checked={config.showSocials} onChange={(event) => update("showSocials", event.target.checked)} /> Socials</label>
                </div> : null}
              </>
            ) : (
              <div className="empty-editor"><p>No employee selected.</p><button className="small-button primary" type="button" onClick={addProfile}>Create first profile</button></div>
            )}
            <div className="editor-foot"><i />{imageInvalid ? "Image URL must use HTTPS" : connection === "connected" ? "Changes are saved to your team workspace" : "Changes stay in this tab until the service connects"}</div>
          </aside>
        </section>

        <section className="style-section">
          <div className="layout-picker">
            <div className="section-label"><span>04 / COMPOSITION</span><span>CHOOSE A FRAME</span></div>
            <div className="layout-grid">
              {[
                ["portrait", "Portrait"],
                ["brand", "Brand mark"],
                ["minimal", "Minimal"]
              ].map(([layout, label]) => <button key={layout} type="button" aria-pressed={config.layout === layout} className={config.layout === layout ? "active" : ""} onClick={() => update("layout", layout)} disabled={!activeProfile}>{label}</button>)}
            </div>
          </div>
          <div className="section-label"><span>05 / SIGNATURE FINISH</span><span>10 STYLES + CUSTOM</span></div>
          <div className="style-grid" role="group" aria-label="Signature styles">
            {SIGNATURE_STYLES.map((style) => (
              <button key={style.id} type="button" className={"style-choice style-" + style.id + (config.styleId === style.id ? " active" : "")} aria-pressed={config.styleId === style.id} onClick={() => update("styleId", style.id)} disabled={!activeProfile}>
                <span className="style-chip-preview"><i /><i /><i /></span><span className="style-choice-name">{style.name}</span>
              </button>
            ))}
          </div>
          {config.styleId === "custom" ? (
            <div className="custom-panel">
              {[
                ["customAccent", "Accent"], ["customBackground", "Surface"], ["customForeground", "Text"], ["customMuted", "Muted"], ["customBorder", "Border"]
              ].map(([key, label]) => <label key={key} className="colour-field"><span>{label}</span><input type="color" value={config[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
            </div>
          ) : null}
        </section>

        <section className="install-section">
          <button className="install-trigger" type="button" aria-expanded={insertOpen} onClick={() => setInsertOpen((value) => !value)}>
            <span><small>06 / EMAIL SETUP</small><strong>Put each signature in your inbox.</strong></span><i>{insertOpen ? "−" : "+"}</i>
          </button>
          {insertOpen ? (
            <div className="install-content">
              <div className="client-tabs">
                {CLIENTS.map((item) => <button key={item} type="button" className={client === item ? "active" : ""} onClick={() => setClient(item)}>{item}</button>)}
              </div>
              <ol>{GUIDE[client].map((step, index) => <li key={step}><span>0{index + 1}</span>{step}</li>)}</ol>
              <button className="copy-primary" type="button" onClick={copySignature}>Copy signature <Arrow /></button>
            </div>
          ) : null}
        </section>

        {setupOpen ? (
          <section className="pwa-setup">
            <div><span>APP INSTALLATION</span><strong>Install Vireon Signature</strong></div>
            <p>{canInstall ? "Your browser supports the native installation prompt." : "Use your browser menu and choose Install app or Add to Home Screen. The option appears when the browser and device support installation."}</p>
            <button className="small-button" type="button" onClick={() => setSetupOpen(false)}>Close</button>
          </section>
        ) : null}
      </main>

      <footer className="footer"><span>VIREON / SIGNATURE</span><span>ONE BRAND. EVERY SIGNATURE.</span><a href="https://vireonnoctis.github.io/">PORTFOLIO <Arrow /></a></footer>
    </div>
  );
}

import { useMemo, useRef, useState } from "react";
import ThreeAtmosphere from "./ThreeAtmosphere.jsx";
import { useSignatureDraft } from "../hooks/useSignatureDraft.js";
import { useSignatureExport } from "../hooks/useSignatureExport.js";
import {
  SIGNATURE_STYLES,
  buildSignatureHtml,
  buildSignaturePlainText,
  getSignaturePalette,
  normalizeImageUrl,
  normalizeWebUrl
} from "../domain/emailSignature.js";

const GUIDE = {
  Gmail: ["Open Gmail settings.", "Go to See all settings → General → Signature.", "Create a signature, paste the copied design, then save changes."],
  Outlook: ["Open Outlook settings.", "Choose Accounts → Signatures, or Mail → Compose and reply.", "Create a signature and paste the copied design."],
  "Proton Mail": ["Open Settings → Identity and addresses.", "Choose the address you want to configure.", "Paste the formatted signature into the signature field and save."],
  "Apple Mail": ["Open Mail → Settings → Signatures.", "Choose the account and create a signature.", "Paste the copied design into the signature area."],
  Thunderbird: ["Open Account Settings.", "Find the Signature Text section.", "Enable HTML signature and paste the exported HTML."],
  Cloudflare: ["Email Routing forwards incoming messages; it does not manage an outgoing composer.", "For Email Service, open the sending application or Worker.", "Include the exported HTML in the outgoing message's HTML body."]
};

const fields = [
  ["name", "Name", "Your name", "text"],
  ["role", "Role", "Position / title", "text"],
  ["company", "Company", "Company or studio", "text"],
  ["email", "Email", "name@company.com", "email"],
  ["phone", "Phone", "+353 00 000 0000", "tel"],
  ["website", "Website", "yourcompany.com", "url"],
  ["location", "Location", "Dublin, Ireland", "text"],
  ["tagline", "Short line", "A concise line about your work", "text"],
  ["logoUrl", "Logo URL", "https://…", "url"],
  ["portraitUrl", "Portrait URL", "https://…", "url"]
];

function Arrow() {
  return <span className="arrow-mark" aria-hidden="true">↗</span>;
}

function StyleChoice({ style, active, onClick }) {
  return (
    <button type="button" className={"style-choice style-" + style.id + (active ? " active" : "")}
      aria-pressed={active} onClick={onClick}>
      <span className="style-chip-preview"><i /><i /><i /></span>
      <span className="style-choice-name">{style.name}</span>
    </button>
  );
}

function SignatureSheet({ config, palette, html }) {
  return (
    <div className={"signature-sheet sheet-" + config.styleId} style={{
      "--sheet-bg": palette.background,
      "--sheet-fg": palette.foreground,
      "--sheet-muted": palette.muted,
      "--sheet-accent": palette.accent,
      "--sheet-border": palette.border
    }}>
      <div className="sheet-glow" />
      <div className="sheet-content" dangerouslySetInnerHTML={{ __html: html }} />
      <span className="sheet-corner sheet-corner-a" />
      <span className="sheet-corner sheet-corner-b" />
    </div>
  );
}

export default function SignatureStudio() {
  const { config, setConfig, saveStatus, resetDraft } = useSignatureDraft();
  const [paused, setPaused] = useState(false);
  const [tab, setTab] = useState("Identity");
  const [previewMode, setPreviewMode] = useState("light");
  const [installOpen, setInstallOpen] = useState(false);
  const [client, setClient] = useState("Gmail");
  const [notice, setNotice] = useState({ text: "", kind: "info" });
  const installRef = useRef(null);

  const palette = useMemo(() => getSignaturePalette(config), [config]);
  const html = useMemo(() => buildSignatureHtml(config), [config]);
  const plain = useMemo(() => buildSignaturePlainText(config), [config]);
  const emailInvalid = Boolean(config.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email.trim()));
  const websiteInvalid = Boolean(config.website && !normalizeWebUrl(config.website));
  const badImage = (config.logoUrl && !normalizeImageUrl(config.logoUrl)) || (config.portraitUrl && !normalizeImageUrl(config.portraitUrl));

  const { copySignature, copyHtml, exportHtml } = useSignatureExport({
    config,
    signatureHtml: html,
    plainText: plain,
    onStatus: (text, kind) => setNotice({ text, kind })
  });

  function update(key, value) {
    setConfig((current) => ({ ...current, [key]: value }));
    setNotice({ text: "", kind: "info" });
  }

  function scrollToInstall() {
    setInstallOpen((value) => !value);
    window.setTimeout(() => installRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
  }

  function reset() {
    resetDraft();
    setNotice({ text: "Signature reset.", kind: "success" });
  }

  function renderFields(keys) {
    return fields.filter(([key]) => keys.includes(key)).map(([key, label, placeholder, type]) => (
      <label className="editor-field" key={key}>
        <span>{label}</span>
        <input id={"signature-" + key} type={type} value={config[key]} placeholder={placeholder}
          maxLength={key === "tagline" ? 120 : 180}
          aria-invalid={(key === "email" && emailInvalid) || (key === "website" && websiteInvalid)}
          onChange={(event) => update(key, event.target.value)} />
        {key === "email" && emailInvalid ? <small>Check this email address.</small> : null}
        {key === "website" && websiteInvalid ? <small>Enter a valid web address.</small> : null}
      </label>
    ));
  }

  const styleName = SIGNATURE_STYLES.find((item) => item.id === config.styleId)?.name || "Liquid Glass";
  const tabs = ["Identity", "Contact", "Brand"];

  return (
    <div className="signature-app">
      <ThreeAtmosphere paused={paused} />
      <header className="topbar">
        <a className="wordmark" href="https://vireonnoctis.github.io/" aria-label="Vireon home">
          <img src={import.meta.env.BASE_URL + "vireon-mark.svg"} alt="" />
          <span>VIREON<span className="wordmark-slash">/</span>SIGNATURE</span>
        </a>
        <nav className="topbar-actions">
          <button className="motion-control" type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
            <i className={paused ? "paused" : ""} /><span>{paused ? "Resume" : "Pause"}</span>
          </button>
          <button className="install-top" type="button" onClick={scrollToInstall}>Install <Arrow /></button>
        </nav>
      </header>

      <main className="page-shell">
        <section className="hero">
          <div className="hero-kicker"><i /> SIGNATURE SYSTEM <span>/ 01</span></div>
          <h1 className="hero-title"><span>One signature.</span><span>Your whole team.</span></h1>
          <div className="hero-foot"><p>Shape it once. Send it everywhere.</p><span>DESIGN / PREVIEW / INSERT</span></div>
        </section>

        <section className="workspace" aria-label="Signature designer">
          <div className="preview-column">
            <div className="section-label"><span>01 / LIVE PREVIEW</span>
              <div className="preview-toggle" role="group" aria-label="Preview surface">
                <button type="button" className={previewMode === "light" ? "active" : ""} onClick={() => setPreviewMode("light")}>Light</button>
                <button type="button" className={previewMode === "dark" ? "active" : ""} onClick={() => setPreviewMode("dark")}>Dark</button>
              </div>
            </div>
            <div className={"preview-stage preview-" + previewMode}>
              <div className="mail-meta"><span>TO</span> someone@example.com <i /> <span>SUBJECT</span> A quick introduction</div>
              <div className="mail-copy">Hello,<br /><br />Looking forward to connecting.</div>
              <SignatureSheet config={config} palette={palette} html={html} />
              <div className="preview-caption"><span>{styleName.toUpperCase()}</span><span>LIVE HTML</span></div>
            </div>
            <div className="export-row">
              <button className="copy-primary" type="button" onClick={copySignature}>Copy signature <Arrow /></button>
              <button className="copy-secondary" type="button" onClick={copyHtml}>HTML</button>
              <button className="copy-secondary" type="button" onClick={exportHtml}>Export</button>
            </div>
            <p className={"action-feedback " + notice.kind} role="status" aria-live="polite">{notice.text || saveStatus}</p>
          </div>

          <aside className="editor-panel">
            <div className="editor-top"><span>02 / EDITOR</span><button type="button" onClick={reset}>Reset ↺</button></div>
            <h2>Make it yours.</h2>
            <div className="editor-tabs" role="tablist" aria-label="Signature fields">
              {tabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item}
                className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}
            </div>
            <div className="editor-fields">
              {tab === "Identity" ? renderFields(["name", "role", "company"]) : null}
              {tab === "Contact" ? renderFields(["email", "phone", "website", "location"]) : null}
              {tab === "Brand" ? renderFields(["tagline", "logoUrl", "portraitUrl"]) : null}
            </div>
            {tab === "Contact" ? <div className="editor-switches">
              <label><input type="checkbox" checked={config.showPhone} onChange={(event) => update("showPhone", event.target.checked)} /> Phone</label>
              <label><input type="checkbox" checked={config.showLocation} onChange={(event) => update("showLocation", event.target.checked)} /> Location</label>
              <label><input type="checkbox" checked={config.showCompany} onChange={(event) => update("showCompany", event.target.checked)} /> Company</label>
              <label><input type="checkbox" checked={config.showSocials} onChange={(event) => update("showSocials", event.target.checked)} /> Socials</label>
            </div> : null}
            {tab === "Brand" ? <div className="editor-fields editor-fields-extra">
              {[
                ["linkedinUrl", "LinkedIn URL"], ["instagramUrl", "Instagram URL"], ["xUrl", "X URL"], ["ctaLabel", "Button label"], ["ctaUrl", "Button URL"]
              ].map(([key, label]) => <label className="editor-field" key={key}><span>{label}</span><input value={config[key]} onChange={(event) => update(key, event.target.value)} placeholder={key.includes("Url") ? "https://…" : "Schedule a call"} /></label>)}
            </div> : null}
            <div className="editor-foot"><i />{badImage ? "Image URL must be public HTTPS" : "Saved in this browser only"}</div>
          </aside>
        </section>

        <section className="style-section">
          <div className="layout-picker">
            <div className="section-label"><span>03 / COMPOSITION</span><span>CHOOSE A FRAME</span></div>
            <div className="layout-grid">
              {[
                ["portrait", "Portrait"],
                ["brand", "Brand mark"],
                ["minimal", "Minimal"]
              ].map(([layout, label]) => <button key={layout} type="button" aria-pressed={config.layout === layout}
                className={config.layout === layout ? "active" : ""} onClick={() => update("layout", layout)}>{label}</button>)}
            </div>
          </div>
          <div className="section-label"><span>04 / SIGNATURE FINISH</span><span>10 STYLES + CUSTOM</span></div>
          <div className="style-grid" role="group" aria-label="Signature styles">
            {SIGNATURE_STYLES.map((style) => <StyleChoice key={style.id} style={style} active={config.styleId === style.id}
              onClick={() => update("styleId", style.id)} />)}
          </div>
          {config.styleId === "custom" ? <div className="custom-panel">
            {[
              ["customAccent", "Accent"], ["customBackground", "Surface"], ["customForeground", "Text"], ["customMuted", "Muted"], ["customBorder", "Border"]
            ].map(([key, label]) => <label key={key} className="colour-field"><span>{label}</span><input type="color" value={config[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
          </div> : null}
        </section>

        <section className="install-section" ref={installRef}>
          <button className="install-trigger" type="button" aria-expanded={installOpen} onClick={() => setInstallOpen((value) => !value)}>
            <span><small>05 / INSERTION</small><strong>Put it in your inbox.</strong></span><i>{installOpen ? "−" : "+"}</i>
          </button>
          {installOpen ? <div className="install-content">
            <div className="client-picker" role="tablist" aria-label="Email client">
              {Object.keys(GUIDE).map((item) => <button key={item} type="button" role="tab" aria-selected={client === item}
                className={client === item ? "active" : ""} onClick={() => setClient(item)}>{item}</button>)}
            </div>
            <ol>{GUIDE[client].map((step, index) => <li key={step}><span>0{index + 1}</span>{step}</li>)}</ol>
            <button className="copy-primary install-copy" type="button" onClick={copySignature}>Copy signature <Arrow /></button>
          </div> : null}
        </section>
      </main>

      <footer className="footer"><span>VIREON / SIGNATURE</span><span>DESIGNED TO SIGN OFF.</span><a href="https://vireonnoctis.github.io/">PORTFOLIO ↗</a></footer>
    </div>
  );
}

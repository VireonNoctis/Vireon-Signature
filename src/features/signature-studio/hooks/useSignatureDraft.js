import { useEffect, useState } from "react";
import { createDefaultSignatureConfig, restoreSignatureConfig } from "../domain/emailSignature.js";

const STORAGE_KEY = "vireon.signature.studio.v3";

export function useSignatureDraft() {
  const [config, setConfig] = useState(createDefaultSignatureConfig);
  const [saveStatus, setSaveStatus] = useState("Local draft");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const restored = restoreSignatureConfig(JSON.parse(saved));
        if (restored) {
          setConfig(restored);
          setSaveStatus("Draft restored");
        }
      }
    } catch {
      setSaveStatus("Local storage unavailable");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setSaveStatus("Saved locally");
    } catch {
      setSaveStatus("Local storage unavailable");
    }
  }, [config, hydrated]);

  function resetDraft() {
    const defaults = createDefaultSignatureConfig();
    setConfig(defaults);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      setSaveStatus("Draft reset");
    } catch {
      setSaveStatus("Reset for this session");
    }
  }

  return { config, setConfig, saveStatus, resetDraft };
}

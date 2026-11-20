import { useCallback } from "react";
import { buildSignatureDocument } from "../domain/emailSignature.js";

export function useSignatureExport({ config, signatureHtml, plainText, onStatus }) {
  const validate = useCallback(() => {
    if (!config.name.trim()) {
      onStatus("Add a name before copying.", "error");
      document.getElementById("signature-name")?.focus();
      return false;
    }
    if (config.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email.trim())) {
      onStatus("Check the email address.", "error");
      document.getElementById("signature-email")?.focus();
      return false;
    }
    return true;
  }, [config, onStatus]);

  const fallbackCopy = useCallback((text) => {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    document.body.append(field);
    field.select();
    let copied = false;
    try { copied = document.execCommand("copy"); } catch { copied = false; }
    field.remove();
    return copied;
  }, []);

  const copySignature = useCallback(async () => {
    if (!validate()) return;
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([signatureHtml], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" })
        })]);
      } else if (!fallbackCopy(plainText)) {
        throw new Error("Clipboard unavailable");
      }
      onStatus("Signature copied.", "success");
    } catch {
      onStatus("Rich copy was blocked. Try HTML export.", "error");
    }
  }, [fallbackCopy, onStatus, plainText, signatureHtml, validate]);

  const copyHtml = useCallback(async () => {
    if (!validate()) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(signatureHtml);
      else if (!fallbackCopy(signatureHtml)) throw new Error("Clipboard unavailable");
      onStatus("HTML copied.", "success");
    } catch {
      onStatus("Clipboard was blocked. Use Export.", "error");
    }
  }, [fallbackCopy, onStatus, signatureHtml, validate]);

  const exportHtml = useCallback(() => {
    if (!validate()) return;
    const url = URL.createObjectURL(new Blob([buildSignatureDocument(config)], { type: "text/html;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "vireon-signature.html";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    onStatus("HTML exported.", "success");
  }, [config, onStatus, validate]);

  return { copySignature, copyHtml, exportHtml };
}

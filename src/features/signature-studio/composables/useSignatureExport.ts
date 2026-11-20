import { ref, type ComputedRef, type Ref } from "vue";
import {
  buildSignatureDocument,
  type SignatureConfig
} from "../domain/emailSignature";

type EditorTab = "identity" | "design" | "details";
type ActionKind = "success" | "error" | "info";

interface SignatureExportOptions {
  form: SignatureConfig;
  activeTab: Ref<EditorTab>;
  signatureHtml: ComputedRef<string>;
  plainText: ComputedRef<string>;
  hasName: ComputedRef<boolean>;
  emailInvalid: ComputedRef<boolean>;
}

export function useSignatureExport(options: SignatureExportOptions) {
  const actionStatus = ref("");
  const actionKind = ref<ActionKind>("info");

  function validateBeforeCopy(): boolean {
    if (!options.hasName.value) {
      actionStatus.value = "Add your name in Identity before copying your signature.";
      actionKind.value = "error";
      options.activeTab.value = "identity";
      document.getElementById("signature-name")?.focus();
      return false;
    }
    if (options.emailInvalid.value) {
      actionStatus.value = "Check the email address format before copying.";
      actionKind.value = "error";
      options.activeTab.value = "details";
      document.getElementById("signature-email")?.focus();
      return false;
    }
    return true;
  }

  function fallbackCopy(text: string): boolean {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.append(textarea);
    textarea.select();
    let copied = false;
    try { copied = document.execCommand("copy"); } catch { copied = false; }
    textarea.remove();
    return copied;
  }

  function fallbackCopyRich(html: string): boolean {
    const container = document.createElement("div");
    container.contentEditable = "true";
    container.setAttribute("aria-hidden", "true");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "560px";
    container.innerHTML = html;
    document.body.append(container);
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(container);
    selection?.removeAllRanges();
    selection?.addRange(range);
    let copied = false;
    try { copied = document.execCommand("copy"); } catch { copied = false; }
    selection?.removeAllRanges();
    container.remove();
    return copied;
  }

  async function copySignature() {
    if (!validateBeforeCopy()) return;
    actionStatus.value = "";
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        const item = new ClipboardItem({
          "text/html": new Blob([options.signatureHtml.value], { type: "text/html" }),
          "text/plain": new Blob([options.plainText.value], { type: "text/plain" })
        });
        await navigator.clipboard.write([item]);
      } else if (!fallbackCopyRich(options.signatureHtml.value)) {
        throw new Error("Rich clipboard access is unavailable.");
      }
      actionStatus.value = "Signature copied. Paste it into your email signature settings.";
      actionKind.value = "success";
    } catch {
      actionStatus.value = "This browser blocked rich copying. Use Copy HTML or select the preview and copy it manually.";
      actionKind.value = "error";
    }
  }

  async function copyHtml() {
    if (!validateBeforeCopy()) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(options.signatureHtml.value);
      } else if (!fallbackCopy(options.signatureHtml.value)) {
        throw new Error("Clipboard access is unavailable.");
      }
      actionStatus.value = "Email-safe HTML copied.";
      actionKind.value = "success";
    } catch {
      actionStatus.value = "The browser blocked clipboard access. Use Export HTML instead.";
      actionKind.value = "error";
    }
  }

  function exportHtml() {
    if (!validateBeforeCopy()) return;
    const file = new Blob([buildSignatureDocument(options.form)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "email-signature.html";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    actionStatus.value = "HTML file exported.";
    actionKind.value = "success";
  }

  return { actionStatus, actionKind, copySignature, copyHtml, exportHtml };
}

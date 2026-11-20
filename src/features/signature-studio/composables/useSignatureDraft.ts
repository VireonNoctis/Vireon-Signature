import { onMounted, reactive, ref, watch } from "vue";
import {
  createDefaultSignatureConfig,
  restoreSignatureConfig,
  type SignatureConfig
} from "../domain/emailSignature";

const STORAGE_KEY = "vireon.signature-studio.v1";

export function useSignatureDraft() {
  const form = reactive<SignatureConfig>(createDefaultSignatureConfig());
  const saveStatus = ref("Saved only on this device");
  let isRestoring = true;

  function restoreDraft() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const restored = restoreSignatureConfig(JSON.parse(stored) as unknown);
      if (!restored) {
        saveStatus.value = "Saved draft could not be read";
        return;
      }
      Object.assign(form, restored);
      saveStatus.value = "Draft restored from this device";
    } catch {
      saveStatus.value = "Local draft unavailable";
    }
  }

  watch(form, () => {
    if (isRestoring) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      saveStatus.value = "Saved on this device";
    } catch {
      saveStatus.value = "Local storage is unavailable";
    }
  }, { deep: true });

  onMounted(() => {
    restoreDraft();
    isRestoring = false;
  });

  function resetDraft() {
    Object.assign(form, createDefaultSignatureConfig());
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      saveStatus.value = "Draft reset";
    } catch {
      saveStatus.value = "Draft reset for this session";
    }
  }

  return { form, saveStatus, resetDraft };
}

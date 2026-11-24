import { useEffect, useState } from "react";

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
    setInstalled(Boolean(standalone));

    function capturePrompt(event) {
      event.preventDefault();
      setPromptEvent(event);
    }

    function markInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(import.meta.env.BASE_URL + "service-worker.js").catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    return choice?.outcome === "accepted";
  }

  return { canInstall: Boolean(promptEvent), installed, install };
}

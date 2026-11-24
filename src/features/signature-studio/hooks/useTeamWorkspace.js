import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeTeamData } from "../domain/teamData.js";

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

function mergeRecords(remote, local, limit) {
  const merged = new Map(remote.map((item) => [item.id, item]));
  for (const item of local) merged.set(item.id, item);
  return [...merged.values()].slice(-limit);
}

function readCookie(name) {
  const prefix = name + "=";
  const entry = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : "";
}

async function requestJson(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = await response.json().catch(() => null);
  if (!response.ok || !contentType.toLowerCase().includes("application/json") || !payload || typeof payload !== "object") {
    const error = new Error(payload?.error || "The workspace service returned an invalid response.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function useTeamWorkspace() {
  const [team, setTeamState] = useState({ profiles: [], presets: [] });
  const userChanged = useRef(false);
  const hasConnectedBefore = useRef(false);
  const setTeam = useCallback((updater) => {
    userChanged.current = true;
    setTeamState(updater);
  }, []);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [connection, setConnection] = useState("connecting");
  const [saveState, setSaveState] = useState("saved");
  const [retryCount, setRetryCount] = useState(0);
  const ready = useRef(false);
  const lastSaved = useRef("");
  const latestTeam = useRef(team);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => { latestTeam.current = team; }, [team]);

  useEffect(() => {
    let current = true;
    ready.current = false;
    setConnection("connecting");

    async function load() {
      try {
        await requestJson("/api/session");
        const payload = await requestJson("/api/team");
        if (!current) return;
        const restored = normalizeTeamData(payload);
        lastSaved.current = JSON.stringify(restored);
        if (!userChanged.current) {
          setTeamState(restored);
          setActiveProfileId((current) => restored.profiles.some((profile) => profile.id === current)
            ? current
            : restored.profiles[0]?.id || "");
        } else if (!hasConnectedBefore.current) {
          setTeamState((current) => ({
            profiles: mergeRecords(restored.profiles, current.profiles, 500),
            presets: mergeRecords(restored.presets, current.presets, 50)
          }));
          setActiveProfileId((current) => current || restored.profiles[0]?.id || "");
        }
        hasConnectedBefore.current = true;
        ready.current = true;
        setConnection("connected");
        setSaveState("saved");
      } catch {
        if (!current) return;
        ready.current = true;
        setConnection("offline");
        setSaveState("offline");
      }
    }

    load();
    return () => { current = false; };
  }, [retryCount]);

  useEffect(() => {
    if (!ready.current || connection !== "connected") return;
    const snapshot = JSON.stringify(team);
    if (snapshot === lastSaved.current) return;

    setSaveState("saving");
    const timeout = window.setTimeout(async () => {
      saveQueue.current = saveQueue.current.catch(() => {}).then(async () => {
        if (snapshot === lastSaved.current) return;
        const csrfToken = readCookie("vireon_signature_csrf");
        if (!csrfToken) throw new Error("The workspace cookie is missing. Refresh to reconnect.");
        await requestJson("/api/team", {
          method: "PUT",
          headers: { "X-CSRF-Token": csrfToken },
          body: snapshot
        });
        lastSaved.current = snapshot;
        if (JSON.stringify(latestTeam.current) === snapshot) setSaveState("saved");
      }).catch(() => {
        if (JSON.stringify(latestTeam.current) === snapshot) setSaveState("error");
      });
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [team, connection]);

  const reconnect = useCallback(() => setRetryCount((count) => count + 1), []);

  return {
    team,
    setTeam,
    activeProfileId,
    setActiveProfileId,
    connection,
    saveState,
    reconnect
  };
}

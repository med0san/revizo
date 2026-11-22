import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "./secure";
import type { SessionHandle } from "@blockshub/pawnote-lts";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { clearAuth, readAuth, resume } from "./pronote/auth";
import { setDone, syncAll } from "./pronote/sync";
import { AppData, Exam, Settings } from "./types";
import { EXAM_RE, uuid } from "./utils";

const DATA_KEY = "revizo.data.v1";
const SETTINGS_KEY = "revizo.settings.v1";
const AI_CACHE_KEY = "revizo.ai.v1";
const API_KEY = "revizo.anthropic.key";

export const DEFAULT_SETTINGS: Settings = {
  model: "claude-sonnet-5-5",
  target: 12,
  coefs: {},
  manualExams: [],
  doneLocal: {},
};

type Ctx = {
  ready: boolean;
  loggedIn: boolean;
  data: AppData | null;
  settings: Settings;
  apiKey: string;
  syncing: boolean;
  syncError: string | null;
  sync: () => Promise<void>;
  onLoggedIn: (s: SessionHandle) => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (p: Partial<Settings>) => void;
  setApiKey: (k: string) => Promise<void>;
  toggleDone: (id: string) => void;
  isDone: (id: string, pronoteDone: boolean) => boolean;
  exams: Exam[];
  aiCache: Record<string, string>;
  putAi: (key: string, value: string) => void;
};

const C = createContext<Ctx>(null as any);
export const useApp = () => useContext(C);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [data, setData] = useState<AppData | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [apiKey, setKey] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [aiCache, setAiCache] = useState<Record<string, string>>({});
  const session = useRef<SessionHandle | null>(null);
  const syncingRef = useRef(false);

  const applySession = useCallback(async (s: SessionHandle) => {
    session.current = s;
    const { data: d, errors } = await syncAll(s);
    setData(d);
    await AsyncStorage.setItem(DATA_KEY, JSON.stringify(d));
    setSyncError(errors.length ? `Certaines données n'ont pas pu être chargées :\n${errors.join("\n")}` : null);
  }, []);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const s = await resume();
      await applySession(s);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg === "NO_AUTH") setLoggedIn(false);
      else if (/BadCredentials|challenge|expired|jeton|token/i.test(msg + (e?.name ?? ""))) {
        setSyncError("Ta session Pronote a expiré. Reconnecte-toi depuis les Réglages.");
      } else setSyncError(`Synchronisation impossible (${msg}). Affichage des dernières données enregistrées.`);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [applySession]);

  useEffect(() => {
    (async () => {
      const [d, st, ai, auth, key] = await Promise.all([
        AsyncStorage.getItem(DATA_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
        AsyncStorage.getItem(AI_CACHE_KEY),
        readAuth(),
        SecureStore.getItemAsync(API_KEY).catch(() => null),
      ]);
      if (d) setData(JSON.parse(d));
      if (st) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(st) });
      if (ai) setAiCache(JSON.parse(ai));
      if (key) setKey(key);
      setLoggedIn(!!auth);
      setReady(true);
      if (auth) sync(); // synchro à chaque ouverture
    })();
  }, [sync]);

  // Resynchronise quand on revient dans l'app après 15 min
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active" || !loggedIn) return;
      const last = data?.syncedAt ? new Date(data.syncedAt).getTime() : 0;
      if (Date.now() - last > 15 * 60 * 1000) sync();
    });
    return () => sub.remove();
  }, [loggedIn, data?.syncedAt, sync]);

  const onLoggedIn = useCallback(async (s: SessionHandle) => {
    setLoggedIn(true);
    setSyncing(true);
    try {
      await applySession(s);
    } finally {
      setSyncing(false);
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    await clearAuth();
    await AsyncStorage.multiRemove([DATA_KEY]);
    session.current = null;
    setData(null);
    setLoggedIn(false);
  }, []);

  const updateSettings = useCallback((p: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...p };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setApiKey = useCallback(async (k: string) => {
    const v = k.trim();
    if (v) await SecureStore.setItemAsync(API_KEY, v);
    else await SecureStore.deleteItemAsync(API_KEY);
    setKey(v);
  }, []);

  const isDone = useCallback(
    (id: string, pronoteDone: boolean) => (id in settings.doneLocal ? settings.doneLocal[id] : pronoteDone),
    [settings.doneLocal]
  );

  const toggleDone = useCallback((id: string) => {
    const hw = data?.homework.find((h) => h.id === id);
    const current = id in settings.doneLocal ? settings.doneLocal[id] : !!hw?.done;
    updateSettings({ doneLocal: { ...settings.doneLocal, [id]: !current } });
    setDone(session.current, id, !current);
  }, [data, settings.doneLocal, updateSettings]);

  const putAi = useCallback((key: string, value: string) => {
    setAiCache((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(AI_CACHE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Contrôles détectés automatiquement + ajoutés à la main
  const exams: Exam[] = React.useMemo(() => {
    const now = Date.now() - 86400000;
    const list: Exam[] = [];
    data?.lessons.forEach((l) => {
      if (l.test && !l.canceled && new Date(l.start).getTime() > now)
        list.push({ id: `l-${l.id}`, subject: l.subject, date: l.start, title: `Évaluation en ${l.subject}`, source: "pronote" });
    });
    data?.homework.forEach((h) => {
      if (EXAM_RE.test(h.text) && new Date(h.deadline).getTime() > now)
        list.push({ id: `h-${h.id}`, subject: h.subject, date: h.deadline, title: h.text.split("\n")[0].slice(0, 90), source: "pronote" });
    });
    settings.manualExams.forEach((e) => new Date(e.date).getTime() > now && list.push(e));
    // dédoublonne même matière + même jour
    const seen = new Set<string>();
    return list
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((e) => {
        const k = e.subject + e.date.slice(0, 10);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  }, [data, settings.manualExams]);

  return (
    <C.Provider
      value={{
        ready, loggedIn, data, settings, apiKey, syncing, syncError, sync, onLoggedIn, logout,
        updateSettings, setApiKey, toggleDone, isDone, exams, aiCache, putAi,
      }}
    >
      {children}
    </C.Provider>
  );
}

export const newExamId = () => `m-${uuid()}`;

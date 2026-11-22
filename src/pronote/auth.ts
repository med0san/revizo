import * as SecureStore from "../secure";
import {
  AccountKind,
  createSessionHandle,
  finishLoginManually,
  loginCredentials,
  loginQrCode,
  loginToken,
  DoubleAuthMode,
  RefreshInformation,
  SecurityError,
  securitySave,
  securitySource,
  SessionHandle,
} from "@blockshub/pawnote-lts";
import type { Fetcher } from "@literate.ink/utilities";
import { uuid } from "../utils";

const KEY = "revizo.auth.v1";

export type StoredAuth = {
  method: "token" | "demo";
  url: string;
  username: string;
  token: string; // jeton Pronote (ou mot de passe du compte démo public)
  kind: number;
  deviceUUID: string;
  navigatorIdentifier?: string;
};

export const DEMO = {
  url: "https://demo.index-education.net/pronote",
  username: "demonstration",
  password: "pronotevs",
};

// Pronote vérifie le user-agent ; on se présente comme l'appli mobile officielle.
// Android n'a pas de timeout réseau par défaut : on en ajoute un.
export const fetcher: Fetcher = async (options) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 45000);
  try {
    // Web : le navigateur ne peut pas appeler Pronote directement (CORS) ni changer le user-agent.
    // Netlify relaie /pronote/* et /demo/* vers les vrais serveurs (voir netlify.toml).
    let target = String(options.url);
    const web = typeof document !== "undefined" && typeof location !== "undefined" && location.origin.startsWith("http");
    if (web) {
      target = target
        .replace(/^https:\/\/0931584s\.index-education\.net\/pronote/i, location.origin + "/pronote")
        .replace(/^https:\/\/demo\.index-education\.net\/pronote/i, location.origin + "/demo");
    }
    const res = await fetch(target, {
      method: options.method,
      headers: web
        ? { ...options.headers }
        : {
            ...options.headers,
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 PRONOTE Mobile APP Version/2.0.11",
          },
      body: options.method !== "GET" ? (options.content as any) : undefined,
      redirect: options.redirect as any,
      signal: controller.signal,
    });
    const content = await res.text();
    return {
      content,
      status: res.status,
      get headers() {
        return res.headers;
      },
    };
  } finally {
    clearTimeout(t);
  }
};

export async function readAuth(): Promise<StoredAuth | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveAuth(a: StoredAuth) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(a));
}

export async function clearAuth() {
  await SecureStore.deleteItemAsync(KEY);
}

export function newDeviceUUID() {
  return uuid();
}

async function persistRefresh(r: RefreshInformation, deviceUUID: string) {
  await saveAuth({
    method: "token",
    url: r.url,
    username: r.username,
    token: r.token,
    kind: r.kind,
    deviceUUID,
    navigatorIdentifier: r.navigatorIdentifier,
  });
}

/** Gère la double authentification simple (notification) ; sinon remonte une erreur claire. */
async function handleSecurity(session: SessionHandle, e: unknown): Promise<RefreshInformation> {
  if (e instanceof SecurityError) {
    const h: any = e.handle;
    if (h.shouldEnterSource && !h.shouldEnterPIN && !h.shouldCustomPassword && !h.shouldCustomDoubleAuth) {
      await securitySource(session, "Revizo");
      await securitySave(session, e.handle, { mode: DoubleAuthMode.MGDA_NotificationSeulement, deviceName: "Revizo" } as any);
      const c = h.context;
      return finishLoginManually(session, c.authentication, c.identity, c.initialUsername);
    }
    throw new Error(
      "Ton compte demande une double authentification (code PIN). Utilise plutôt la connexion par QR code."
    );
  }
  throw e;
}

/** Connexion après la page monlycee.net : login + jeton fournis par Pronote mobile. */
export async function loginFromENT(url: string, username: string, token: string, deviceUUID: string) {
  const session = createSessionHandle(fetcher);
  let r: RefreshInformation;
  try {
    r = await loginToken(session, { url, kind: AccountKind.STUDENT, username, token, deviceUUID });
  } catch (e) {
    r = await handleSecurity(session, e);
  }
  await persistRefresh(r, deviceUUID);
  return session;
}

export async function loginWithQr(qr: any, pin: string) {
  const deviceUUID = uuid();
  const session = createSessionHandle(fetcher);
  let r: RefreshInformation;
  try {
    r = await loginQrCode(session, { deviceUUID, pin, qr });
  } catch (e) {
    r = await handleSecurity(session, e);
  }
  await persistRefresh(r, deviceUUID);
  return session;
}

export async function loginDirect(url: string, username: string, password: string) {
  const deviceUUID = uuid();
  const session = createSessionHandle(fetcher);
  const isDemo = url.includes("demo.index-education.net");
  let r: RefreshInformation;
  try {
    r = await loginCredentials(session, { url, kind: AccountKind.STUDENT, username, password, deviceUUID });
  } catch (e) {
    r = await handleSecurity(session, e);
  }
  if (isDemo) {
    // Le serveur de démonstration n'accepte pas les jetons : on garde ses identifiants publics.
    await saveAuth({ method: "demo", url, username, token: password, kind: AccountKind.STUDENT, deviceUUID });
  } else {
    await persistRefresh(r, deviceUUID);
  }
  return session;
}

/** Reconnexion silencieuse à chaque ouverture. Le jeton change à chaque fois : on le resauvegarde. */
export async function resume(): Promise<SessionHandle> {
  const a = await readAuth();
  if (!a) throw new Error("NO_AUTH");
  const session = createSessionHandle(fetcher);
  if (a.method === "demo") {
    await loginCredentials(session, {
      url: a.url, kind: a.kind as any, username: a.username, password: a.token, deviceUUID: a.deviceUUID,
    });
    return session;
  }
  let r: RefreshInformation;
  try {
    r = await loginToken(session, {
      url: a.url, kind: a.kind as any, username: a.username, token: a.token,
      deviceUUID: a.deviceUUID, navigatorIdentifier: a.navigatorIdentifier,
    } as any);
  } catch (e) {
    r = await handleSecurity(session, e);
  }
  await persistRefresh(r, a.deviceUUID);
  return session;
}

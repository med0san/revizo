import { cleanURL } from "@blockshub/pawnote-lts";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View,
} from "react-native";
import WebViewBase from "react-native-webview";
const WebView: any = WebViewBase;
import { DEMO, loginDirect, loginFromENT, loginWithQr, newDeviceUUID } from "../pronote/auth";
import { useApp } from "../store";
import { useTheme } from "../theme";
import { Btn, Card, Sub } from "../ui";

type Mode = "home" | "ent" | "entWeb" | "qr" | "direct";

function Field(props: React.ComponentProps<typeof TextInput>) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.sub}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      style={[{ backgroundColor: t.card, color: t.text, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border, fontSize: 15 }, props.style]}
    />
  );
}

function normalizeUrl(input: string) {
  let u = input.trim();
  if (!u) return "";
  if (!/^https?:\/\//.test(u)) u = "https://" + u;
  try {
    u = cleanURL(u);
  } catch {}
  if (!/\/pronote$/i.test(u) && /index-education\.net\/?$/i.test(u)) u = u.replace(/\/?$/, "/pronote");
  return u.replace(/\/$/, "");
}

export default function Login() {
  const t = useTheme();
  const { onLoggedIn } = useApp();
  const [mode, setMode] = useState<Mode>("home");
  const [url, setUrl] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = async (fn: () => Promise<any>) => {
    setBusy(true);
    try {
      const s = await fn();
      await onLoggedIn(s);
    } catch (e: any) {
      const msg = /failed to fetch|networkerror|load failed/i.test(String(e?.message))
        ? "Le navigateur bloque la connexion à Pronote (CORS). Utilise l'application Android."
        : e?.message ?? String(e);
      if (Platform.OS === "web") (globalThis as any).alert?.("Connexion impossible : " + msg);
      else Alert.alert("Connexion impossible", msg);
      setMode((m) => (m === "entWeb" ? "ent" : m));
    } finally {
      setBusy(false);
    }
  };

  if (mode === "entWeb") return <ENTWebView url={normalizeUrl(url)} onCancel={() => setMode("ent")} onToken={(login, token, uuid) => finish(() => loginFromENT(normalizeUrl(url), login, token, uuid))} busy={busy} />;
  if (mode === "qr") return <QrLogin onCancel={() => setMode("home")} onDone={(qr, pin) => finish(() => loginWithQr(qr, pin))} busy={busy} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 60, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginBottom: 10 }}>
          <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: t.accent, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 40, fontWeight: "900" }}>R</Text>
          </View>
          <Text style={{ color: t.text, fontSize: 30, fontWeight: "900", marginTop: 12 }}>Révizo</Text>
          <Sub style={{ textAlign: "center", marginTop: 4 }}>Tes cours, tes devoirs et tes révisions, boostés à l'IA.</Sub>
        </View>

        {mode === "home" && (
          <>
            {Platform.OS === "web" ? (
              <>
              <Card>
                <Text style={{ color: t.text, fontWeight: "800", marginBottom: 4 }}>Version web limitée</Text>
                <Sub>
                  Dans un navigateur, la connexion monlycee.net n'est pas possible. Connecte-toi avec le QR code Pronote (généré une fois depuis Pronote sur un ordinateur), ou teste le compte démo.
                </Sub>
              </Card>
              <Btn label="Connexion avec le QR code Pronote" icon="qr-code" onPress={() => setMode("qr")} />
              </>
            ) : (
              <>
                <Btn label="Se connecter avec monlycee.net" icon="school" onPress={() => setMode("ent")} />
                <Btn label="Scanner le QR code Pronote" icon="qr-code" kind="soft" onPress={() => setMode("qr")} />
                <Btn label="Identifiants Pronote (sans ENT)" icon="key" kind="soft" onPress={() => setMode("direct")} />
              </>
            )}
            <Btn label="Essayer avec le compte démo" icon="flask" kind="ghost" onPress={() => finish(() => loginDirect(DEMO.url, DEMO.username, DEMO.password))} />
            {busy && <ActivityIndicator color={t.accent} />}
            <Sub style={{ textAlign: "center", marginTop: 8 }}>
              Ton mot de passe est tapé directement sur la page officielle et n'est jamais enregistré : l'app ne garde qu'un jeton Pronote chiffré sur ton téléphone.
            </Sub>
          </>
        )}

        {mode === "ent" && (
          <>
            <Card style={{ gap: 6 }}>
              <Text style={{ color: t.text, fontWeight: "700" }}>Adresse Pronote de ton lycée</Text>
              <Sub>Sur monlycee.net, ouvre Pronote et copie l'adresse de la page. Elle ressemble à https://0XXXXXXX.index-education.net/pronote/</Sub>
            </Card>
            <Field placeholder="https://0XXXXXXX.index-education.net/pronote" value={url} onChangeText={setUrl} keyboardType="url" />
            <Btn label="Continuer vers monlycee.net" icon="arrow-forward" disabled={!url.trim()} onPress={() => setMode("entWeb")} />
            <Btn label="Retour" kind="ghost" onPress={() => setMode("home")} />
          </>
        )}

        {mode === "direct" && (
          <>
            <Field placeholder="Adresse Pronote" value={url} onChangeText={setUrl} keyboardType="url" />
            <Field placeholder="Identifiant Pronote" value={user} onChangeText={setUser} />
            <Field placeholder="Mot de passe Pronote" value={pass} onChangeText={setPass} secureTextEntry />
            <Btn label={busy ? "Connexion…" : "Se connecter"} icon="log-in" disabled={busy || !url || !user || !pass}
              onPress={() => finish(() => loginDirect(normalizeUrl(url), user.trim(), pass))} />
            <Btn label="Retour" kind="ghost" onPress={() => setMode("home")} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------- Connexion ENT (monlycee.net) dans une WebView ----------
 * 1. On ouvre InfoMobileApp.json de Pronote pour savoir si l'instance passe par un CAS (ENT).
 * 2. On pose les cookies "appli mobile" puis on va sur mobile.eleve.html → redirection vers monlycee.net.
 * 3. L'élève se connecte lui-même. De retour sur Pronote mobile, la page expose window.loginState
 *    { status, login, mdp } : un identifiant + jeton propres à cet appareil, utilisés avec Pawnote.
 * Technique inspirée de l'app open source Papillon. */
function ENTWebView({ url, onCancel, onToken, busy }: {
  url: string; onCancel: () => void; onToken: (login: string, token: string, uuid: string) => void; busy: boolean;
}) {
  const t = useTheme();
  const ref = useRef<any>(null);
  const [uuid] = useState(newDeviceUUID);
  const got = useRef(false);
  const info = `${url}/InfoMobileApp.json?id=0D264427-EEFC-4810-A9E9-346942A862A4`;
  const in5min = new Date(Date.now() + 5 * 60000).toUTCString();
  const in1y = new Date(Date.now() + 365 * 86400000).toUTCString();
  const expired = new Date(0).toUTCString();

  const HOOK = `window.hookAccesDepuisAppli = function(){ this.passerEnModeValidationAppliMobile('', '${uuid}'); };
    try { window.GInterface && window.GInterface.passerEnModeValidationAppliMobile('', '${uuid}', '', '', '{"model":"revizo","platform":"android"}'); } catch(e) {}
    true;`;

  const JSON_STEP = `(function(){ try {
      var j = JSON.parse(document.body.innerText); var cas = j && j.CAS && j.CAS.jetonCAS;
      if (cas) {
        document.cookie = "appliMobile=; expires=${expired}";
        document.cookie = "validationAppliMobile=" + cas + "; expires=${in5min}";
        document.cookie = "uuidAppliMobile=${uuid}; expires=${in5min}";
      } else { document.cookie = "appliMobile=1; expires=${in5min}"; }
      document.cookie = "ielang=1036; expires=${in1y}";
      window.location.assign("${url}/mobile.eleve.html?fd=1");
    } catch(e) { window.location.assign("${url}/mobile.eleve.html?fd=1"); } })(); true;`;

  const POLL = `(function(){ if (window.__rvz) return; window.__rvz = 1; setInterval(function(){
      var s = window.loginState; if (s) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'state', data: s }));
    }, 800); })(); true;`;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: 36 }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 12, gap: 10 }}>
        <Pressable onPress={onCancel}><Text style={{ color: t.accent, fontWeight: "700" }}>Annuler</Text></Pressable>
        <Text style={{ color: t.text, fontWeight: "700", flex: 1, textAlign: "center" }}>Connexion monlycee.net</Text>
        <View style={{ width: 50 }} />
      </View>
      <WebView
        ref={ref}
        source={{ uri: info }}
        incognito
        sharedCookiesEnabled={false}
        userAgent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
        injectedJavaScriptBeforeContentLoaded={`window.hookAccesDepuisAppli = function(){ this.passerEnModeValidationAppliMobile('', '${uuid}'); }; true;`}
        onLoadEnd={(e: any) => {
          const u = e.nativeEvent.url;
          ref.current?.injectJavaScript(HOOK);
          if (u.startsWith(info.split("?")[0])) ref.current?.injectJavaScript(JSON_STEP);
          else if (u.includes("mobile.eleve.html")) ref.current?.injectJavaScript(POLL);
        }}
        onMessage={(e: any) => {
          if (got.current) return;
          try {
            const m = JSON.parse(e.nativeEvent.data);
            if (m.type === "state" && m.data && m.data.status === 0 && m.data.login && m.data.mdp) {
              got.current = true;
              onToken(m.data.login, m.data.mdp, uuid);
            }
          } catch {}
        }}
        onOpenWindow={(e: any) => ref.current?.injectJavaScript(`window.location.assign(${JSON.stringify(e.nativeEvent.targetUrl)}); true;`)}
        startInLoadingState
        style={{ flex: 1 }}
      />
      {busy && (
        <View style={{ position: "absolute", inset: 0, backgroundColor: t.bg + "EE", alignItems: "center", justifyContent: "center" } as any}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={{ color: t.text, marginTop: 10 }}>Récupération de tes données Pronote…</Text>
        </View>
      )}
    </View>
  );
}

/* ---------- Connexion par QR code ---------- */
function QrLoginWeb({ onCancel, onDone, busy }: { onCancel: () => void; onDone: (qr: any, pin: string) => void; busy: boolean }) {
  const t = useTheme();
  const [txt, setTxt] = useState("");
  const [pin, setPin] = useState("");
  let qr: any = null;
  try { const j = JSON.parse(txt.trim()); if (j.jeton && j.login && j.url) qr = j; } catch {}
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 20, paddingTop: 60, gap: 12 }}>
      <Text style={{ color: t.text, fontSize: 22, fontWeight: "800" }}>QR code Pronote</Text>
      <Sub>1) Sur un ordinateur, connecte-toi à Pronote (via monlycee.net), clique sur l'icône QR code (« Connexion appli mobile ») et choisis un code à 4 chiffres. 2) Scanne ce QR avec l'appareil photo de l'iPhone, touche le texte qui s'affiche, copie-le et colle-le ci-dessous.</Sub>
      <TextInput value={txt} onChangeText={setTxt} multiline placeholder='{"jeton":"…","login":"…","url":"…"}' placeholderTextColor={t.sub}
        style={{ backgroundColor: t.card, color: t.text, borderRadius: 14, padding: 14, minHeight: 110, borderWidth: 1, borderColor: t.border }} />
      {txt.length > 0 && <Text style={{ color: qr ? t.good : t.bad, fontWeight: "700" }}>{qr ? "QR code lu ✓" : "Contenu invalide"}</Text>}
      <TextInput value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder="Code à 4 chiffres" placeholderTextColor={t.sub} secureTextEntry
        style={{ backgroundColor: t.card, color: t.text, borderRadius: 14, padding: 14, fontSize: 22, letterSpacing: 8, textAlign: "center" }} />
      <Btn label={busy ? "Connexion…" : "Valider"} disabled={!qr || pin.length !== 4 || busy} onPress={() => onDone(qr, pin)} />
      <Btn label="Annuler" kind="ghost" onPress={onCancel} />
    </ScrollView>
  );
}

function QrLogin(props: { onCancel: () => void; onDone: (qr: any, pin: string) => void; busy: boolean }) {
  return Platform.OS === "web" ? <QrLoginWeb {...props} /> : <QrLoginNative {...props} />;
}

function QrLoginNative({ onCancel, onDone, busy }: { onCancel: () => void; onDone: (qr: any, pin: string) => void; busy: boolean }) {
  const t = useTheme();
  const [perm, request] = useCameraPermissions();
  const [qr, setQr] = useState<any>(null);
  const [pin, setPin] = useState("");

  if (!perm) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (!perm.granted)
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, padding: 24, justifyContent: "center", gap: 12 }}>
        <Text style={{ color: t.text, fontSize: 18, fontWeight: "700" }}>Autorise la caméra pour scanner le QR code.</Text>
        <Btn label="Autoriser" onPress={request} />
        <Btn label="Retour" kind="ghost" onPress={onCancel} />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: 40 }}>
      <View style={{ padding: 16, gap: 6 }}>
        <Text style={{ color: t.text, fontSize: 22, fontWeight: "800" }}>QR code Pronote</Text>
        <Sub>Sur un ordinateur : Pronote → icône QR code en haut (« Connexion appli mobile ») → choisis un code à 4 chiffres, puis scanne.</Sub>
      </View>
      {!qr ? (
        <CameraView
          style={{ flex: 1, margin: 16, borderRadius: 20, overflow: "hidden" }}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => {
            try {
              const j = JSON.parse(data);
              if (j.jeton && j.login && j.url) setQr(j);
            } catch {}
          }}
        />
      ) : (
        <View style={{ padding: 16, gap: 12 }}>
          <Card><Text style={{ color: t.good, fontWeight: "700" }}>QR code lu ✓</Text></Card>
          <TextInput
            value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad"
            placeholder="Code à 4 chiffres" placeholderTextColor={t.sub} secureTextEntry
            style={{ backgroundColor: t.card, color: t.text, borderRadius: 14, padding: 14, fontSize: 22, letterSpacing: 8, textAlign: "center" }}
          />
          <Btn label={busy ? "Connexion…" : "Valider"} disabled={pin.length !== 4 || busy} onPress={() => onDone(qr, pin)} />
        </View>
      )}
      <Btn label="Annuler" kind="ghost" onPress={onCancel} style={{ marginBottom: 30 }} />
      <Modal visible={busy} transparent>
        <View style={{ flex: 1, backgroundColor: "#0008", alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </Modal>
    </View>
  );
}

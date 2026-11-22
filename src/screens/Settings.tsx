import React, { useState } from "react";
import { Alert, Linking, Pressable, Text, TextInput, View } from "react-native";
import { MODELS } from "../ai/claude";
import { useNav } from "../nav";
import { useApp } from "../store";
import { useTheme } from "../theme";
import { Back, Btn, Card, H, Screen, Sub } from "../ui";
import { ago } from "../utils";

export default function Settings() {
  const t = useTheme();
  const nav = useNav();
  const { apiKey, setApiKey, settings, updateSettings, logout, data, sync, syncing } = useApp();
  const [key, setKey] = useState(apiKey);
  const [target, setTarget] = useState(String(settings.target));

  return (
    <Screen title="Réglages" refresh={false}>
      <Back onPress={nav.pop} />
      <H>Compte Pronote</H>
      <Card style={{ gap: 4 }}>
        <Text style={{ color: t.text, fontWeight: "700" }}>{data?.user.name ?? "—"}</Text>
        <Sub>{[data?.user.className, data?.user.school].filter(Boolean).join(" · ")}</Sub>
        <Sub>Dernière synchro : {ago(data?.syncedAt)}</Sub>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Btn small kind="soft" label={syncing ? "Synchro…" : "Synchroniser"} icon="refresh" onPress={sync} disabled={syncing} style={{ flex: 1 }} />
          <Btn small kind="danger" label="Déconnexion" icon="log-out" style={{ flex: 1 }}
            onPress={() => Alert.alert("Se déconnecter ?", "Tes données locales seront effacées.", [
              { text: "Annuler", style: "cancel" },
              { text: "Déconnexion", style: "destructive", onPress: async () => { await logout(); nav.pop(); } },
            ])} />
        </View>
      </Card>

      <H>Intelligence artificielle</H>
      <Card style={{ gap: 10 }}>
        <Text style={{ color: t.text, fontWeight: "700" }}>Clé API Claude</Text>
        <Sub>Crée une clé sur console.anthropic.com (rubrique API Keys). Elle reste chiffrée sur ton téléphone.</Sub>
        <TextInput value={key} onChangeText={setKey} placeholder="sk-ant-…" placeholderTextColor={t.sub} autoCapitalize="none" autoCorrect={false} secureTextEntry
          style={{ color: t.text, backgroundColor: t.cardAlt, borderRadius: 10, padding: 12 }} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn small label="Enregistrer" style={{ flex: 1 }} onPress={async () => { await setApiKey(key); Alert.alert("OK", key.trim() ? "Clé enregistrée." : "Clé supprimée."); }} />
          <Btn small kind="ghost" label="Obtenir une clé" onPress={() => Linking.openURL("https://console.anthropic.com/settings/keys")} />
        </View>
        <Text style={{ color: t.text, fontWeight: "700", marginTop: 6 }}>Modèle</Text>
        {MODELS.map((m) => (
          <Pressable key={m.id} onPress={() => updateSettings({ model: m.id })}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, backgroundColor: settings.model === m.id ? t.accentSoft : "transparent" }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: t.accent, alignItems: "center", justifyContent: "center" }}>
              {settings.model === m.id && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent }} />}
            </View>
            <Text style={{ color: t.text }}>{m.label}</Text>
          </Pressable>
        ))}
      </Card>

      <H>Objectif</H>
      <Card style={{ gap: 8 }}>
        <Sub>Moyenne visée (sert au calcul des priorités et à l'analyse des lacunes)</Sub>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={target} onChangeText={setTarget} keyboardType="decimal-pad"
            style={{ flex: 1, color: t.text, backgroundColor: t.cardAlt, borderRadius: 10, padding: 12, fontSize: 16 }} />
          <Btn small label="OK" onPress={() => {
            const v = parseFloat(target.replace(",", "."));
            if (v > 0 && v <= 20) updateSettings({ target: v });
          }} />
        </View>
      </Card>

      <Sub style={{ marginTop: 24, textAlign: "center" }}>
        Révizo 1.0 · Données Pronote via Pawnote (API non officielle, non affiliée à Index-Éducation).
      </Sub>
    </Screen>
  );
}

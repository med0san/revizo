import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextStyle, View, ViewStyle,
} from "react-native";
import { ask, Msg } from "./ai/claude";
import { useApp } from "./store";
import { Theme, useTheme } from "./theme";
import { ago } from "./utils";

export function Screen({ title, subtitle, children, refresh = true, right }: {
  title: string; subtitle?: string; children: React.ReactNode; refresh?: boolean; right?: React.ReactNode;
}) {
  const t = useTheme();
  const { sync, syncing, data, syncError } = useApp();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={refresh ? <RefreshControl refreshing={syncing} onRefresh={sync} tintColor={t.accent} colors={[t.accent]} /> : undefined}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 14, marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontSize: 28, fontWeight: "800" }}>{title}</Text>
          {subtitle ? <Text style={{ color: t.sub, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {refresh && (
        <Text style={{ color: t.sub, fontSize: 12, marginBottom: 10 }}>
          {syncing ? "Synchronisation avec Pronote…" : `Mis à jour ${ago(data?.syncedAt)}`}
        </Text>
      )}
      {refresh && syncError ? (
        <Card style={{ backgroundColor: t.dark ? "#3A2A12" : "#FFF4E0", marginBottom: 12 }}>
          <Text style={{ color: t.text, fontSize: 13 }}>{syncError}</Text>
        </Card>
      ) : null}
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const t = useTheme();
  const s: ViewStyle = { backgroundColor: t.card, borderRadius: 18, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border };
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s, style, pressed && { opacity: 0.7 }]}>
        {children}
      </Pressable>
    );
  return <View style={[s, style]}>{children}</View>;
}

export function H({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const t = useTheme();
  return <Text style={[{ color: t.text, fontSize: 18, fontWeight: "700", marginTop: 18, marginBottom: 8 }, style]}>{children}</Text>;
}

export function Sub({ children, style, numberOfLines }: { children: React.ReactNode; style?: TextStyle; numberOfLines?: number }) {
  const t = useTheme();
  return <Text numberOfLines={numberOfLines} style={[{ color: t.sub, fontSize: 13 }, style]}>{children}</Text>;
}

export function Btn({ label, onPress, icon, kind = "primary", disabled, small, style }: {
  label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; kind?: "primary" | "soft" | "ghost" | "danger";
  disabled?: boolean; small?: boolean; style?: ViewStyle;
}) {
  const t = useTheme();
  const bg = kind === "primary" ? t.accent : kind === "soft" ? t.accentSoft : kind === "danger" ? t.bad : "transparent";
  const fg = kind === "primary" || kind === "danger" ? t.onAccent : t.accent;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [{
        backgroundColor: bg, borderRadius: 14, paddingVertical: small ? 8 : 13, paddingHorizontal: small ? 12 : 16,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      }, style]}
    >
      {icon && <Ionicons name={icon} size={small ? 16 : 18} color={fg} />}
      <Text style={{ color: fg, fontWeight: "700", fontSize: small ? 13 : 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ label, color }: { label: string; color?: string }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: (color ?? t.accent) + "22", borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start" }}>
      <Text style={{ color: color ?? t.accent, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function Dot({ color }: { color?: string }) {
  const t = useTheme();
  return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color || t.accent }} />;
}

export function Empty({ text }: { text: string }) {
  const t = useTheme();
  return (
    <Card style={{ alignItems: "center", paddingVertical: 24 }}>
      <Ionicons name="sparkles-outline" size={24} color={t.sub} />
      <Text style={{ color: t.sub, marginTop: 6, textAlign: "center" }}>{text}</Text>
    </Card>
  );
}

/* ---------- Mini rendu Markdown ---------- */

function inline(text: string, t: Theme, base: TextStyle) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**")) return <Text key={i} style={{ fontWeight: "800" }}>{p.slice(2, -2)}</Text>;
    if (p.startsWith("`")) return <Text key={i} style={{ fontFamily: "monospace", backgroundColor: t.cardAlt }}>{p.slice(1, -1)}</Text>;
    if (p.startsWith("*") && p.length > 2) return <Text key={i} style={{ fontStyle: "italic" }}>{p.slice(1, -1)}</Text>;
    return <Text key={i} style={base}>{p}</Text>;
  });
}

export function Markdown({ text }: { text: string }) {
  const t = useTheme();
  const base: TextStyle = { color: t.text, fontSize: 15, lineHeight: 22 };
  const lines = text.replace(/\r/g, "").split("\n");
  return (
    <View style={{ gap: 4 }}>
      {lines.map((raw, i) => {
        const l = raw.trimEnd();
        if (!l.trim()) return <View key={i} style={{ height: 6 }} />;
        if (/^---+$/.test(l.trim())) return <View key={i} style={{ height: 1, backgroundColor: t.border, marginVertical: 6 }} />;
        const h = l.match(/^(#{1,4})\s+(.*)/);
        if (h)
          return (
            <Text key={i} style={{ color: h[1].length <= 2 ? t.accent : t.text, fontSize: h[1].length === 1 ? 20 : h[1].length === 2 ? 17 : 15, fontWeight: "800", marginTop: 8 }}>
              {h[2].replace(/\*\*/g, "")}
            </Text>
          );
        const b = l.match(/^(\s*)[-*•]\s+(?:\[( |x)\]\s+)?(.*)/);
        if (b)
          return (
            <View key={i} style={{ flexDirection: "row", paddingLeft: b[1].length * 6 + 2 }}>
              <Text style={[base, { color: t.accent, width: 18 }]}>{b[2] ? (b[2] === "x" ? "☑" : "☐") : "•"}</Text>
              <Text style={[base, { flex: 1 }]}>{inline(b[3], t, base)}</Text>
            </View>
          );
        const n = l.match(/^(\s*)(\d+)[.)]\s+(.*)/);
        if (n)
          return (
            <View key={i} style={{ flexDirection: "row", paddingLeft: n[1].length * 6 }}>
              <Text style={[base, { color: t.accent, fontWeight: "800", width: 24 }]}>{n[2]}.</Text>
              <Text style={[base, { flex: 1 }]}>{inline(n[3], t, base)}</Text>
            </View>
          );
        if (l.startsWith(">"))
          return (
            <View key={i} style={{ borderLeftWidth: 3, borderLeftColor: t.accent, paddingLeft: 10 }}>
              <Text style={[base, { color: t.sub }]}>{inline(l.replace(/^>\s?/, ""), t, base)}</Text>
            </View>
          );
        return <Text key={i} style={base}>{inline(l, t, base)}</Text>;
      })}
    </View>
  );
}

/* ---------- Bloc IA réutilisable (avec cache) ---------- */

export function AIBox({ cacheKey, prompt, label, icon = "sparkles", maxTokens }: {
  cacheKey: string; prompt: string; label: string; icon?: keyof typeof Ionicons.glyphMap; maxTokens?: number;
}) {
  const t = useTheme();
  const { apiKey, settings, data, exams, aiCache, putAi } = useApp();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const result = aiCache[cacheKey];

  const run = async () => {
    setLoading(true);
    setErr(null);
    try {
      const msgs: Msg[] = [{ role: "user", content: prompt }];
      const out = await ask(apiKey, settings, data, exams, msgs, { maxTokens });
      putAi(cacheKey, out);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      {!result && !loading && <Btn label={label} icon={icon} onPress={run} kind="soft" />}
      {loading && (
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator color={t.accent} />
          <Text style={{ color: t.sub }}>L'IA réfléchit…</Text>
        </Card>
      )}
      {err && <Text style={{ color: t.bad }}>{err}</Text>}
      {result && !loading && (
        <Card style={{ backgroundColor: t.cardAlt }}>
          <Markdown text={result} />
          <Btn label="Régénérer" icon="refresh" kind="ghost" small onPress={run} style={{ alignSelf: "flex-end", marginTop: 6 }} />
        </Card>
      )}
    </View>
  );
}

export function Back({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
      <Ionicons name="chevron-back" size={20} color={t.accent} />
      <Text style={{ color: t.accent, fontWeight: "700" }}>Retour</Text>
    </Pressable>
  );
}

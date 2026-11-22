import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ask, Msg } from "../ai/claude";
import { useNav } from "../nav";
import { useApp } from "../store";
import { useTheme } from "../theme";
import { Back, Markdown, Sub } from "../ui";

const KEY = "revizo.chat.v1";
const IDEAS = [
  "Explique-moi le dernier chapitre de maths comme si j'avais 10 ans",
  "Comment remonter ma moyenne d'ici la fin du trimestre ?",
  "Fais-moi réviser l'histoire avec des questions",
  "Je n'arrive pas à m'organiser, aide-moi",
];

export default function Coach({ initial }: { initial?: string }) {
  const t = useTheme();
  const nav = useNav();
  const { apiKey, settings, data, exams } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState(initial ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scroll = useRef<any>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => v && setMsgs(JSON.parse(v)));
  }, []);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next); setInput(""); setLoading(true); setErr(null);
    try {
      const out = await ask(apiKey, settings, data, exams, next.slice(-20));
      const all: Msg[] = [...next, { role: "assistant", content: out }];
      setMsgs(all);
      AsyncStorage.setItem(KEY, JSON.stringify(all.slice(-40)));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior="padding">
      <View style={{ padding: 16, paddingBottom: 6, flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Back onPress={nav.pop} />
          <Text style={{ color: t.text, fontSize: 26, fontWeight: "800" }}>Coach IA</Text>
        </View>
        {msgs.length > 0 && (
          <Pressable onPress={() => { setMsgs([]); AsyncStorage.removeItem(KEY); }} hitSlop={10}>
            <Ionicons name="trash-outline" size={22} color={t.sub} />
          </Pressable>
        )}
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 10 }} onContentSizeChange={() => scroll.current?.scrollToEnd()}>
        {msgs.length === 0 && (
          <View style={{ gap: 8 }}>
            <Sub>Le coach connaît ton emploi du temps, tes devoirs, tes cours et tes notes. Essaie :</Sub>
            {IDEAS.map((i) => (
              <Pressable key={i} onPress={() => send(i)} style={{ backgroundColor: t.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: t.border }}>
                <Text style={{ color: t.text }}>{i}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {msgs.map((m, i) => (
          <View key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "92%",
            backgroundColor: m.role === "user" ? t.accent : t.card, borderRadius: 18, padding: 12,
          }}>
            {m.role === "user" ? <Text style={{ color: "#fff", fontSize: 15 }}>{m.content}</Text> : <Markdown text={m.content} />}
          </View>
        ))}
        {loading && <ActivityIndicator color={t.accent} style={{ alignSelf: "flex-start" }} />}
        {err && <Text style={{ color: t.bad }}>{err}</Text>}
      </ScrollView>
      <View style={{ flexDirection: "row", padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.card }}>
        <TextInput value={input} onChangeText={setInput} placeholder="Pose ta question…" placeholderTextColor={t.sub} multiline
          style={{ flex: 1, color: t.text, backgroundColor: t.bg, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 120, fontSize: 15 }} />
        <Pressable onPress={() => send()} disabled={loading || !input.trim()}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.accent, alignItems: "center", justifyContent: "center", opacity: loading || !input.trim() ? 0.5 : 1, alignSelf: "flex-end" }}>
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

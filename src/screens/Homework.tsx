import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { P } from "../ai/claude";
import { useNav } from "../nav";
import { useApp } from "../store";
import { useTheme } from "../theme";
import { AIBox, Back, Btn, Card, Dot, Empty, H, Pill, Screen, Sub } from "../ui";
import { dayKey, daysUntil, EXAM_RE, fmtDay, pretty, relDay } from "../utils";

export default function HomeworkList() {
  const t = useTheme();
  const nav = useNav();
  const { data, isDone, toggleDone } = useApp();
  const [showDone, setShowDone] = useState(false);
  const list = (data?.homework ?? []).filter((h) => daysUntil(h.deadline) >= 0 && (showDone || !isDone(h.id, h.done)));
  const groups = new Map<string, typeof list>();
  list.forEach((h) => {
    const k = dayKey(h.deadline);
    groups.set(k, [...(groups.get(k) ?? []), h]);
  });

  return (
    <Screen title="Devoirs" right={<Btn small kind="ghost" label={showDone ? "Masquer faits" : "Voir faits"} onPress={() => setShowDone(!showDone)} />}>
      <AIBox cacheKey={`allhw-${dayKey(new Date())}-${list.length}`} prompt={P.allHomework()} label="Résumer tous mes devoirs avec l'IA" />
      {list.length === 0 && <View style={{ marginTop: 12 }}><Empty text="Aucun devoir à venir." /></View>}
      {[...groups.entries()].map(([k, items]) => (
        <View key={k}>
          <H>{pretty(relDay(items[0].deadline))}{daysUntil(items[0].deadline) > 1 ? "" : ` · ${fmtDay(items[0].deadline)}`}</H>
          <View style={{ gap: 8 }}>
            {items.map((h) => {
              const done = isDone(h.id, h.done);
              return (
                <Card key={h.id} onPress={() => nav.push({ name: "homework", id: h.id })} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                  <Pressable onPress={() => toggleDone(h.id)} hitSlop={12}>
                    <Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={26} color={done ? t.good : t.sub} />
                  </Pressable>
                  <View style={{ flex: 1, gap: 4, opacity: done ? 0.5 : 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Dot color={h.color} />
                      <Text style={{ color: t.text, fontWeight: "700", flex: 1 }}>{pretty(h.subject)}</Text>
                      {EXAM_RE.test(h.text) && <Pill label="Contrôle" color={t.warn} />}
                    </View>
                    <Text style={{ color: t.text }} numberOfLines={3}>{h.text}</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}

export function HomeworkDetail({ id }: { id: string }) {
  const t = useTheme();
  const nav = useNav();
  const { data, isDone, toggleDone } = useApp();
  const h = data?.homework.find((x) => x.id === id);
  if (!h) return <Screen title="Devoir" refresh={false}><Back onPress={nav.pop} /><Empty text="Devoir introuvable." /></Screen>;
  const done = isDone(h.id, h.done);
  return (
    <Screen title={pretty(h.subject)} subtitle={`Pour ${relDay(h.deadline)} · ${fmtDay(h.deadline)}`} refresh={false}>
      <Back onPress={nav.pop} />
      <Card style={{ gap: 10 }}>
        <Text style={{ color: t.text, fontSize: 16, lineHeight: 23 }} selectable>{h.text || "(pas de consigne)"}</Text>
        {h.minutes ? <Sub>Durée prévue par le prof : {h.minutes} min</Sub> : null}
        {h.attachments.map((a) => (
          <Pressable key={a.url} onPress={() => Linking.openURL(a.url)} style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Ionicons name="attach" size={18} color={t.accent} />
            <Text style={{ color: t.accent }}>{a.name}</Text>
          </Pressable>
        ))}
        <Btn label={done ? "Marquer comme non fait" : "Marquer comme fait"} icon={done ? "close-circle" : "checkmark-circle"} kind={done ? "soft" : "primary"} onPress={() => toggleDone(h.id)} />
      </Card>
      <H>Aide de l'IA</H>
      <AIBox cacheKey={`hw-${h.id}`} prompt={P.homeworkSummary(h.subject, h.text, fmtDay(h.deadline))} label="Résumer et découper ce devoir" />
      <Btn label="Poser une question au coach" icon="chatbubbles" kind="ghost" style={{ marginTop: 10 }}
        onPress={() => nav.push({ name: "coach", initial: `Aide-moi sur ce devoir de ${h.subject} pour ${relDay(h.deadline)} : "${h.text}"` })} />
    </Screen>
  );
}

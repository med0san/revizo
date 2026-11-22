import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { P } from "../ai/claude";
import { useNav } from "../nav";
import { computePriorities } from "../priority";
import { useApp } from "../store";
import { gradeColor, useTheme } from "../theme";
import { AIBox, Card, Dot, Empty, H, Pill, Screen, Sub } from "../ui";
import { dayKey, daysUntil, fmtDayLong, fmtNum, fmtTime, pretty, relDay } from "../utils";

export default function Home() {
  const t = useTheme();
  const nav = useNav();
  const { data, exams, isDone, settings, apiKey } = useApp();
  const now = new Date();
  const first = data?.user.name?.split(" ").slice(-1)[0] ?? "";

  const today = (data?.lessons ?? []).filter((l) => dayKey(l.start) === dayKey(now));
  const next = (data?.lessons ?? []).find((l) => new Date(l.end) > now && !l.canceled);
  const dueSoon = (data?.homework ?? []).filter((h) => !isDone(h.id, h.done) && daysUntil(h.deadline) >= 0 && daysUntil(h.deadline) <= 2);
  const lastGrades = data?.grades[0]?.grades.slice(0, 3) ?? [];
  const prios = data ? computePriorities(data, settings, exams, isDone).slice(0, 3) : [];

  return (
    <Screen
      title={`Salut ${pretty(first)} 👋`}
      subtitle={`${fmtDayLong(now)}${data?.user.className ? " · " + data.user.className : ""}`}
      right={
        <Pressable onPress={() => nav.push({ name: "settings" })} hitSlop={10}>
          <Ionicons name="settings-outline" size={24} color={t.sub} />
        </Pressable>
      }
    >
      {next && (
        <Card style={{ backgroundColor: t.accent }}>
          <Text style={{ color: "#fff", opacity: 0.85, fontSize: 13 }}>
            {new Date(next.start) <= now ? "En ce moment" : `Prochain cours · ${relDay(next.start)} ${fmtTime(next.start)}`}
          </Text>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 4 }}>{pretty(next.subject)}</Text>
          <Text style={{ color: "#fff", opacity: 0.85, marginTop: 2 }}>
            {fmtTime(next.start)} – {fmtTime(next.end)}{next.room ? ` · salle ${next.room}` : ""}{next.teacher ? ` · ${next.teacher}` : ""}
          </Text>
        </Card>
      )}

      <H>Ce soir</H>
      {apiKey ? (
        <AIBox cacheKey={`tonight-${dayKey(now)}`} prompt={P.tonight()} label="Générer mon plan de travail" />
      ) : (
        <Card onPress={() => nav.push({ name: "settings" })}>
          <Text style={{ color: t.text, fontWeight: "700" }}>Active l'IA</Text>
          <Sub>Ajoute ta clé API Claude dans les Réglages pour avoir ton plan de travail, tes fiches et tes quiz.</Sub>
        </Card>
      )}

      <H>À faire pour bientôt</H>
      {dueSoon.length ? (
        <View style={{ gap: 8 }}>
          {dueSoon.map((h) => (
            <Card key={h.id} onPress={() => nav.push({ name: "homework", id: h.id })} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Dot color={h.color} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: "700" }}>{pretty(h.subject)} · {relDay(h.deadline)}</Text>
                <Text style={{ color: t.sub }} numberOfLines={2}>{h.text}</Text>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Empty text="Rien à rendre d'ici 2 jours. 🎉" />
      )}

      {exams.length > 0 && (
        <>
          <H>Contrôles à venir</H>
          <View style={{ gap: 8 }}>
            {exams.slice(0, 3).map((e) => (
              <Card key={e.id} onPress={() => nav.push({ name: "exam", id: e.id })} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="flag" size={18} color={t.warn} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: "700" }}>{pretty(e.subject)}</Text>
                  <Sub numberOfLines={1}>{e.title}</Sub>
                </View>
                <Pill label={relDay(e.date)} color={daysUntil(e.date) <= 2 ? t.bad : t.warn} />
              </Card>
            ))}
          </View>
        </>
      )}

      {prios.length > 0 && (
        <>
          <H>Priorités de la semaine</H>
          <Card onPress={() => nav.push({ name: "priorities" })} style={{ gap: 8 }}>
            {prios.map((p, i) => (
              <View key={p.subject} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ color: t.accent, fontWeight: "900", width: 18 }}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: "700" }}>{pretty(p.subject)}</Text>
                  <Sub>{p.reason}</Sub>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      {lastGrades.length > 0 && (
        <>
          <H>Dernières notes</H>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {lastGrades.map((g) => (
              <Card key={g.id} style={{ flex: 1, alignItems: "center" }} onPress={() => nav.tab(3)}>
                <Text style={{ color: gradeColor(t, g.value), fontSize: 22, fontWeight: "900" }}>{g.label}</Text>
                <Sub numberOfLines={1}>{pretty(g.subject)}</Sub>
              </Card>
            ))}
          </View>
        </>
      )}

      {today.length > 0 && (
        <>
          <H>Aujourd'hui</H>
          <Card style={{ gap: 8 }}>
            {today.map((l) => (
              <View key={l.id} style={{ flexDirection: "row", gap: 10, alignItems: "center", opacity: l.canceled ? 0.5 : 1 }}>
                <Text style={{ color: t.sub, width: 48 }}>{fmtTime(l.start)}</Text>
                <Dot color={l.color} />
                <Text style={{ color: t.text, flex: 1, textDecorationLine: l.canceled ? "line-through" : "none" }}>{pretty(l.subject)}</Text>
                {l.canceled && <Pill label={l.status ?? "Annulé"} color={t.bad} />}
              </View>
            ))}
          </Card>
        </>
      )}

      {data?.grades[0]?.overall != null && (
        <Sub style={{ marginTop: 18, textAlign: "center" }}>
          Moyenne générale ({data.grades[0].period}) : {fmtNum(data.grades[0].overall)}
        </Sub>
      )}
    </Screen>
  );
}

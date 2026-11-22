import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useApp } from "../store";
import { useTheme } from "../theme";
import { Card, Empty, Pill, Screen, Sub } from "../ui";
import { addDays, dayKey, fmtTime, pretty, startOfDay } from "../utils";

const D = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default function Timetable() {
  const t = useTheme();
  const { data } = useApp();
  const days = useMemo(() => {
    const base = startOfDay(new Date());
    return Array.from({ length: 14 }, (_, i) => addDays(base, i)).filter((d) => d.getDay() !== 0);
  }, []);
  const [sel, setSel] = useState(dayKey(days[0]));
  const lessons = (data?.lessons ?? []).filter((l) => dayKey(l.start) === sel);

  return (
    <Screen title="Emploi du temps">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
        {days.map((d) => {
          const k = dayKey(d);
          const on = k === sel;
          const has = data?.lessons.some((l) => dayKey(l.start) === k);
          return (
            <Pressable key={k} onPress={() => setSel(k)}
              style={{ width: 54, paddingVertical: 10, borderRadius: 16, alignItems: "center", backgroundColor: on ? t.accent : t.card, borderWidth: 1, borderColor: on ? t.accent : t.border }}>
              <Text style={{ color: on ? "#fff" : t.sub, fontSize: 12 }}>{D[d.getDay()]}</Text>
              <Text style={{ color: on ? "#fff" : t.text, fontSize: 18, fontWeight: "800" }}>{d.getDate()}</Text>
              <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 3, backgroundColor: has ? (on ? "#fff" : t.accent) : "transparent" }} />
            </Pressable>
          );
        })}
      </ScrollView>
      {lessons.length === 0 ? (
        <Empty text="Pas de cours ce jour-là." />
      ) : (
        <View style={{ gap: 8 }}>
          {lessons.map((l) => (
            <Card key={l.id} style={{ flexDirection: "row", gap: 12, opacity: l.canceled ? 0.55 : 1 }}>
              <View style={{ width: 52 }}>
                <Text style={{ color: t.text, fontWeight: "800" }}>{fmtTime(l.start)}</Text>
                <Sub>{fmtTime(l.end)}</Sub>
              </View>
              <View style={{ width: 4, borderRadius: 2, backgroundColor: l.color || t.accent }} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: t.text, fontWeight: "700", fontSize: 16, textDecorationLine: l.canceled ? "line-through" : "none" }}>{pretty(l.subject)}</Text>
                <Sub>{[l.room && `Salle ${l.room}`, l.teacher].filter(Boolean).join(" · ")}</Sub>
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                  {l.status ? <Pill label={l.status} color={l.canceled ? t.bad : t.warn} /> : null}
                  {l.test ? <Pill label="Évaluation" color={t.warn} /> : null}
                  {l.kind !== "lesson" ? <Pill label={l.kind === "detention" ? "Retenue" : "Activité"} /> : null}
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

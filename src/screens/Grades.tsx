import React, { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useNav } from "../nav";
import { useApp } from "../store";
import { gradeColor, useTheme } from "../theme";
import { Btn, Card, Empty, H, Screen, Sub } from "../ui";
import { fmtDay, fmtNum, pretty } from "../utils";

function Bar({ v, cls }: { v: number | null; cls: number | null }) {
  const t = useTheme();
  return (
    <View style={{ height: 8, backgroundColor: t.cardAlt, borderRadius: 4, marginTop: 8 }}>
      {v != null && <View style={{ width: `${Math.min(100, (v / 20) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: gradeColor(t, v) }} />}
      {cls != null && <View style={{ position: "absolute", left: `${Math.min(100, (cls / 20) * 100)}%`, top: -3, width: 2, height: 14, backgroundColor: t.text, opacity: 0.6 }} />}
    </View>
  );
}

export default function Grades() {
  const t = useTheme();
  const nav = useNav();
  const { data } = useApp();
  const [pi, setPi] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const p = data?.grades[pi];

  return (
    <Screen title="Notes" right={<Btn small kind="ghost" label="Vie scolaire" onPress={() => nav.push({ name: "absences" })} />}>
      {data && data.grades.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          {data.grades.map((g, i) => (
            <Pressable key={g.period} onPress={() => setPi(i)}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: i === pi ? t.accent : t.card, borderWidth: 1, borderColor: i === pi ? t.accent : t.border }}>
              <Text style={{ color: i === pi ? "#fff" : t.text, fontWeight: "600" }}>{g.period}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {!p ? (
        <Empty text="Pas encore de notes." />
      ) : (
        <>
          <Card style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Sub>Moyenne générale</Sub>
              <Text style={{ color: gradeColor(t, p.overall), fontSize: 36, fontWeight: "900" }}>{fmtNum(p.overall)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Sub>Classe</Sub>
              <Text style={{ color: t.text, fontSize: 20, fontWeight: "700" }}>{fmtNum(p.classOverall)}</Text>
            </View>
          </Card>

          <H>Par matière</H>
          <View style={{ gap: 8 }}>
            {p.subjects.map((s) => {
              const grades = p.grades.filter((g) => g.subject === s.name);
              const isOpen = open === s.name;
              return (
                <Card key={s.name} onPress={() => setOpen(isOpen ? null : s.name)}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ color: t.text, fontWeight: "700", flex: 1 }}>{pretty(s.name)}</Text>
                    <Text style={{ color: gradeColor(t, s.avg), fontSize: 18, fontWeight: "900" }}>{fmtNum(s.avg)}</Text>
                  </View>
                  <Bar v={s.avg} cls={s.classAvg} />
                  <Sub style={{ marginTop: 6 }}>Classe {fmtNum(s.classAvg)} · min {fmtNum(s.min)} · max {fmtNum(s.max)} · {grades.length} note{grades.length > 1 ? "s" : ""}</Sub>
                  {isOpen && (
                    <View style={{ marginTop: 10, gap: 8 }}>
                      {grades.map((g) => (
                        <View key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Text style={{ color: gradeColor(t, g.value), fontWeight: "800", width: 72 }}>{g.label}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: t.text }} numberOfLines={1}>{g.comment || "Note"}</Text>
                            <Sub>{fmtDay(g.date)} · coef {g.coef}{g.classAvg != null ? ` · classe ${fmtNum(g.classAvg)}/20` : ""}</Sub>
                          </View>
                        </View>
                      ))}
                      <Btn small kind="soft" icon="sparkles" label="Exercices ciblés" onPress={() => nav.push({ name: "quiz", subject: s.name, focus: "mes points faibles dans cette matière" })} />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
          <Simulator />
        </>
      )}
    </Screen>
  );
}

/** « Quelle note me faut-il ? » : moyenne pondérée simple d'une matière. */
function Simulator() {
  const t = useTheme();
  const { data } = useApp();
  const p = data?.grades[0];
  const [subject, setSubject] = useState(p?.subjects[0]?.name ?? "");
  const [goal, setGoal] = useState("12");
  const [coef, setCoef] = useState("1");
  if (!p || !p.subjects.length) return null;
  const gs = p.grades.filter((g) => g.subject === subject && g.value != null);
  const sum = gs.reduce((a, g) => a + g.value! * g.coef, 0);
  const w = gs.reduce((a, g) => a + g.coef, 0);
  const G = parseFloat(goal.replace(",", ".")) || 0;
  const c = parseFloat(coef.replace(",", ".")) || 1;
  const need = (G * (w + c) - sum) / c;

  return (
    <>
      <H>Simulateur</H>
      <Card style={{ gap: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {p.subjects.map((s) => (
            <Pressable key={s.name} onPress={() => setSubject(s.name)}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: s.name === subject ? t.accent : t.cardAlt }}>
              <Text style={{ color: s.name === subject ? "#fff" : t.text, fontSize: 12 }}>{pretty(s.name)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[["Objectif", goal, setGoal], ["Coef du prochain", coef, setCoef]].map(([l, v, set]: any) => (
            <View key={l} style={{ flex: 1 }}>
              <Sub>{l}</Sub>
              <TextInput value={v} onChangeText={set} keyboardType="decimal-pad"
                style={{ color: t.text, backgroundColor: t.cardAlt, borderRadius: 10, padding: 10, fontSize: 16, marginTop: 4 }} />
            </View>
          ))}
        </View>
        <Text style={{ color: t.text, fontSize: 15 }}>
          {gs.length === 0
            ? "Pas encore de note dans cette matière."
            : need > 20
              ? `Objectif hors d'atteinte avec une seule note (il faudrait ${fmtNum(need, 1)}/20).`
              : need <= 0
                ? "Objectif déjà assuré, même avec 0 ! 💪"
                : `Il te faut au moins ${fmtNum(need, 1)}/20 au prochain devoir.`}
        </Text>
      </Card>
    </>
  );
}

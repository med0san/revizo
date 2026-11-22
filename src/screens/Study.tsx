import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View } from "react-native";
import { askJSON, P } from "../ai/claude";
import { useNav } from "../nav";
import { computePriorities } from "../priority";
import { newExamId, useApp } from "../store";
import { useTheme } from "../theme";
import { AIBox, Back, Btn, Card, Dot, Empty, H, Pill, Screen, Sub } from "../ui";
import { addDays, daysUntil, fmtDay, fmtNum, pretty, relDay } from "../utils";

/* ---------- Onglet Réviser ---------- */
export default function Study() {
  const t = useTheme();
  const nav = useNav();
  const { exams, data, settings, updateSettings } = useApp();
  const [adding, setAdding] = useState(false);
  const [subj, setSubj] = useState("");
  const [title, setTitle] = useState("");
  const [inDays, setInDays] = useState("7");
  const subjects = data?.grades[0]?.subjects.map((s) => s.name) ?? [...new Set(data?.lessons.map((l) => l.subject))];

  const tiles: { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; go: () => void }[] = [
    { icon: "chatbubbles", label: "Coach IA", sub: "Pose n'importe quelle question", go: () => nav.push({ name: "coach" }) },
    { icon: "podium", label: "Priorités", sub: "Quelles matières bosser", go: () => nav.push({ name: "priorities" }) },
    { icon: "construct", label: "Lacunes", sub: "Analyse et exercices", go: () => nav.push({ name: "gaps" }) },
    { icon: "book", label: "Cours", sub: "Cahier de textes + fiches", go: () => nav.push({ name: "courses" }) },
  ];

  return (
    <Screen title="Réviser" subtitle="Ton espace de travail boosté à l'IA">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {tiles.map((x) => (
          <Card key={x.label} onPress={x.go} style={{ width: "48%", gap: 6 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={x.icon} size={20} color={t.accent} />
            </View>
            <Text style={{ color: t.text, fontWeight: "800", fontSize: 16 }}>{x.label}</Text>
            <Sub>{x.sub}</Sub>
          </Card>
        ))}
      </View>

      <H>Préparer un contrôle</H>
      {exams.length === 0 && !adding && <Empty text="Aucun contrôle détecté dans Pronote. Ajoute-en un à la main." />}
      <View style={{ gap: 8 }}>
        {exams.map((e) => (
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
      {adding ? (
        <Card style={{ gap: 10, marginTop: 10 }}>
          <Text style={{ color: t.text, fontWeight: "700" }}>Nouveau contrôle</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {subjects.map((s) => (
              <Pressable key={s} onPress={() => setSubj(s)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: s === subj ? t.accent : t.cardAlt }}>
                <Text style={{ color: s === subj ? "#fff" : t.text, fontSize: 12 }}>{pretty(s)}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput placeholder="Chapitres / sujet (ex : Suites numériques)" placeholderTextColor={t.sub} value={title} onChangeText={setTitle}
            style={{ color: t.text, backgroundColor: t.cardAlt, borderRadius: 10, padding: 10 }} />
          <TextInput placeholder="Dans combien de jours ?" placeholderTextColor={t.sub} value={inDays} onChangeText={setInDays} keyboardType="number-pad"
            style={{ color: t.text, backgroundColor: t.cardAlt, borderRadius: 10, padding: 10 }} />
          <Btn label="Ajouter" disabled={!subj} onPress={() => {
            const d = addDays(new Date(), parseInt(inDays, 10) || 7);
            updateSettings({ manualExams: [...settings.manualExams, { id: newExamId(), subject: subj, title: title || `Contrôle de ${subj}`, date: d.toISOString(), source: "manuel" }] });
            setAdding(false); setTitle(""); setSubj("");
          }} />
          <Btn label="Annuler" kind="ghost" onPress={() => setAdding(false)} />
        </Card>
      ) : (
        <Btn label="Ajouter un contrôle" icon="add" kind="ghost" onPress={() => setAdding(true)} style={{ marginTop: 8 }} />
      )}
    </Screen>
  );
}

/* ---------- Détail d'un contrôle ---------- */
export function ExamDetail({ id }: { id: string }) {
  const t = useTheme();
  const nav = useNav();
  const { exams, settings, updateSettings } = useApp();
  const e = exams.find((x) => x.id === id) ?? settings.manualExams.find((x) => x.id === id);
  const [tab, setTab] = useState<"plan" | "fiche" | "cards" | "quiz">("plan");
  if (!e) return <Screen title="Contrôle" refresh={false}><Back onPress={nav.pop} /><Empty text="Contrôle introuvable." /></Screen>;
  const tabs = [["plan", "Planning"], ["fiche", "Fiche"], ["cards", "Flashcards"], ["quiz", "Quiz"]] as const;

  return (
    <Screen title={pretty(e.subject)} subtitle={`${e.title} · ${relDay(e.date)} (${fmtDay(e.date)})`} refresh={false}>
      <Back onPress={nav.pop} />
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
        {tabs.map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: "center", backgroundColor: tab === k ? t.accent : t.card }}>
            <Text style={{ color: tab === k ? "#fff" : t.text, fontWeight: "700", fontSize: 13 }}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {tab === "plan" && <AIBox cacheKey={`exam-plan-${e.id}`} prompt={P.examPlan(e)} label="Créer mon planning de révision" icon="calendar" />}
      {tab === "fiche" && <AIBox cacheKey={`exam-sheet-${e.id}`} prompt={P.examSheet(e)} label="Générer la fiche de révision" icon="document-text" maxTokens={6000} />}
      {tab === "cards" && <Flashcards cacheKey={`exam-cards-${e.id}`} prompt={P.flashcards(e)} />}
      {tab === "quiz" && <Quiz cacheKey={`exam-quiz-${e.id}`} subject={e.subject} focus={e.title} />}
      {e.source === "manuel" && (
        <Btn label="Supprimer ce contrôle" kind="ghost" icon="trash" style={{ marginTop: 20 }}
          onPress={() => { updateSettings({ manualExams: settings.manualExams.filter((x) => x.id !== e.id) }); nav.pop(); }} />
      )}
    </Screen>
  );
}

/* ---------- Flashcards ---------- */
function Flashcards({ cacheKey, prompt }: { cacheKey: string; prompt: string }) {
  const t = useTheme();
  const { apiKey, settings, data, exams, aiCache, putAi } = useApp();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [known, setKnown] = useState(0);
  const cards: { q: string; a: string }[] = aiCache[cacheKey] ? JSON.parse(aiCache[cacheKey]).cards ?? [] : [];

  const gen = async () => {
    setLoading(true); setErr(null);
    try {
      const j = await askJSON<{ cards: { q: string; a: string }[] }>(apiKey, settings, data, exams, prompt);
      putAi(cacheKey, JSON.stringify(j)); setI(0); setFlip(false); setKnown(0);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };

  if (loading) return <Card style={{ flexDirection: "row", gap: 10 }}><ActivityIndicator color={t.accent} /><Text style={{ color: t.sub }}>Création des flashcards…</Text></Card>;
  if (!cards.length) return <View style={{ gap: 8 }}><Btn label="Générer 15 flashcards" icon="albums" kind="soft" onPress={gen} />{err && <Text style={{ color: t.bad }}>{err}</Text>}</View>;
  if (i >= cards.length)
    return (
      <Card style={{ alignItems: "center", gap: 10 }}>
        <Text style={{ color: t.text, fontSize: 20, fontWeight: "800" }}>Terminé ! {known}/{cards.length} sues</Text>
        <Btn label="Recommencer" onPress={() => { setI(0); setKnown(0); setFlip(false); }} />
        <Btn label="Nouvelles cartes" kind="ghost" onPress={gen} />
      </Card>
    );
  const c = cards[i];
  return (
    <View style={{ gap: 10 }}>
      <Sub>Carte {i + 1}/{cards.length} · touche pour retourner</Sub>
      <Card onPress={() => setFlip(!flip)} style={{ minHeight: 200, justifyContent: "center", alignItems: "center", backgroundColor: flip ? t.accentSoft : t.card }}>
        <Sub style={{ marginBottom: 8 }}>{flip ? "Réponse" : "Question"}</Sub>
        <Text style={{ color: t.text, fontSize: 19, fontWeight: "700", textAlign: "center" }}>{flip ? c.a : c.q}</Text>
      </Card>
      {flip && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Btn style={{ flex: 1 }} kind="soft" label="À revoir" onPress={() => { setFlip(false); setI(i + 1); }} />
          <Btn style={{ flex: 1 }} label="Je savais ✓" onPress={() => { setKnown(known + 1); setFlip(false); setI(i + 1); }} />
        </View>
      )}
    </View>
  );
}

/* ---------- Quiz QCM ---------- */
type Q = { q: string; choices: string[]; answer: number; explain: string };
export function Quiz({ cacheKey, subject, focus }: { cacheKey: string; subject: string; focus: string }) {
  const t = useTheme();
  const { apiKey, settings, data, exams, aiCache, putAi } = useApp();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const qs: Q[] = aiCache[cacheKey] ? JSON.parse(aiCache[cacheKey]).questions ?? [] : [];

  const gen = async () => {
    setLoading(true); setErr(null);
    try {
      const j = await askJSON<{ questions: Q[] }>(apiKey, settings, data, exams, P.quiz(subject, focus));
      putAi(cacheKey, JSON.stringify(j)); setAnswers({});
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };

  if (loading) return <Card style={{ flexDirection: "row", gap: 10 }}><ActivityIndicator color={t.accent} /><Text style={{ color: t.sub }}>Préparation du quiz…</Text></Card>;
  if (!qs.length) return <View style={{ gap: 8 }}><Btn label="Générer un quiz de 10 questions" icon="help-circle" kind="soft" onPress={gen} />{err && <Text style={{ color: t.bad }}>{err}</Text>}</View>;
  const score = qs.filter((q, i) => answers[i] === q.answer).length;
  const finished = Object.keys(answers).length === qs.length;

  return (
    <View style={{ gap: 10 }}>
      {qs.map((q, i) => {
        const a = answers[i];
        return (
          <Card key={i} style={{ gap: 8 }}>
            <Text style={{ color: t.text, fontWeight: "700" }}>{i + 1}. {q.q}</Text>
            {q.choices.map((c, j) => {
              const picked = a === j;
              const right = a != null && j === q.answer;
              const bg = a == null ? t.cardAlt : right ? t.good + "33" : picked ? t.bad + "33" : t.cardAlt;
              return (
                <Pressable key={j} disabled={a != null} onPress={() => setAnswers({ ...answers, [i]: j })} style={{ backgroundColor: bg, borderRadius: 10, padding: 10 }}>
                  <Text style={{ color: t.text }}>{String.fromCharCode(65 + j)}. {c}</Text>
                </Pressable>
              );
            })}
            {a != null && <Sub>{a === q.answer ? "✅ " : "❌ "}{q.explain}</Sub>}
          </Card>
        );
      })}
      {finished && (
        <Card style={{ alignItems: "center", gap: 8 }}>
          <Text style={{ color: t.text, fontSize: 22, fontWeight: "900" }}>{score}/{qs.length}</Text>
          <Btn label="Nouveau quiz" onPress={gen} />
        </Card>
      )}
    </View>
  );
}

export function QuizScreen({ subject, focus }: { subject: string; focus: string }) {
  const nav = useNav();
  return (
    <Screen title={pretty(subject)} subtitle="Exercices ciblés" refresh={false}>
      <Back onPress={nav.pop} />
      <AIBox cacheKey={`ex-${subject}`} prompt={P.exercises(subject)} label="Générer 5 exercices corrigés" icon="create" maxTokens={6000} />
      <H>Quiz rapide</H>
      <Quiz cacheKey={`quiz-${subject}`} subject={subject} focus={focus} />
    </Screen>
  );
}

/* ---------- Priorités ---------- */
export function Priorities() {
  const t = useTheme();
  const nav = useNav();
  const { data, settings, exams, isDone, updateSettings } = useApp();
  if (!data) return <Screen title="Priorités" refresh={false}><Back onPress={nav.pop} /><Empty text="Synchronise d'abord tes données." /></Screen>;
  const list = computePriorities(data, settings, exams, isDone);
  const max = list[0]?.score || 1;
  const setCoef = (s: string, d: number) => updateSettings({ coefs: { ...settings.coefs, [s]: Math.max(1, Math.min(16, (settings.coefs[s] ?? 1) + d)) } });

  return (
    <Screen title="Priorités" subtitle={`Objectif : ${settings.target}/20 · réglable dans Réglages`} refresh={false}>
      <Back onPress={nav.pop} />
      <AIBox cacheKey={`prio-${new Date().toDateString()}`} label="Que dois-je travailler cette semaine ?"
        prompt={P.explainPriorities(list.slice(0, 8).map((p, i) => `${i + 1}. ${p.subject} — ${p.reason} (score ${p.score.toFixed(2)})`).join("\n"))} />
      <View style={{ gap: 8, marginTop: 12 }}>
        {list.map((p, i) => (
          <Card key={p.subject} style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ color: t.accent, fontWeight: "900", fontSize: 18, width: 24 }}>{i + 1}</Text>
              <Text style={{ color: t.text, fontWeight: "700", flex: 1 }}>{pretty(p.subject)}</Text>
              <Text style={{ color: t.sub }}>{fmtNum(p.avg)}</Text>
            </View>
            <View style={{ height: 6, backgroundColor: t.cardAlt, borderRadius: 3 }}>
              <View style={{ width: `${(p.score / max) * 100}%`, height: 6, borderRadius: 3, backgroundColor: t.accent }} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Sub style={{ flex: 1 }}>{p.reason}</Sub>
              <Pressable onPress={() => setCoef(p.subject, -1)} hitSlop={8}><Ionicons name="remove-circle-outline" size={22} color={t.sub} /></Pressable>
              <Text style={{ color: t.text, marginHorizontal: 6 }}>coef {p.coef}</Text>
              <Pressable onPress={() => setCoef(p.subject, 1)} hitSlop={8}><Ionicons name="add-circle-outline" size={22} color={t.accent} /></Pressable>
            </View>
          </Card>
        ))}
      </View>
      <Sub style={{ marginTop: 14 }}>Score = coefficient × (1 + écart à l'objectif) × urgence du prochain contrôle × (1 + charge de devoirs).</Sub>
    </Screen>
  );
}

/* ---------- Lacunes ---------- */
export function Gaps() {
  const t = useTheme();
  const nav = useNav();
  const { data, settings } = useApp();
  const weak = (data?.grades[0]?.subjects ?? []).filter((s) => s.avg != null).sort((a, b) => a.avg! - b.avg!).slice(0, 5);
  return (
    <Screen title="Lacunes" subtitle="Repère ce qui coince et corrige-le" refresh={false}>
      <Back onPress={nav.pop} />
      <AIBox cacheKey={`gaps-${data?.syncedAt?.slice(0, 10)}`} prompt={P.gaps()} label="Analyser mes lacunes" icon="analytics" maxTokens={6000} />
      <H>Matières les plus fragiles</H>
      <View style={{ gap: 8 }}>
        {weak.map((s) => (
          <Card key={s.name} onPress={() => nav.push({ name: "quiz", subject: s.name, focus: "mes points faibles dans cette matière" })} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ color: t.text, fontWeight: "700", flex: 1 }}>{pretty(s.name)}</Text>
            <Text style={{ color: s.avg! < settings.target ? t.bad : t.good, fontWeight: "800" }}>{fmtNum(s.avg)}</Text>
            <Ionicons name="chevron-forward" size={18} color={t.sub} />
          </Card>
        ))}
        {!weak.length && <Empty text="Pas encore assez de notes pour analyser." />}
      </View>
    </Screen>
  );
}

/* ---------- Cours (cahier de textes) ---------- */
export function Courses() {
  const t = useTheme();
  const nav = useNav();
  const { data } = useApp();
  const [filter, setFilter] = useState<string | null>(null);
  const subjects = [...new Set((data?.courses ?? []).map((c) => c.subject))];
  const list = (data?.courses ?? []).filter((c) => !filter || c.subject === filter);
  return (
    <Screen title="Cours" subtitle="Contenu du cahier de textes" refresh={false}>
      <Back onPress={nav.pop} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {[null, ...subjects].map((s) => (
          <Pressable key={s ?? "all"} onPress={() => setFilter(s)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: s === filter ? t.accent : t.card }}>
            <Text style={{ color: s === filter ? "#fff" : t.text, fontSize: 12 }}>{s ? pretty(s) : "Tout"}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ gap: 8 }}>
        {list.map((c) => (
          <Card key={c.id} onPress={() => nav.push({ name: "course", id: c.id })} style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Dot color={c.color} />
              <Text style={{ color: t.text, fontWeight: "700", flex: 1 }}>{pretty(c.subject)}</Text>
              <Sub>{fmtDay(c.date)}</Sub>
            </View>
            <Text style={{ color: t.text }} numberOfLines={2}>{c.contents.map((x) => x.title || x.text).join(" · ")}</Text>
          </Card>
        ))}
        {!list.length && <Empty text="Aucun contenu de cours récent." />}
      </View>
    </Screen>
  );
}

export function CourseDetail({ id }: { id: string }) {
  const t = useTheme();
  const nav = useNav();
  const { data } = useApp();
  const c = data?.courses.find((x) => x.id === id);
  if (!c) return <Screen title="Cours" refresh={false}><Back onPress={nav.pop} /><Empty text="Cours introuvable." /></Screen>;
  const full = c.contents.map((x) => `${x.title}\n${x.text}`).join("\n\n");
  return (
    <Screen title={pretty(c.subject)} subtitle={`${fmtDay(c.date)}${c.teachers.length ? " · " + c.teachers.join(", ") : ""}`} refresh={false}>
      <Back onPress={nav.pop} />
      {c.contents.map((x, i) => (
        <Card key={i} style={{ gap: 6, marginBottom: 8 }}>
          {x.category ? <Pill label={x.category} /> : null}
          {x.title ? <Text style={{ color: t.text, fontWeight: "800", fontSize: 16 }}>{x.title}</Text> : null}
          {x.text ? <Text style={{ color: t.text, lineHeight: 22 }} selectable>{x.text}</Text> : null}
          {x.files.map((f) => (
            <Pressable key={f.url} onPress={() => Linking.openURL(f.url)} style={{ flexDirection: "row", gap: 6 }}>
              <Ionicons name="attach" size={18} color={t.accent} /><Text style={{ color: t.accent }}>{f.name}</Text>
            </Pressable>
          ))}
        </Card>
      ))}
      <H>Fiche de révision</H>
      <AIBox cacheKey={`course-${c.id}`} prompt={P.courseSheet(c.subject, c.contents[0]?.title ?? "", full)} label="Créer la fiche avec l'IA" icon="document-text" maxTokens={5000} />
      <Btn label="Quiz sur ce cours" icon="help-circle" kind="ghost" style={{ marginTop: 10 }}
        onPress={() => nav.push({ name: "quiz", subject: c.subject, focus: c.contents.map((x) => x.title || x.text.slice(0, 120)).join(" ; ") })} />
    </Screen>
  );
}

/* ---------- Absences ---------- */
export function Absences() {
  const t = useTheme();
  const nav = useNav();
  const { data } = useApp();
  return (
    <Screen title="Vie scolaire" refresh={false}>
      <Back onPress={nav.pop} />
      <H>Absences ({data?.absences.length ?? 0})</H>
      <View style={{ gap: 8 }}>
        {(data?.absences ?? []).map((a, i) => (
          <Card key={i} style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontWeight: "700" }}>{fmtDay(a.start)}</Text>
              <Sub>{a.hours} h{a.reason ? ` · ${a.reason}` : ""}</Sub>
            </View>
            <Pill label={a.justified ? "Justifiée" : "Non justifiée"} color={a.justified ? t.good : t.bad} />
          </Card>
        ))}
        {!data?.absences.length && <Empty text="Aucune absence. 👏" />}
      </View>
      <H>Retards ({data?.delays.length ?? 0})</H>
      <View style={{ gap: 8 }}>
        {(data?.delays ?? []).map((d, i) => (
          <Card key={i} style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontWeight: "700" }}>{fmtDay(d.date)}</Text>
              <Sub>{d.minutes} min{d.reason ? ` · ${d.reason}` : ""}</Sub>
            </View>
            <Pill label={d.justified ? "Justifié" : "Non justifié"} color={d.justified ? t.good : t.bad} />
          </Card>
        ))}
        {!data?.delays.length && <Empty text="Aucun retard." />}
      </View>
    </Screen>
  );
}

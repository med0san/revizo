import { AppData, Exam, Settings } from "./types";
import { daysUntil } from "./utils";

export type Priority = {
  subject: string;
  score: number;
  avg: number | null;
  coef: number;
  nextExam?: Exam;
  daysToExam?: number;
  pendingHw: number;
  reason: string;
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/**
 * Score = Coefficient × (1 + Écart) × Urgence × (1 + Charge)
 *  Écart   = max(0, objectif − moyenne) / 20
 *  Urgence = 1 + 3 / (jours avant le prochain contrôle + 1)   (1 si aucun)
 *  Charge  = 0,2 × devoirs non faits dans les 3 prochains jours
 */
export function computePriorities(
  data: AppData,
  settings: Settings,
  exams: Exam[],
  isDone: (id: string, d: boolean) => boolean
): Priority[] {
  const period = data.grades[0];
  const subjects = new Map<string, string>();
  period?.subjects.forEach((s) => subjects.set(norm(s.name), s.name));
  data.lessons.forEach((l) => l.kind === "lesson" && !subjects.has(norm(l.subject)) && subjects.set(norm(l.subject), l.subject));

  const out: Priority[] = [];
  subjects.forEach((name, key) => {
    const avg = period?.subjects.find((s) => norm(s.name) === key)?.avg ?? null;
    const coef = settings.coefs[name] ?? 1;
    const ecart = avg == null ? 0.1 : Math.max(0, settings.target - avg) / 20;
    const exam = exams.find((e) => norm(e.subject) === key);
    const d = exam ? Math.max(0, daysUntil(exam.date)) : undefined;
    const urgence = d == null ? 1 : 1 + 3 / (d + 1);
    const pendingHw = data.homework.filter(
      (h) => norm(h.subject) === key && !isDone(h.id, h.done) && daysUntil(h.deadline) >= 0 && daysUntil(h.deadline) <= 3
    ).length;
    const score = coef * (1 + ecart) * urgence * (1 + 0.2 * pendingHw);

    const parts: string[] = [];
    if (d != null) parts.push(d === 0 ? "contrôle aujourd'hui" : d === 1 ? "contrôle demain" : `contrôle dans ${d} j`);
    if (avg != null) parts.push(`moyenne ${avg.toFixed(1).replace(".", ",")}`);
    if (pendingHw) parts.push(`${pendingHw} devoir${pendingHw > 1 ? "s" : ""} à rendre`);
    if (coef !== 1) parts.push(`coef ${coef}`);

    out.push({ subject: name, score, avg, coef, nextExam: exam, daysToExam: d, pendingHw, reason: parts.join(" · ") || "rien d'urgent" });
  });
  return out.sort((a, b) => b.score - a.score);
}

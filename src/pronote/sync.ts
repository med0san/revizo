import {
  assignmentsFromIntervals,
  assignmentStatus,
  GradeValue,
  gradesOverview,
  notebook,
  parseTimetable,
  Period,
  resourcesFromIntervals,
  SessionHandle,
  TabLocation,
  timetableFromIntervals,
} from "@blockshub/pawnote-lts";
import { AppData, GradeItem, PeriodGrades } from "../types";
import { addDays, htmlToText, startOfDay } from "../utils";

const GRADE_LABELS: Record<number, string> = {
  1: "Abs", 2: "Disp", 3: "NN", 4: "Inapte", 5: "Non rendu", 6: "Abs (0)", 7: "Non rendu (0)", 8: "Félicitations",
};

function num(v?: GradeValue): number | null {
  if (!v) return null;
  if (v.kind === 0) return v.points;
  if (v.kind === 6 || v.kind === 7) return 0;
  return null;
}

function pickCurrent(periods: readonly Period[], def?: Period): Period | undefined {
  const now = Date.now();
  return (
    periods.find((p) => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() >= now && !/hors/i.test(p.name)) ??
    def ??
    periods[0]
  );
}

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T, errors: string[]): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    errors.push(`${label} : ${e?.message ?? e}`);
    return fallback;
  }
}

async function fetchGrades(session: SessionHandle, period: Period): Promise<PeriodGrades> {
  const g = await gradesOverview(session, period);
  const grades: GradeItem[] = g.grades.map((x) => {
    const raw = num(x.value);
    const outOf = num(x.outOf) ?? 20;
    const on20 = raw == null ? null : outOf ? (raw / outOf) * 20 : raw;
    return {
      id: x.id,
      subject: x.subject.name,
      raw,
      outOf,
      value: on20 == null ? null : Math.round(on20 * 100) / 100,
      label: raw == null ? GRADE_LABELS[x.value.kind] ?? "?" : `${String(raw).replace(".", ",")}/${outOf}`,
      coef: x.coefficient,
      classAvg: num(x.average) != null && outOf ? (num(x.average)! / outOf) * 20 : null,
      min: num(x.min),
      max: num(x.max),
      date: new Date(x.date).toISOString(),
      comment: x.comment ?? "",
    };
  });
  return {
    period: period.name,
    overall: num(g.overallAverage),
    classOverall: num(g.classAverage),
    subjects: g.subjectsAverages.map((s) => ({
      name: s.subject.name,
      avg: num(s.student),
      classAvg: num(s.class_average),
      min: num(s.min),
      max: num(s.max),
      color: s.backgroundColor,
    })),
    grades: grades.sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export async function syncAll(session: SessionHandle): Promise<{ data: AppData; errors: string[] }> {
  const errors: string[] = [];
  const today = startOfDay(new Date());
  const res = session.userResource;

  const [lessons, homework, courses, grades, notes] = await Promise.all([
    safe("Emploi du temps", async () => {
      const tt = await timetableFromIntervals(session, addDays(today, -1), addDays(today, 14));
      parseTimetable(session, tt, { withSuperposedCanceledClasses: false, withCanceledClasses: true, withPlannedClasses: true });
      return tt.classes.map((c: any) => ({
        id: c.id,
        kind: c.is,
        subject: c.is === "lesson" ? c.subject?.name ?? "Cours" : c.title ?? (c.is === "detention" ? "Retenue" : "Activité"),
        start: new Date(c.startDate).toISOString(),
        end: new Date(c.endDate).toISOString(),
        room: (c.classrooms ?? []).join(", "),
        teacher: (c.teacherNames ?? []).join(", "),
        status: c.status,
        canceled: !!c.canceled,
        test: !!c.test,
        color: c.backgroundColor,
      }));
    }, [], errors),

    safe("Devoirs", async () => {
      const hw = await assignmentsFromIntervals(session, addDays(today, -7), addDays(today, 28));
      return hw.map((h) => ({
        id: h.id,
        subject: h.subject.name,
        text: htmlToText(h.description),
        deadline: new Date(h.deadline).toISOString(),
        done: h.done,
        color: h.backgroundColor,
        minutes: h.length,
        attachments: h.attachments.map((a: any) => ({ name: a.name, url: a.url })),
      }));
    }, [], errors),

    safe("Cahier de textes", async () => {
      const r = await resourcesFromIntervals(session, addDays(today, -42), addDays(today, 7));
      return r
        .map((x) => ({
          id: x.id,
          subject: x.subject.name,
          date: new Date(x.startDate).toISOString(),
          color: x.backgroundColor,
          teachers: x.teachers,
          contents: x.contents.map((c) => ({
            title: c.title ?? "",
            text: htmlToText(c.description),
            category: c.categoryText,
            files: c.files.map((f: any) => ({ name: f.name, url: f.url })),
          })),
        }))
        .filter((x) => x.contents.length)
        .sort((a, b) => b.date.localeCompare(a.date));
    }, [], errors),

    safe("Notes", async () => {
      const tab = res.tabs.get(TabLocation.Grades);
      if (!tab) return { periods: [] as string[], list: [] as PeriodGrades[] };
      const periods = tab.periods.filter((p) => !/hors/i.test(p.name));
      const list = await Promise.all(periods.map((p) => fetchGrades(session, p).catch(() => null)));
      const current = pickCurrent(tab.periods, tab.defaultPeriod ?? undefined);
      const ordered = list.filter(Boolean) as PeriodGrades[];
      // période en cours en premier
      ordered.sort((a, b) => (a.period === current?.name ? -1 : b.period === current?.name ? 1 : 0));
      return { periods: ordered.map((p) => p.period), list: ordered };
    }, { periods: [], list: [] }, errors),

    safe("Vie scolaire", async () => {
      const tab = res.tabs.get(TabLocation.Notebook);
      if (!tab) return { absences: [], delays: [] };
      const p = pickCurrent(tab.periods, tab.defaultPeriod ?? undefined);
      if (!p) return { absences: [], delays: [] };
      const n = await notebook(session, p);
      return {
        absences: n.absences.map((a) => ({
          start: new Date(a.startDate).toISOString(), end: new Date(a.endDate).toISOString(),
          justified: a.justified, hours: a.hoursMissed + a.daysMissed * 8, reason: a.reason,
        })),
        delays: n.delays.map((d) => ({ date: new Date(d.date).toISOString(), minutes: d.minutes, justified: d.justified, reason: d.reason })),
      };
    }, { absences: [], delays: [] }, errors),
  ]);

  return {
    errors,
    data: {
      user: { name: session.user.name, className: res.className, school: res.establishmentName },
      syncedAt: new Date().toISOString(),
      lessons: lessons.sort((a, b) => a.start.localeCompare(b.start)),
      homework: homework.sort((a, b) => a.deadline.localeCompare(b.deadline)),
      courses,
      periods: grades.periods,
      grades: grades.list,
      absences: notes.absences,
      delays: notes.delays,
    },
  };
}

export async function setDone(session: SessionHandle | null, id: string, done: boolean) {
  if (!session) return false;
  try {
    await assignmentStatus(session, id, done);
    return true;
  } catch {
    return false;
  }
}

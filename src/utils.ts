const ENTITIES: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'",
  "&eacute;": "é", "&egrave;": "è", "&ecirc;": "ê", "&agrave;": "à", "&acirc;": "â", "&ccedil;": "ç",
  "&ocirc;": "ô", "&ucirc;": "û", "&ugrave;": "ù", "&icirc;": "î", "&iuml;": "ï", "&euml;": "ë",
  "&oelig;": "œ", "&laquo;": "«", "&raquo;": "»", "&rsquo;": "’", "&hellip;": "…", "&deg;": "°",
};

export function htmlToText(html?: string): string {
  if (!html) return "";
  let s = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "");
  s = s.replace(/&[a-z]+;|&#\d+;/gi, (e) => {
    if (ENTITIES[e]) return ENTITIES[e];
    const m = e.match(/&#(\d+);/);
    return m ? String.fromCharCode(Number(m[1])) : e;
  });
  return s.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();
}

export function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const DAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const DAYS_LONG = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
};
export const fmtDay = (iso: string) => {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
export const fmtDayLong = (d: Date) => `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

export const dayKey = (d: Date | string) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function daysUntil(iso: string): number {
  return Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(new Date()).getTime()) / 86400000);
}

export function relDay(iso: string): string {
  const n = daysUntil(iso);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  if (n > 1 && n < 7) return DAYS_LONG[new Date(iso).getDay()];
  return fmtDay(iso);
}

export function ago(iso?: string): string {
  if (!iso) return "jamais";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `le ${fmtDay(iso)}`;
}

export const fmtNum = (v: number | null | undefined, digits = 2) =>
  v == null ? "–" : v.toFixed(digits).replace(".", ",").replace(/,?0+$/, (m) => (m.startsWith(",") ? "" : m));

export function pretty(subject: string): string {
  const s = subject.toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Extrait le premier objet/tableau JSON d'un texte (réponses IA). */
export function extractJSON<T = any>(text: string): T | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : text;
  const starts = [body.indexOf("{"), body.indexOf("[")].filter((i) => i >= 0);
  if (!starts.length) return null;
  const start = Math.min(...starts);
  const end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

export const EXAM_RE = /(contr[ôo]le|évaluation|evaluation|\bDS\b|\bDST\b|interro|devoir surveill|devoir sur table|\btest\b|bac blanc|examen|QCM)/i;

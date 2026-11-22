import { AppData, Exam, Settings } from "../types";
import { extractJSON, fmtDayLong } from "../utils";

export const MODELS = [
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (recommandé)" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 (le plus fort)" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 (rapide, économique)" },
];

export type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `Tu es Révizo, le coach scolaire personnel d'un lycéen français.
Tu connais le programme officiel du lycée français (seconde, première, terminale, spécialités, bac, grand oral).
Tu as accès à TOUTES ses données Pronote (emploi du temps, devoirs, contenu des cours, notes, moyennes, absences) : utilise-les pour personnaliser chaque réponse (matières, dates précises, notes réelles, noms des chapitres).
Style : tutoiement, clair, motivant, concret, pas de blabla. Réponds en français, en Markdown simple (titres ##, listes -, **gras**).
Pédagogie : explique, donne des exemples, des méthodes et des astuces de mémorisation. Pour un devoir noté, guide l'élève pas à pas plutôt que de donner la copie finale, sauf s'il demande explicitement la correction.`;

function context(data: AppData | null, settings: Settings, exams: Exam[]): string {
  if (!data) return "Aucune donnée Pronote synchronisée pour l'instant.";
  const ctx = {
    aujourdhui: fmtDayLong(new Date()),
    eleve: data.user,
    objectif_moyenne: settings.target,
    coefficients_saisis: settings.coefs,
    controles_a_venir: exams,
    emploi_du_temps: data.lessons.map((l) => ({
      matiere: l.subject, debut: l.start, fin: l.end, salle: l.room, prof: l.teacher,
      statut: l.canceled ? "annulé" : l.status, evaluation: l.test || undefined,
    })),
    devoirs: data.homework.map((h) => ({
      matiere: h.subject, pour_le: h.deadline, consigne: h.text,
      fait: settings.doneLocal[h.id] ?? h.done, duree_estimee_min: h.minutes,
    })),
    contenu_des_cours: data.courses.map((c) => ({
      matiere: c.subject, date: c.date, contenus: c.contents.map((x) => ({ titre: x.title, texte: x.text.slice(0, 2500) })),
    })),
    notes: data.grades.map((p) => ({
      periode: p.period, moyenne_generale: p.overall, moyenne_classe: p.classOverall,
      matieres: p.subjects,
      detail: p.grades.map((g) => ({ matiere: g.subject, note: g.label, sur20: g.value, coef: g.coef, moy_classe_sur20: g.classAvg, date: g.date, intitule: g.comment })),
    })),
    absences: data.absences,
    retards: data.delays,
  };
  let json = JSON.stringify(ctx);
  if (json.length > 400000) json = json.slice(0, 400000) + "…(tronqué)";
  return `Voici les données Pronote complètes de l'élève (JSON) :\n${json}`;
}

export async function ask(
  apiKey: string,
  settings: Settings,
  data: AppData | null,
  exams: Exam[],
  messages: Msg[],
  opts: { maxTokens?: number } = {}
): Promise<string> {
  if (!apiKey) throw new Error("Ajoute ta clé API Claude dans Réglages pour utiliser l'IA.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: opts.maxTokens ?? 4096,
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: context(data, settings, exams), cache_control: { type: "ephemeral" } },
      ],
      messages,
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const m = body?.error?.message ?? `HTTP ${res.status}`;
    if (res.status === 401) throw new Error("Clé API invalide. Vérifie-la dans Réglages.");
    throw new Error(`Erreur IA : ${m}`);
  }
  return (body?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
}

export async function askJSON<T>(
  apiKey: string, settings: Settings, data: AppData | null, exams: Exam[], prompt: string
): Promise<T> {
  const text = await ask(apiKey, settings, data, exams, [
    { role: "user", content: `${prompt}\n\nRéponds UNIQUEMENT avec le JSON demandé, sans texte autour.` },
  ], { maxTokens: 6000 });
  const j = extractJSON<T>(text);
  if (!j) throw new Error("L'IA a renvoyé une réponse illisible, réessaie.");
  return j;
}

/* ---------- Prompts prêts à l'emploi ---------- */

export const P = {
  tonight: () =>
    `Fais-moi mon plan de travail pour ce soir (et demain matin si utile), à partir de mes devoirs, contrôles à venir, emploi du temps de demain et matières faibles.
Format : ## Ce soir puis une liste ordonnée de 3 à 6 tâches avec durée estimée et matière, puis ## Pourquoi cet ordre (2-3 phrases), puis ## Astuce du jour.`,
  homeworkSummary: (subject: string, text: string, date: string) =>
    `Résume ce devoir de ${subject} pour le ${date} : reformule la consigne simplement, estime le temps, découpe en étapes cochables, signale les pièges et le chapitre concerné (en t'aidant du contenu des cours).
Consigne : """${text}"""`,
  allHomework: () =>
    `Fais un récapitulatif de tous mes devoirs non faits, classés par urgence. Pour chacun : date, matière, ce qu'il faut faire en une phrase, temps estimé. Termine par la charge totale par jour.`,
  courseSheet: (subject: string, title: string, text: string) =>
    `Crée une fiche de révision complète de ce cours de ${subject} (« ${title} ») : ## L'essentiel (5 lignes max), ## Notions et définitions, ## Formules / dates / méthodes clés, ## Exemple type, ## Erreurs fréquentes, ## 3 questions pour vérifier.
Contenu du cours : """${text}"""`,
  examPlan: (e: Exam) =>
    `J'ai un contrôle de ${e.subject} le ${e.date.slice(0, 10)} (${e.title}). Fais-moi un planning de révision jour par jour jusqu'à la date, adapté à mon emploi du temps et mes autres devoirs, avec des séances courtes (25-45 min), en t'appuyant sur les derniers chapitres vus dans le cahier de textes et mes notes dans cette matière. Termine par une checklist de la veille.`,
  examSheet: (e: Exam) =>
    `Fais une fiche de révision complète pour mon contrôle de ${e.subject} (${e.title}), basée sur les chapitres récents du cahier de textes : notions, définitions, formules/méthodes, exemples, pièges.`,
  flashcards: (e: Exam) =>
    `Génère 15 flashcards pour réviser mon contrôle de ${e.subject} (${e.title}), à partir des chapitres récents. JSON : {"cards":[{"q":"question courte","a":"réponse courte"}]}`,
  quiz: (subject: string, focus: string) =>
    `Génère un quiz de 10 questions à choix multiples en ${subject} sur : ${focus}. Difficulté progressive, niveau de l'élève. JSON : {"questions":[{"q":"...","choices":["A","B","C","D"],"answer":0,"explain":"explication courte"}]}`,
  gaps: () =>
    `Analyse mes lacunes à partir de toutes mes notes (valeurs, moyennes de classe, intitulés, évolution), mes moyennes par matière et mes absences.
Format : ## Bilan (3 phrases), puis pour chaque matière à risque : ### Matière — ce qui coince (chapitres/compétences probables), pourquoi, et un plan d'action concret sur 2 semaines. Termine par ## Tes points forts.`,
  exercises: (subject: string) =>
    `Donne-moi 5 exercices ciblés en ${subject} sur mes points faibles (déduits de mes notes et des derniers chapitres), de difficulté progressive, avec la correction détaillée de chacun cachée sous un titre « Correction ».`,
  explainPriorities: (list: string) =>
    `Voici le classement de mes matières prioritaires calculé par l'app :\n${list}\nExplique-moi en quelques lignes quoi travailler cette semaine et comment répartir mon temps.`,
};

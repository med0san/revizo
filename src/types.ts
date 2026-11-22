export type Attachment = { name: string; url: string };

export type Lesson = {
  id: string;
  subject: string;
  start: string; // ISO
  end: string;
  room: string;
  teacher: string;
  status?: string;
  canceled: boolean;
  test: boolean;
  color?: string;
  kind: "lesson" | "detention" | "activity";
};

export type Homework = {
  id: string;
  subject: string;
  text: string;
  deadline: string;
  done: boolean;
  color?: string;
  minutes?: number;
  attachments: Attachment[];
};

export type CourseContent = { title: string; text: string; category?: string; files: Attachment[] };

export type CourseEntry = {
  id: string;
  subject: string;
  date: string;
  color?: string;
  teachers: string[];
  contents: CourseContent[];
};

export type GradeItem = {
  id: string;
  subject: string;
  value: number | null; // sur 20 si possible
  raw: number | null;
  outOf: number;
  label: string; // ex "14/20" ou "Abs"
  coef: number;
  classAvg: number | null;
  min: number | null;
  max: number | null;
  date: string;
  comment: string;
};

export type SubjectAvg = {
  name: string;
  avg: number | null;
  classAvg: number | null;
  min: number | null;
  max: number | null;
  color?: string;
};

export type PeriodGrades = {
  period: string;
  overall: number | null;
  classOverall: number | null;
  subjects: SubjectAvg[];
  grades: GradeItem[];
};

export type Absence = { start: string; end: string; justified: boolean; hours: number; reason?: string };
export type Delay = { date: string; minutes: number; justified: boolean; reason?: string };

export type AppData = {
  user: { name: string; className?: string; school: string };
  syncedAt: string;
  lessons: Lesson[];
  homework: Homework[];
  courses: CourseEntry[];
  periods: string[];
  grades: PeriodGrades[];
  absences: Absence[];
  delays: Delay[];
};

export type Exam = {
  id: string;
  subject: string;
  date: string;
  title: string;
  source: "pronote" | "manuel";
};

export type Settings = {
  model: string;
  target: number;
  coefs: Record<string, number>;
  manualExams: Exam[];
  doneLocal: Record<string, boolean>;
};

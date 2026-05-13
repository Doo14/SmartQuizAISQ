export const TEACHER_EXAMS_STORAGE_KEY = "smartquiz.teacher.exams";

export type AnswerOption = "A" | "B" | "C" | "D";

export const ANSWER_OPTIONS: AnswerOption[] = ["A", "B", "C", "D"];

export type TeacherExamQuestion = {
  id: string;
  content: string;
  options: Record<AnswerOption, string>;
  answer: AnswerOption;
};

export type TeacherExam = {
  id: string;
  code: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  questions: TeacherExamQuestion[];
  createdAt: string;
  updatedAt: string;
};

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readExams(): TeacherExam[] {
  if (typeof window === "undefined") return [];
  return safeParseJson<TeacherExam[]>(window.localStorage.getItem(TEACHER_EXAMS_STORAGE_KEY), []);
}

function writeExams(list: TeacherExam[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TEACHER_EXAMS_STORAGE_KEY, JSON.stringify(list));
}

export function listTeacherExams(): TeacherExam[] {
  return readExams().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function upsertTeacherExam(exam: TeacherExam) {
  const list = readExams();
  const index = list.findIndex((item) => item.id === exam.id);
  if (index >= 0) list[index] = exam;
  else list.push(exam);
  writeExams(list);
}

export function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function createTeacherExamId(): string {
  return randomId("teacher_exam");
}

export function createTeacherQuestion(
  initial?: Partial<Omit<TeacherExamQuestion, "id">> & { id?: string },
): TeacherExamQuestion {
  return {
    id: initial?.id ?? randomId("q"),
    content: initial?.content ?? "",
    options: {
      A: initial?.options?.A ?? "",
      B: initial?.options?.B ?? "",
      C: initial?.options?.C ?? "",
      D: initial?.options?.D ?? "",
    },
    answer: initial?.answer ?? "A",
  };
}

export function generateTeacherExamCode(): string {
  const length = 6 + Math.floor(Math.random() * 3);
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += chars[Math.floor(Math.random() * chars.length)];
  }
  return output;
}

export function isAnswerOption(value: string): value is AnswerOption {
  return ANSWER_OPTIONS.includes(value as AnswerOption);
}

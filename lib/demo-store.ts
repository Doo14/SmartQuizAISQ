/* ────────────────────────────────────────────────────────
 * SmartQuiz Demo Store  (localStorage, no backend needed)
 * ──────────────────────────────────────────────────────── */

export type ExamId = string;
export type RoomPin = string;
export type AttemptId = string;

export type ViolationType =
  | "tab_switch"
  | "keyboard_copy"
  | "keyboard_paste"
  | "camera_multiple_faces"
  | "camera_gaze_away"
  | "camera_missing";

/* ── Exam ─────────────────────────────────────────────── */
export type DemoExam = {
  id: ExamId;
  title: string;
  description?: string;
  durationMinutes: number;
  questionCount: number;
  shareToken?: string;
  createdAt: string;
  updatedAt?: string;
};

export type DemoQuestion = {
  id: string;
  content: string;
  options: Record<"A" | "B" | "C" | "D", string>;
  correct: "A" | "B" | "C" | "D";
};

/* ── Room (created from exam) ─────────────────────────── */
export type RoomStatus = "waiting" | "in_progress" | "finished";

export type DemoRoom = {
  pin: RoomPin;
  examId: ExamId;
  examTitle: string;
  status: RoomStatus;
  /** ISO datetime when teacher started the room */
  startedAt?: string;
  /** ISO datetime when room ended */
  finishedAt?: string;
  createdAt: string;
};

/* ── Attempt ──────────────────────────────────────────── */
export type DemoAttempt = {
  id: AttemptId;
  examId?: ExamId;
  roomPin?: RoomPin;
  examCode: string; // kept for backward compat
  examTitle: string;
  studentEmail: string;
  startedAt: string;
  submittedAt?: string;
  status: "in_progress" | "completed" | "terminated";
  score: number;
  totalCorrect: number;
  totalQuestions: number;
  violationCount: number;
};

/* ── Violation ────────────────────────────────────────── */
export type DemoViolation = {
  id: string;
  attemptId: AttemptId;
  studentEmail: string;
  createdAt: string;
  type: ViolationType;
  description: string;
  evidenceUrl?: string;
};

/* ── Student Live Progress (simulates Socket.IO) ──────── */
export type StudentProgress = {
  studentEmail: string;
  roomPin: RoomPin;
  /** 1-indexed: which question they're currently on */
  currentQuestion: number;
  totalQuestions: number;
  /** How many they've answered so far */
  answeredCount: number;
  /** How many correct so far (calculated live) */
  correctCount: number;
  /** Current violation count */
  violationCount: number;
  /** ISO timestamp of last update */
  updatedAt: string;
};

/* ────────────────────────────────────────────────────────
 * Storage keys
 * ──────────────────────────────────────────────────────── */
const KEY_EXAMS = "smartquiz.demo.exams.v2";
const KEY_ROOMS = "smartquiz.demo.rooms.v1";
const KEY_ATTEMPTS = "smartquiz.demo.attempts.v1";
const KEY_VIOLATIONS = "smartquiz.demo.violations.v1";
const KEY_EXAM_QUESTIONS_PREFIX = "smartquiz.demo.examQuestions.v1.";
const KEY_PROGRESS_PREFIX = "smartquiz.demo.progress.v1.";

/* ────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────── */
function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  return safeParseJson<T[]>(window.localStorage.getItem(key), []);
}

function writeList<T>(key: string, list: T[]) {
  window.localStorage.setItem(key, JSON.stringify(list));
}

export function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

/** Generate PIN: 6-char uppercase alphanumeric, avoids confusing chars */
export function generatePin(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** Short share token for exams */
export function generateShareToken(): string {
  return randomId("share").slice(0, 12);
}

/* ────────────────────────────────────────────────────────
 * Exam CRUD
 * ──────────────────────────────────────────────────────── */
export function listExams(): DemoExam[] {
  return readList<DemoExam>(KEY_EXAMS).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getExam(examId: ExamId): DemoExam | undefined {
  return readList<DemoExam>(KEY_EXAMS).find((e) => e.id === examId);
}

export function upsertExam(exam: DemoExam) {
  const list = readList<DemoExam>(KEY_EXAMS);
  const index = list.findIndex((x) => x.id === exam.id);
  if (index >= 0) list[index] = exam;
  else list.push(exam);
  writeList(KEY_EXAMS, list);
}

export function deleteExam(examId: ExamId) {
  const list = readList<DemoExam>(KEY_EXAMS).filter((x) => x.id !== examId);
  writeList(KEY_EXAMS, list);
  // Also delete questions
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(`${KEY_EXAM_QUESTIONS_PREFIX}${examId}`);
  }
}

/* ── Exam Questions ───────────────────────────────────── */
export function setExamQuestions(examId: ExamId, questions: DemoQuestion[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${KEY_EXAM_QUESTIONS_PREFIX}${examId}`, JSON.stringify(questions));
}

export function getExamQuestions(examId: ExamId): DemoQuestion[] {
  if (typeof window === "undefined") return [];
  return safeParseJson<DemoQuestion[]>(
    window.localStorage.getItem(`${KEY_EXAM_QUESTIONS_PREFIX}${examId}`),
    [],
  );
}

/* ────────────────────────────────────────────────────────
 * Room CRUD
 * ──────────────────────────────────────────────────────── */
export function listRooms(): DemoRoom[] {
  return readList<DemoRoom>(KEY_ROOMS).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getRoomsByExam(examId: ExamId): DemoRoom[] {
  return listRooms().filter((r) => r.examId === examId);
}

export function getRoom(pin: RoomPin): DemoRoom | undefined {
  return readList<DemoRoom>(KEY_ROOMS).find((r) => r.pin === pin);
}

export function upsertRoom(room: DemoRoom) {
  const list = readList<DemoRoom>(KEY_ROOMS);
  const index = list.findIndex((x) => x.pin === room.pin);
  if (index >= 0) list[index] = room;
  else list.push(room);
  writeList(KEY_ROOMS, list);
}

export function createRoomForExam(examId: ExamId, examTitle: string): DemoRoom {
  const room: DemoRoom = {
    pin: generatePin(6),
    examId,
    examTitle,
    status: "waiting",
    createdAt: new Date().toISOString(),
  };
  upsertRoom(room);
  return room;
}

/* ────────────────────────────────────────────────────────
 * Attempt CRUD
 * ──────────────────────────────────────────────────────── */
export function listAttempts(): DemoAttempt[] {
  return readList<DemoAttempt>(KEY_ATTEMPTS).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function getAttemptsByRoom(pin: RoomPin): DemoAttempt[] {
  return listAttempts().filter((a) => a.roomPin === pin || a.examCode === pin);
}

export function addAttempt(attempt: DemoAttempt) {
  const list = readList<DemoAttempt>(KEY_ATTEMPTS);
  list.push(attempt);
  writeList(KEY_ATTEMPTS, list);
}

/* ────────────────────────────────────────────────────────
 * Violation CRUD
 * ──────────────────────────────────────────────────────── */
export function listViolations(): DemoViolation[] {
  return readList<DemoViolation>(KEY_VIOLATIONS).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addViolations(violations: DemoViolation[]) {
  const list = readList<DemoViolation>(KEY_VIOLATIONS);
  list.push(...violations);
  writeList(KEY_VIOLATIONS, list);
}

/* ────────────────────────────────────────────────────────
 * Student Live Progress
 * ──────────────────────────────────────────────────────── */
export function updateStudentProgress(progress: StudentProgress) {
  if (typeof window === "undefined") return;
  const key = `${KEY_PROGRESS_PREFIX}${progress.roomPin}`;
  const list = safeParseJson<StudentProgress[]>(window.localStorage.getItem(key), []);
  const idx = list.findIndex((p) => p.studentEmail === progress.studentEmail);
  if (idx >= 0) list[idx] = progress;
  else list.push(progress);
  window.localStorage.setItem(key, JSON.stringify(list));
}

export function getProgressByRoom(pin: RoomPin): StudentProgress[] {
  if (typeof window === "undefined") return [];
  return safeParseJson<StudentProgress[]>(
    window.localStorage.getItem(`${KEY_PROGRESS_PREFIX}${pin}`),
    [],
  ).sort((a, b) => b.correctCount - a.correctCount || a.updatedAt.localeCompare(b.updatedAt));
}

export function clearRoomProgress(pin: RoomPin) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${KEY_PROGRESS_PREFIX}${pin}`);
}

/* ────────────────────────────────────────────────────────
 * Housekeeping
 * ──────────────────────────────────────────────────────── */
export function clearDemoData() {
  if (typeof window === "undefined") return;
  const keys = Object.keys(window.localStorage).filter((k) => k.startsWith("smartquiz."));
  keys.forEach((k) => window.localStorage.removeItem(k));
}

/** Legacy compat: generate 6-char code (alias for generatePin) */
export function generateExamCode(length = 6): string {
  return generatePin(length);
}

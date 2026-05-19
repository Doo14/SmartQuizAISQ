/**
 * Centralized API client for SmartQuiz backend
 *
 * Backend response wrapper (ControllerResponse):
 *   { success: boolean, status: number, message: string, data: T, error: string|null }
 *
 * All helpers parse `response.data` to get the actual payload.
 * Cookies (JWT httpOnly) are sent automatically via credentials: 'include'.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Generic backend response envelope */
type ApiEnvelope<T> = {
  success: boolean;
  status: number;
  message: string;
  data: T;
  error: string | null;
};

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiEnvelope<T>> {
  const url = `${BASE}${path}`;
  const init: RequestInit = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetch(url, init);

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const json = await res.json();
      // NestJS error format: { message, statusCode, error }
      message = Array.isArray(json?.message)
        ? json.message.join(', ')
        : json?.message ?? json?.error ?? message;
    } catch { /* ignore */ }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return { success: true, status: 204, message: '', data: undefined as T, error: null };
  return res.json() as Promise<ApiEnvelope<T>>;
}

async function requestForm<T = unknown>(
  method: string,
  path: string,
  formData: FormData,
): Promise<ApiEnvelope<T>> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    credentials: 'include',
    body: formData,
    // No Content-Type — browser sets multipart boundary automatically
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const json = await res.json();
      message = Array.isArray(json?.message)
        ? json.message.join(', ')
        : json?.message ?? message;
    } catch { /* ignore */ }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<ApiEnvelope<T>>;
}

export const api = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  postForm: <T = unknown>(path: string, form: FormData) => requestForm<T>('POST', path, form),
};

/* ── Domain types ─────────────────────────────────────────────────────── */

export type UserRole = 'teacher' | 'student';

export type AuthUser = {
  id: number;
  email: string;
  username: string;
  role: UserRole;
};

export type Exam = {
  id: number;
  title: string;
  description?: string;
  durationMinutes: number;
  createdAt: string;
  questionCount: number;
  roomCount: number;
};

export type Option = {
  id: number;
  content: string;
  isCorrect: boolean;
};

export type Question = {
  id: number;
  content: string;
  options: Option[];
};

export type ExamDetail = {
  id: number;
  title: string;
  description?: string;
  durationMinutes: number;
  createdAt: string;
  questions: Question[];
  rooms: RoomSummary[];
};

export type RoomStatus = 'INACTIVE' | 'WAITING' | 'ACTIVE' | 'FINISHED';

export type RoomSummary = {
  id: number;
  code: string;
  status: RoomStatus;
  startedAt?: string;
  attemptCount?: number;
};

export type RoomDetail = {
  id: number;
  code: string;
  status: RoomStatus;
  createdAt: string;
  exam: {
    id: number;
    title: string;
    durationMinutes: number;
    questionCount: number;
  };
  attemptCount: number;
  attempts: AttemptSummary[];
};

export type AttemptSummary = {
  id: number;
  studentId: number;
  username?: string;
  correctCount: number;
  submittedAt?: string;
  answerCount: number;
  violationCount: number;
};

export type RoomPublicInfo = {
  id: number;
  code: string;
  status: RoomStatus;
  createdAt: string;
  examId: number;
  examTitle: string;
  durationMinutes: number;
};

export type HistoryItem = {
  attemptId: number;
  examTitle: string;
  durationMinutes: number;
  roomCode: string;
  correctCount: number;
  submittedAt?: string;
  violationCount: number;
};

export type TeacherStats = {
  totalExams: number;
  totalAttempts: number;
  totalViolations: number;
  violationRate: number;
};

export type ViolationTypeCode =
  | 'TAB_SWITCH'
  | 'KEYBOARD_COPY'
  | 'KEYBOARD_PASTE'
  | 'CAMERA_MULTIPLE_FACES'
  | 'CAMERA_GAZE_AWAY'
  | 'CAMERA_MISSING'
  | 'OTHER';

export type ViolationDetail = {
  id: number;
  violationType: ViolationTypeCode;
  evidenceUrl: string | null;
  timestamp: string;
};

export const VIOLATION_TYPE_LABELS: Record<ViolationTypeCode, string> = {
  TAB_SWITCH: 'Chuyển tab khỏi bài thi',
  KEYBOARD_COPY: 'Copy (Ctrl+C)',
  KEYBOARD_PASTE: 'Paste (Ctrl+V)',
  CAMERA_MULTIPLE_FACES: 'Nhiều khuôn mặt trong khung hình',
  CAMERA_GAZE_AWAY: 'Nhìn ra ngoài màn hình',
  CAMERA_MISSING: 'Không phát hiện khuôn mặt / camera',
  OTHER: 'Vi phạm khác',
};

export function normalizeViolationType(type: string): ViolationTypeCode {
  const key = type.toUpperCase().replace(/-/g, '_') as ViolationTypeCode;
  return key in VIOLATION_TYPE_LABELS ? key : 'OTHER';
}

export function getViolationLabel(type: string): string {
  return VIOLATION_TYPE_LABELS[normalizeViolationType(type)];
}

/* ── Auth ─────────────────────────────────────────────────────────────── */

export async function getMe(): Promise<AuthUser | null> {
  try {
    // Response: { success, status, message, data: { id, email, username, role }, error }
    const envelope = await api.get<{ id: number; email: string; username: string; role: string }>('/auth/me');
    const d = envelope.data;
    if (!d) return null;
    return {
      id: d.id,
      email: d.email,
      username: d.username,
      role: (d.role as string).toLowerCase() as UserRole,
    };
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  // Backend sets httpOnly cookie; response data = { token }
  await api.post<{ token: string }>('/auth/login', { email, password });
  // Cookie is now set — fetch user info
  const user = await getMe();
  if (!user) throw new ApiError(401, 'Login thành công nhưng không thể lấy thông tin người dùng');
  return user;
}

export async function register(
  email: string,
  username: string,
  password: string,
  role: 'TEACHER' | 'STUDENT',
): Promise<void> {
  await api.post('/auth/register', { email, username, password, role });
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

/* ── Exams ────────────────────────────────────────────────────────────── */

export async function listExams(): Promise<{ exams: Exam[]; total: number }> {
  // Response data: { exams: [...], total: number }
  const envelope = await api.get<{ exams: Exam[]; total: number }>('/exams');
  return envelope.data ?? { exams: [], total: 0 };
}

export async function getExamDetail(id: number): Promise<ExamDetail> {
  // exam service findOne returns Result.ok('Fetched exam', { exam }) → data = { exam: ExamDetail }
  const envelope = await api.get<{ exam: ExamDetail }>(`/exams/${id}`);
  // handle both wrapping styles defensively
  const d = envelope.data as any;
  return d?.exam ?? d;
}

export async function createExam(body: {
  title: string;
  description?: string;
  durationMinutes: number;
  questions: Array<{
    content: string;
    options: Array<{ content: string; isCorrect: boolean }>;
  }>;
}): Promise<{ id: number }> {
  const envelope = await api.post<{ id: number }>('/exams', body);
  return envelope.data;
}

export async function importExamExcel(examId: number, file: File): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  await api.postForm(`/exams/${examId}/import-excel`, form);
}

export async function generateAiQuestions(
  examId: number,
  topic: string,
  difficulty: string,
  quantity: number,
): Promise<void> {
  await api.post(`/exams/${examId}/generate-ai`, { topic, difficulty, quantity });
}

export async function generateAiQuestionsPreview(
  topic: string,
  difficulty: string,
  quantity: number,
): Promise<{ questions: any[] }> {
  const envelope = await api.post<{ questions: any[] }>('/exams/generate-ai-preview', { topic, difficulty, quantity });
  return envelope.data;
}

export async function getTeacherStats(): Promise<TeacherStats> {
  try {
    const envelope = await api.get<TeacherStats>('/exams/statistics/overview');
    return envelope.data ?? { totalExams: 0, totalAttempts: 0, totalViolations: 0, violationRate: 0 };
  } catch {
    return { totalExams: 0, totalAttempts: 0, totalViolations: 0, violationRate: 0 };
  }
}

/* ── Rooms ──────────────────────────────x──────────────────────────────── */

export async function getRoomsByExam(examId: number): Promise<RoomSummary[]> {
  try {
    const envelope = await api.get<{ rooms: RoomSummary[]; total: number }>(`/rooms?examId=${examId}`);
    return envelope.data?.rooms ?? [];
  } catch {
    return [];
  }
}

export async function createRoom(examId: number): Promise<{ id: number; code: string }> {
  const envelope = await api.post<{ id: number; code: string }>('/rooms', { examId });
  return envelope.data;
}

export async function openRoom(roomId: number): Promise<void> {
  await api.post(`/rooms/${roomId}/open`);
}

export async function getRoomDetail(roomId: number): Promise<RoomDetail> {
  const envelope = await api.get<RoomDetail>(`/rooms/${roomId}`);
  return envelope.data;
}

export async function getRoomPublicInfo(code: string): Promise<RoomPublicInfo | null> {
  try {
    const envelope = await api.get<RoomPublicInfo>(`/rooms/public/${code}`);
    return envelope.data ?? null;
  } catch {
    return null;
  }
}

/* ── Violations ───────────────────────────────────────────────────────── */

export async function getViolationsByAttempt(attemptId: number): Promise<ViolationDetail[]> {
  try {
    const envelope = await api.get<ViolationDetail[]>(`/violations?attemptId=${attemptId}`);
    const data = envelope.data;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/* ── Student history ──────────────────────────────────────────────────── */

export async function getStudentHistory(
  limit = 10,
  offset = 0,
): Promise<{ history: HistoryItem[]; total: number }> {
  try {
    const page = limit > 0 ? Math.floor(offset / limit) + 1 : 1;
    const envelope = await api.get<{ history: HistoryItem[]; total: number }>(
      `/rooms/history?page=${page}&size=${limit}`,
    );
    return envelope.data ?? { history: [], total: 0 };
  } catch {
    return { history: [], total: 0 };
  }
}

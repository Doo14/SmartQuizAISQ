/** Payload từ socket event `leaderboard` (backend RoomGateway). */
export type LeaderboardLivePayload = {
  student: { id: number; username: string };
  correctCount: number;
  answeredCount: number;
  totalQuestions: number;
};

export function applyLeaderboardAnswer<T extends {
  studentId: number;
  username: string;
  correctCount: number;
  answeredCount: number;
  totalQuestions: number;
  currentQuestion: number;
  accuracy: number;
  updatedAt: string;
  status: "in_progress" | "completed";
}>(
  prev: T[],
  payload: LeaderboardLivePayload,
  createEntry: (payload: LeaderboardLivePayload) => T,
): T[] {
  const total =
    payload.totalQuestions ||
    prev.find((e) => e.studentId === payload.student.id)?.totalQuestions ||
    0;
  const answeredCount = payload.answeredCount;
  const correctCount = payload.correctCount;
  const accuracy =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const currentQuestion = Math.min(
    answeredCount + 1,
    total > 0 ? total : answeredCount + 1,
  );
  const updatedAt = new Date().toISOString();

  const existing = prev.find((e) => e.studentId === payload.student.id);
  if (existing) {
    return prev.map((e) =>
      e.studentId === payload.student.id
        ? {
            ...e,
            correctCount,
            answeredCount,
            totalQuestions: total || e.totalQuestions,
            currentQuestion,
            accuracy,
            updatedAt,
          }
        : e,
    );
  }

  return [...prev, createEntry({ ...payload, totalQuestions: total })];
}

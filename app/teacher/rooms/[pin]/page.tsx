"use client";

import { useEffect, useState, useCallback, use } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useToast } from "@/components/ui/toast";
import {
  getRoom,
  upsertRoom,
  getAttemptsByRoom,
  getProgressByRoom,
  getExam,
  type DemoRoom,
  type DemoAttempt,
  type DemoExam,
  type StudentProgress,
} from "@/lib/demo-store";

const TEACHER_NAV = [
  { href: "/teacher", label: "Tổng quan" },
  { href: "/teacher/exams", label: "Danh sách đề" },
  { href: "/teacher/exams/new", label: "Tạo đề mới", badge: "Excel/Manual/AI" },
  { href: "/teacher/results", label: "Kết quả & Vi phạm" },
];

function statusLabel(s: DemoRoom["status"]): string {
  return s === "waiting" ? "Chờ bắt đầu" : s === "in_progress" ? "Đang thi" : "Đã kết thúc";
}

function statusBadgeVariant(s: DemoRoom["status"]): "success" | "warning" | "danger" {
  return s === "waiting" ? "success" : s === "in_progress" ? "warning" : "danger";
}

type LeaderboardEntry = {
  email: string;
  currentQuestion: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  violationCount: number;
  status: "in_progress" | "completed";
  score?: number;
  updatedAt: string;
};

export default function TeacherRoomDetailPage({ params }: { params: Promise<{ pin: string }> }) {
  const { pin } = use(params);
  const toast = useToast();

  const [room, setRoom] = useState<DemoRoom | null>(null);
  const [exam, setExam] = useState<DemoExam | null>(null);
  const [attempts, setAttempts] = useState<DemoAttempt[]>([]);
  const [liveProgress, setLiveProgress] = useState<StudentProgress[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const reload = useCallback(() => {
    const r = getRoom(pin);
    if (r) {
      setRoom(r);
      setExam(getExam(r.examId) ?? null);
      setAttempts(getAttemptsByRoom(pin));
      setLiveProgress(getProgressByRoom(pin));
    }
  }, [pin]);

  useEffect(() => {
    reload();
    const interval = setInterval(reload, 2000); // poll every 2s
    window.addEventListener("storage", reload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", reload);
    };
  }, [reload]);

  if (!room) {
    return (
      <AppShell title="Teacher Dashboard" subtitle="Phòng thi" nav={TEACHER_NAV}>
        <EmptyState
          icon="🔍"
          title="Không tìm thấy phòng thi"
          description={`Phòng thi với mã "${pin}" không tồn tại.`}
          action={{ href: "/teacher/exams", label: "Về danh sách đề", variant: "secondary" }}
        />
      </AppShell>
    );
  }

  const handleStart = () => {
    upsertRoom({ ...room, status: "in_progress", startedAt: new Date().toISOString() });
    toast.push({ title: "Đã bắt đầu!", message: "Phòng thi đang mở cho sinh viên làm bài.", variant: "success" });
    reload();
  };

  const handleFinish = () => {
    upsertRoom({ ...room, status: "finished", finishedAt: new Date().toISOString() });
    toast.push({ title: "Kết thúc phòng thi", message: "Phòng thi đã đóng.", variant: "warning" });
    reload();
  };

  // Merge live progress with completed attempts into a unified leaderboard
  const completedEmails = new Set(attempts.filter((a) => a.status === "completed").map((a) => a.studentEmail));

  const leaderboard: LeaderboardEntry[] = [
    // Completed students (from attempts)
    ...attempts
      .filter((a) => a.status === "completed")
      .map((a) => ({
        email: a.studentEmail,
        currentQuestion: a.totalQuestions,
        totalQuestions: a.totalQuestions,
        answeredCount: a.totalQuestions,
        correctCount: a.totalCorrect,
        violationCount: a.violationCount,
        status: "completed" as const,
        score: a.score,
        updatedAt: a.submittedAt || a.startedAt,
      })),
    // In-progress students (from live progress, only if not already completed)
    ...liveProgress
      .filter((p) => !completedEmails.has(p.studentEmail))
      .map((p) => ({
        email: p.studentEmail,
        currentQuestion: p.currentQuestion,
        totalQuestions: p.totalQuestions,
        answeredCount: p.answeredCount,
        correctCount: p.correctCount,
        violationCount: p.violationCount,
        status: "in_progress" as const,
        score: undefined,
        updatedAt: p.updatedAt,
      })),
  ].sort((a, b) => {
    // Completed first, then by correctCount desc
    if (a.status === "completed" && b.status !== "completed") return -1;
    if (a.status !== "completed" && b.status === "completed") return 1;
    if (a.score !== undefined && b.score !== undefined) return b.score - a.score;
    return b.correctCount - a.correctCount;
  });

  const selected = leaderboard.find((e) => e.email === selectedEmail);
  const inProgressCount = leaderboard.filter((e) => e.status === "in_progress").length;
  const completedCount = leaderboard.filter((e) => e.status === "completed").length;
  const totalViolations = leaderboard.reduce((sum, e) => sum + e.violationCount, 0);

  return (
    <AppShell title="Teacher Dashboard" subtitle={`Phòng thi ${pin}`} nav={TEACHER_NAV}>
      <div className="page-stack">
        {/* Header */}
        <div className="section-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-widest text-zinc-900">{pin}</h1>
              <Badge variant={statusBadgeVariant(room.status)}>{statusLabel(room.status)}</Badge>
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              {room.examTitle} • {exam ? `${exam.durationMinutes} phút` : "—"}
            </p>
          </div>
          <div className="flex gap-2">
            <ButtonLink href={`/teacher/rooms/${pin}/leaderboard`}>🏆 Leaderboard</ButtonLink>
            {room.status === "waiting" ? (
              <Button onClick={handleStart}>Bắt đầu thi</Button>
            ) : room.status === "in_progress" ? (
              <Button onClick={handleFinish} variant="danger">Kết thúc</Button>
            ) : null}
            {exam ? (
              <ButtonLink href={`/teacher/exams/${exam.id}`} variant="secondary">Xem đề</ButtonLink>
            ) : null}
          </div>
        </div>

        {/* PIN card (waiting state) */}
        {room.status === "waiting" ? (
          <Card shadow="green">
            <div className="py-6 text-center">
              <div className="text-sm font-bold text-zinc-500">Mã PIN phòng thi</div>
              <div className="mt-2 text-5xl font-black tracking-[0.3em] text-zinc-900">{pin}</div>
              <p className="mt-3 text-sm text-zinc-500">
                Chia sẻ mã này cho học viên để tham gia. Bấm <strong>Bắt đầu thi</strong> khi sẵn sàng.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(pin);
                    toast.push({ title: "Đã copy!", message: "PIN đã copy vào clipboard.", variant: "success" });
                  }}
                >
                  Copy PIN
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Stats */}
        <div className="bento-grid">
          <Card title="Đang làm bài" shadow="orange">
            <div className="text-3xl font-black text-zinc-900">{inProgressCount}</div>
          </Card>
          <Card title="Đã nộp" shadow="green">
            <div className="text-3xl font-black text-zinc-900">{completedCount}</div>
          </Card>
          <Card title="Vi phạm" shadow="red">
            <div className="text-3xl font-black text-zinc-900">{totalViolations}</div>
          </Card>
        </div>

        {/* Leaderboard + Submission detail */}
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* Leaderboard */}
          <Card
            title="Bảng xếp hạng — Realtime"
            description={`${leaderboard.length} student • polling 2s`}
            right={<Badge variant="success">{leaderboard.length} online</Badge>}
          >
            {leaderboard.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                {room.status === "waiting"
                  ? "Chưa có ai tham gia. Chờ học viên nhập PIN…"
                  : "Chưa có ai tham gia phòng thi này."}
              </div>
            ) : (
              <div className="grid gap-2">
                {leaderboard.map((entry, idx) => {
                  const isSelected = selectedEmail === entry.email;
                  const isCompleted = entry.status === "completed";
                  const progressPct = entry.totalQuestions > 0
                    ? Math.round((entry.answeredCount / entry.totalQuestions) * 100)
                    : 0;

                  return (
                    <button
                      key={entry.email}
                      type="button"
                      onClick={() => setSelectedEmail(entry.email)}
                      className={[
                        "flex items-center gap-3 rounded-xl border-2 border-[color:var(--border)] px-4 py-3 text-left transition-all",
                        isSelected
                          ? "bg-[color:var(--surface-mint)] shadow-[2px_2px_0_#166534]"
                          : "bg-white shadow-[3px_3px_0_#1a1a1a] hover:shadow-[5px_5px_0_#1a1a1a]",
                      ].join(" ")}
                    >
                      {/* Rank badge */}
                      <span
                        className={[
                          "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                          idx === 0
                            ? "bg-yellow-400 text-yellow-900"
                            : idx === 1
                              ? "bg-zinc-300 text-zinc-800"
                              : idx === 2
                                ? "bg-orange-300 text-orange-900"
                                : "bg-zinc-100 text-zinc-600",
                        ].join(" ")}
                      >
                        {idx + 1}
                      </span>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold text-zinc-900">{entry.email}</span>
                          {isCompleted ? (
                            <Badge variant="success">Đã nộp</Badge>
                          ) : (
                            <Badge variant="warning">Đang làm</Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                          <span>
                            Câu {entry.currentQuestion}/{entry.totalQuestions}
                          </span>
                          <span>
                            Đúng <strong className="text-emerald-600">{entry.correctCount}</strong>/{entry.answeredCount}
                          </span>
                          {entry.violationCount > 0 ? (
                            <span className="text-red-500">{entry.violationCount} vi phạm</span>
                          ) : null}
                        </div>
                        {/* Mini progress bar */}
                        {!isCompleted ? (
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-[color:var(--primary)] transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        ) : null}
                      </div>

                      {/* Score */}
                      <div className="text-right shrink-0">
                        {isCompleted && entry.score !== undefined ? (
                          <>
                            <div className="text-lg font-black text-zinc-900">{entry.score}</div>
                            <div className="text-xs text-zinc-500">điểm</div>
                          </>
                        ) : (
                          <>
                            <div className="text-lg font-black text-emerald-600">{entry.correctCount}</div>
                            <div className="text-xs text-zinc-500">đúng</div>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Right panel: submission detail */}
          <Card
            title="Chi tiết"
            description={selected ? selected.email : "Chọn student từ bảng xếp hạng"}
          >
            {selected ? (
              <div className="grid gap-4">
                {/* Status badge */}
                <div className="flex justify-center">
                  {selected.status === "completed" ? (
                    <Badge variant="success">Đã nộp bài</Badge>
                  ) : (
                    <Badge variant="warning">Đang làm bài</Badge>
                  )}
                </div>

                {/* Score / Progress cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-warm)] p-3 text-center shadow-[2px_2px_0_#1a1a1a]">
                    <div className="text-xs font-bold text-zinc-500">
                      {selected.status === "completed" ? "Điểm" : "Đúng"}
                    </div>
                    <div className="text-2xl font-black text-zinc-900">
                      {selected.status === "completed" && selected.score !== undefined
                        ? selected.score
                        : selected.correctCount}
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-warm)] p-3 text-center shadow-[2px_2px_0_#1a1a1a]">
                    <div className="text-xs font-bold text-zinc-500">Tiến độ</div>
                    <div className="text-2xl font-black text-zinc-900">
                      {selected.answeredCount}/{selected.totalQuestions}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <ProgressBar
                  value={selected.correctCount}
                  max={selected.totalQuestions}
                  color={selected.correctCount >= selected.totalQuestions / 2 ? "green" : "red"}
                  label="Tỉ lệ đúng"
                />

                <ProgressBar
                  value={selected.answeredCount}
                  max={selected.totalQuestions}
                  color="orange"
                  label="Tiến độ làm bài"
                />

                {/* Detail rows */}
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Câu hiện tại</span>
                    <span className="font-bold text-zinc-900">{selected.currentQuestion}/{selected.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Đã trả lời</span>
                    <span className="font-bold text-zinc-900">{selected.answeredCount} câu</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Đúng</span>
                    <span className="font-bold text-emerald-600">{selected.correctCount} câu</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Vi phạm</span>
                    <Badge variant={selected.violationCount > 0 ? "warning" : "default"}>
                      {selected.violationCount}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-zinc-400">
                Chọn một student từ bảng xếp hạng bên trái để xem chi tiết tiến độ.
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

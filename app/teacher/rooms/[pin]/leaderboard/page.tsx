"use client";

import { useEffect, useState, useCallback, use, useMemo } from "react";
import Link from "next/link";
import {
  getRoom,
  getAttemptsByRoom,
  getProgressByRoom,
  getExam,
  type DemoRoom,
  type DemoAttempt,
  type DemoExam,
  type StudentProgress,
} from "@/lib/demo-store";

type TabKey = "score" | "accuracy";

type LeaderboardEntry = {
  email: string;
  currentQuestion: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  violationCount: number;
  status: "in_progress" | "completed";
  score?: number;
  accuracy: number;
  updatedAt: string;
};

/* ── Rank medal helpers ─────────────────────────────── */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-400 bg-gradient-to-br from-amber-300 to-yellow-500 shadow-[2px_2px_0_#1a1a1a]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#92400e" stroke="none">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
          <path d="M5 19a1 1 0 011-1h12a1 1 0 011 1v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1z" />
        </svg>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-zinc-400 bg-gradient-to-br from-zinc-200 to-zinc-400 shadow-[2px_2px_0_#1a1a1a]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#57534e" stroke="none">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
          <path d="M5 19a1 1 0 011-1h12a1 1 0 011 1v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1z" />
        </svg>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-orange-400 bg-gradient-to-br from-orange-200 to-orange-400 shadow-[2px_2px_0_#1a1a1a]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#9a3412" stroke="none">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
          <path d="M5 19a1 1 0 011-1h12a1 1 0 011 1v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[color:var(--border)] bg-zinc-100 shadow-[2px_2px_0_#1a1a1a]">
      <span className="text-sm font-black text-zinc-500">{rank}</span>
    </div>
  );
}

/* ── Avatar from email ──────────────────────────────── */
function StudentAvatar({ email }: { email: string }) {
  const colors = [
    "from-emerald-400 to-green-600",
    "from-amber-400 to-orange-500",
    "from-sky-400 to-blue-600",
    "from-rose-400 to-red-500",
    "from-violet-400 to-purple-600",
    "from-teal-400 to-cyan-600",
  ];
  const hash = email.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colorClass = colors[hash % colors.length];
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-[color:var(--border)] bg-gradient-to-br ${colorClass} text-sm font-black text-white shadow-[2px_2px_0_#1a1a1a]`}
    >
      {initials}
    </div>
  );
}

/* ── Time since helper ──────────────────────────────── */
function timeSince(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 5) return "vừa xong";
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m trước`;
  return `${Math.floor(diff / 3600)}h trước`;
}

export default function LeaderboardPage({
  params,
}: {
  params: Promise<{ pin: string }>;
}) {
  const { pin } = use(params);

  const [room, setRoom] = useState<DemoRoom | null>(null);
  const [exam, setExam] = useState<DemoExam | null>(null);
  const [attempts, setAttempts] = useState<DemoAttempt[]>([]);
  const [liveProgress, setLiveProgress] = useState<StudentProgress[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [tab, setTab] = useState<TabKey>("score");

  const reload = useCallback(() => {
    const r = getRoom(pin);
    if (r) {
      setRoom(r);
      setExam(getExam(r.examId) ?? null);
      setAttempts(getAttemptsByRoom(pin));
      setLiveProgress(getProgressByRoom(pin));
      setLastUpdated(new Date().toISOString());
    }
  }, [pin]);

  useEffect(() => {
    reload();
    const interval = setInterval(reload, 2000);
    window.addEventListener("storage", reload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", reload);
    };
  }, [reload]);

  // Merge live progress with completed attempts
  const leaderboard: LeaderboardEntry[] = useMemo(() => {
    const completedEmails = new Set(
      attempts.filter((a) => a.status === "completed").map((a) => a.studentEmail),
    );

    const entries: LeaderboardEntry[] = [
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
          accuracy: a.totalQuestions > 0 ? Math.round((a.totalCorrect / a.totalQuestions) * 100) : 0,
          updatedAt: a.submittedAt || a.startedAt,
        })),
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
          accuracy: p.answeredCount > 0 ? Math.round((p.correctCount / p.answeredCount) * 100) : 0,
          updatedAt: p.updatedAt,
        })),
    ];

    if (tab === "accuracy") {
      return entries.sort((a, b) => b.accuracy - a.accuracy || b.correctCount - a.correctCount);
    }
    return entries.sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return -1;
      if (a.status !== "completed" && b.status === "completed") return 1;
      if (a.score !== undefined && b.score !== undefined) return b.score - a.score;
      return b.correctCount - a.correctCount;
    });
  }, [attempts, liveProgress, tab]);

  const [updateLabel, setUpdateLabel] = useState("vừa xong");
  useEffect(() => {
    const t = setInterval(() => setUpdateLabel(timeSince(lastUpdated)), 1000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  /* ── NOT FOUND ────────────────────────────────────── */
  if (!room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--header-bg)] p-8 text-center">
        <div className="text-6xl">🔍</div>
        <h1 className="mt-4 text-3xl font-black text-white">Không tìm thấy phòng thi</h1>
        <p className="mt-2 text-white/60">PIN "{pin}" không tồn tại.</p>
        <Link
          href="/teacher/exams"
          className="mt-6 rounded-full border-2 border-[color:var(--border)] bg-white px-6 py-3 text-sm font-bold text-zinc-900 shadow-[4px_4px_0_#1a1a1a] transition hover:shadow-[6px_6px_0_#1a1a1a]"
        >
          Về danh sách đề
        </Link>
      </div>
    );
  }

  const statusText =
    room.status === "waiting"
      ? "Chờ bắt đầu"
      : room.status === "in_progress"
        ? "Đang thi"
        : "Đã kết thúc";

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--header-bg)]">
      {/* ── TOP BAR ─────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/teacher/rooms/${pin}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/20 text-white/80 transition hover:bg-white/10 hover:text-white"
            title="Quay lại phòng thi"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <span className="text-sm font-bold text-white">{room.examTitle}</span>
            <span className="ml-2 text-xs text-white/50">PIN: {pin}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
            {statusText}
          </span>
          <span className="text-xs text-white/50">Cập nhật {updateLabel}</span>
        </div>
      </header>

      {/* ── HERO SECTION ────────────────────────────── */}
      <div className="relative overflow-hidden px-6 pb-6 pt-10 text-center">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Stars */}
          <div className="absolute left-[10%] top-[15%] text-2xl opacity-60">⭐</div>
          <div className="absolute right-[15%] top-[10%] text-lg opacity-40">⭐</div>
          <div className="absolute left-[25%] top-[5%] text-sm opacity-30">✦</div>
          <div className="absolute right-[30%] top-[20%] text-sm opacity-30">✦</div>
          {/* Garland-like curved line */}
          <svg className="absolute left-0 top-0 w-full opacity-20" height="60" viewBox="0 0 1200 60" fill="none">
            <path
              d="M0 40 Q150 0 300 40 Q450 80 600 40 Q750 0 900 40 Q1050 80 1200 40"
              stroke="white"
              strokeWidth="2"
              strokeDasharray="8 4"
            />
          </svg>
          {/* Small dots decoration */}
          <svg className="absolute bottom-0 left-0 w-full opacity-15" height="20" viewBox="0 0 1200 20" fill="none">
            {Array.from({ length: 40 }).map((_, i) => (
              <circle key={i} cx={15 + i * 30} cy="10" r="3" fill="#F59E0B" />
            ))}
          </svg>
        </div>

        <h1 className="relative text-4xl font-black tracking-wider text-white sm:text-5xl md:text-6xl">
          LEADERBOARD
        </h1>

        {/* Tab switcher */}
        <div className="relative mt-5 inline-flex overflow-hidden rounded-full border-2 border-[color:var(--border)] bg-white/10 shadow-[3px_3px_0_#1a1a1a]">
          <button
            type="button"
            onClick={() => setTab("score")}
            className={[
              "px-6 py-2.5 text-sm font-bold transition-all",
              tab === "score"
                ? "bg-white text-zinc-900 shadow-inner"
                : "text-white/80 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            Điểm số
          </button>
          <button
            type="button"
            onClick={() => setTab("accuracy")}
            className={[
              "px-6 py-2.5 text-sm font-bold transition-all",
              tab === "accuracy"
                ? "bg-white text-zinc-900 shadow-inner"
                : "text-white/80 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            Độ chính xác
          </button>
        </div>

        {/* Column labels */}
        <div className="relative mx-auto mt-6 grid max-w-2xl grid-cols-[60px_1fr_140px_100px] items-center gap-3 px-2 text-xs font-bold uppercase tracking-wider text-white/60">
          <span>Rank</span>
          <span className="text-left">Participants</span>
          <span>Tiến độ</span>
          <span>{tab === "score" ? "Điểm" : "Chính xác"}</span>
        </div>
      </div>

      {/* ── LEADERBOARD ROWS ────────────────────────── */}
      <div className="relative flex-1 px-4 pb-10 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-3">
          {leaderboard.length === 0 ? (
            <div className="mt-10 rounded-2xl border-2 border-[color:var(--border)] bg-white/10 p-10 text-center shadow-[4px_4px_0_#1a1a1a]">
              <div className="text-4xl">👥</div>
              <h3 className="mt-3 text-lg font-bold text-white">Chưa có ai tham gia</h3>
              <p className="mt-1 text-sm text-white/50">
                Chờ học viên nhập mã PIN <strong className="text-white">{pin}</strong> để vào phòng thi…
              </p>
            </div>
          ) : (
            leaderboard.map((entry, idx) => {
              const rank = idx + 1;
              const isTop3 = rank <= 3;
              const progressPct =
                entry.totalQuestions > 0
                  ? Math.round((entry.answeredCount / entry.totalQuestions) * 100)
                  : 0;

              return (
                <div
                  key={entry.email}
                  className={[
                    "grid grid-cols-[60px_1fr_140px_100px] items-center gap-3 rounded-2xl border-2 border-[color:var(--border)] px-4 py-4 transition-all",
                    isTop3
                      ? "bg-white shadow-[5px_5px_0_#1a1a1a]"
                      : "bg-white/95 shadow-[4px_4px_0_#1a1a1a]",
                    rank === 1 ? "scale-[1.02]" : "",
                  ].join(" ")}
                >
                  {/* Rank */}
                  <div className="flex justify-center">
                    <RankBadge rank={rank} />
                  </div>

                  {/* Participant */}
                  <div className="flex items-center gap-3 min-w-0">
                    <StudentAvatar email={entry.email} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-zinc-900">
                        {entry.email.split("@")[0]}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        {entry.status === "completed" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--primary-surface)] px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            ✓ Đã nộp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--accent-surface)] px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            ⏳ Đang làm
                          </span>
                        )}
                        {entry.violationCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--danger-surface)] px-2 py-0.5 text-[10px] font-bold text-red-600">
                            ⚠ {entry.violationCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="text-center">
                    <div className="text-xs font-bold text-zinc-700">
                      Câu {entry.currentQuestion}/{entry.totalQuestions}
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-500">
                      Đã trả lời {entry.answeredCount} • Đúng {entry.correctCount}
                    </div>
                    {/* Mini progress bar */}
                    <div className="mx-auto mt-1.5 h-2 w-full overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[color:var(--primary)] to-[color:var(--primary-light)] transition-all duration-700"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Score / Accuracy */}
                  <div className="flex items-center justify-center gap-1.5">
                    {tab === "score" ? (
                      <>
                        <span className="text-xl">⭐</span>
                        <span className="text-2xl font-black text-zinc-900">
                          {entry.score !== undefined ? entry.score : entry.correctCount}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">🎯</span>
                        <span className="text-2xl font-black text-zinc-900">{entry.accuracy}%</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── BOTTOM BAR ──────────────────────────────── */}
      <footer className="border-t border-white/10 px-6 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span>
              👥 {leaderboard.length} student{leaderboard.length !== 1 ? "s" : ""}
            </span>
            <span>
              ✅ {leaderboard.filter((e) => e.status === "completed").length} đã nộp
            </span>
            <span>
              ⏳ {leaderboard.filter((e) => e.status === "in_progress").length} đang làm
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-white/60">LIVE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

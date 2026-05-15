"use client";

import { useEffect, useState, useCallback, use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getRoomDetail, type RoomDetail } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";

type TabKey = "score" | "accuracy";

type LeaderboardEntry = {
  studentId: number;
  username: string;
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

function buildEntriesFromRoom(room: RoomDetail): LeaderboardEntry[] {
  const total = room.exam.questionCount;
  return room.attempts.map((a) => {
    const completed = Boolean(a.submittedAt);
    const answeredCount = a.answerCount;
    return {
      studentId: a.studentId,
      username: a.username ?? `Student #${a.studentId}`,
      currentQuestion: completed ? total : Math.min(answeredCount + 1, total),
      totalQuestions: total,
      answeredCount,
      correctCount: a.correctCount,
      violationCount: a.violationCount,
      status: completed ? "completed" : "in_progress",
      score:
        completed && total > 0
          ? parseFloat(((a.correctCount / total) * 10).toFixed(1))
          : undefined,
      accuracy:
        answeredCount > 0 ? Math.round((a.correctCount / answeredCount) * 100) : 0,
      updatedAt: a.submittedAt ?? new Date().toISOString(),
    };
  });
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const medals = ["🥇", "🥈", "🥉"];
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[color:var(--border)] bg-white text-xl shadow-[2px_2px_0_#1a1a1a]">
        {medals[rank - 1]}
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[color:var(--border)] bg-zinc-100 shadow-[2px_2px_0_#1a1a1a]">
      <span className="text-sm font-black text-zinc-500">{rank}</span>
    </div>
  );
}

function StudentAvatar({ name }: { name: string }) {
  const colors = [
    "from-emerald-400 to-green-600",
    "from-amber-400 to-orange-500",
    "from-sky-400 to-blue-600",
    "from-rose-400 to-red-500",
    "from-violet-400 to-purple-600",
    "from-teal-400 to-cyan-600",
  ];
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colorClass = colors[hash % colors.length];
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-[color:var(--border)] bg-gradient-to-br ${colorClass} text-sm font-black text-white shadow-[2px_2px_0_#1a1a1a]`}
    >
      {initials}
    </div>
  );
}

function timeSince(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 5) return "vừa xong";
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m trước`;
  return `${Math.floor(diff / 3600)}h trước`;
}

function statusLabel(s: string) {
  if (s === "WAITING") return "Chờ bắt đầu";
  if (s === "ACTIVE") return "Đang thi";
  if (s === "FINISHED") return "Đã kết thúc";
  return "Chưa mở";
}

export default function LeaderboardPage({
  params,
}: {
  params: Promise<{ pin: string }>;
}) {
  const { pin: roomIdStr } = use(params);
  const roomId = Number(roomIdStr);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [tab, setTab] = useState<TabKey>("score");

  const loadRoom = useCallback(async () => {
    try {
      const r = await getRoomDetail(roomId);
      setRoom(r);
      setLeaderboard(buildEntriesFromRoom(r));
      setLastUpdated(new Date().toISOString());
    } catch {
      setRoom(null);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "teacher") {
      router.push("/student");
      return;
    }
    loadRoom();
  }, [user, authLoading, router, loadRoom]);

  useEffect(() => {
    if (!room) return;
    const s = connectSocket();

    s.emit("join", { code: room.code });

    s.on("leaderboard", (payload: { student: { id: number; username: string }; correctCount: number }) => {
      setLeaderboard((prev) => {
        const total = room.exam.questionCount;
        const existing = prev.find((e) => e.studentId === payload.student.id);
        if (existing) {
          const answeredCount = existing.answeredCount + 1;
          return prev.map((e) =>
            e.studentId === payload.student.id
              ? {
                  ...e,
                  correctCount: payload.correctCount,
                  answeredCount,
                  currentQuestion: Math.min(answeredCount + 1, total),
                  accuracy:
                    answeredCount > 0
                      ? Math.round((payload.correctCount / answeredCount) * 100)
                      : 0,
                  updatedAt: new Date().toISOString(),
                }
              : e,
          );
        }
        return [
          ...prev,
          {
            studentId: payload.student.id,
            username: payload.student.username,
            correctCount: payload.correctCount,
            answeredCount: 1,
            currentQuestion: 2,
            totalQuestions: total,
            violationCount: 0,
            status: "in_progress" as const,
            accuracy: payload.correctCount > 0 ? 100 : 0,
            updatedAt: new Date().toISOString(),
          },
        ];
      });
      setLastUpdated(new Date().toISOString());
    });

    s.on(
      "student_submit",
      (payload: {
        student: { id: number; username: string };
        correctCount?: number;
        totalQuestions?: number;
      }) => {
        const total = payload.totalQuestions ?? room.exam.questionCount;
        const correct = payload.correctCount ?? 0;
        setLeaderboard((prev) =>
          prev.map((e) =>
            e.studentId === payload.student.id
              ? {
                  ...e,
                  status: "completed" as const,
                  correctCount: correct,
                  answeredCount: total,
                  currentQuestion: total,
                  totalQuestions: total,
                  score: total > 0 ? parseFloat(((correct / total) * 10).toFixed(1)) : 0,
                  accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
                  updatedAt: new Date().toISOString(),
                }
              : e,
          ),
        );
        setLastUpdated(new Date().toISOString());
      },
    );

    s.on("student_join", () => loadRoom());

    s.on("log_violation", (payload: { student: { id: number } }) => {
      setLeaderboard((prev) =>
        prev.map((e) =>
          e.studentId === payload.student.id
            ? { ...e, violationCount: e.violationCount + 1 }
            : e,
        ),
      );
    });

    s.on("room_start", () => loadRoom());
    s.on("room_time_up", () => loadRoom());

    return () => {
      s.emit("leave", { id: roomId });
      s.off("leaderboard");
      s.off("student_submit");
      s.off("student_join");
      s.off("log_violation");
      s.off("room_start");
      s.off("room_time_up");
      disconnectSocket();
    };
  }, [room, roomId, loadRoom]);

  const sorted = useMemo(() => {
    const entries = [...leaderboard];
    if (tab === "accuracy") {
      return entries.sort((a, b) => b.accuracy - a.accuracy || b.correctCount - a.correctCount);
    }
    return entries.sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return -1;
      if (a.status !== "completed" && b.status === "completed") return 1;
      const scoreA = a.score ?? a.correctCount;
      const scoreB = b.score ?? b.correctCount;
      return scoreB - scoreA;
    });
  }, [leaderboard, tab]);

  const [updateLabel, setUpdateLabel] = useState("vừa xong");
  useEffect(() => {
    const t = setInterval(() => setUpdateLabel(timeSince(lastUpdated)), 1000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--header-bg)] text-white">
        Đang tải bảng xếp hạng...
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--header-bg)] p-8 text-center">
        <div className="text-6xl">🔍</div>
        <h1 className="mt-4 text-3xl font-black text-white">Không tìm thấy phòng thi</h1>
        <Link
          href="/teacher/exams"
          className="mt-6 rounded-full border-2 border-[color:var(--border)] bg-white px-6 py-3 text-sm font-bold text-zinc-900 shadow-[4px_4px_0_#1a1a1a]"
        >
          Về danh sách đề
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--header-bg)]">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/teacher/rooms/${roomId}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/20 text-white/80 transition hover:bg-white/10"
          >
            ←
          </Link>
          <div>
            <span className="text-sm font-bold text-white">{room.exam.title}</span>
            <span className="ml-2 text-xs text-white/50">PIN: {room.code}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
            {statusLabel(room.status)}
          </span>
          <span className="text-xs text-white/50">Cập nhật {updateLabel}</span>
        </div>
      </header>

      <div className="px-6 pb-6 pt-10 text-center">
        <h1 className="text-4xl font-black tracking-wider text-white sm:text-5xl">LEADERBOARD</h1>
        <div className="mt-5 inline-flex overflow-hidden rounded-full border-2 border-[color:var(--border)] bg-white/10 shadow-[3px_3px_0_#1a1a1a]">
          <button
            type="button"
            onClick={() => setTab("score")}
            className={`px-6 py-2.5 text-sm font-bold ${tab === "score" ? "bg-white text-zinc-900" : "text-white/80"}`}
          >
            Điểm số
          </button>
          <button
            type="button"
            onClick={() => setTab("accuracy")}
            className={`px-6 py-2.5 text-sm font-bold ${tab === "accuracy" ? "bg-white text-zinc-900" : "text-white/80"}`}
          >
            Độ chính xác
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 pb-10 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-3">
          {sorted.length === 0 ? (
            <div className="mt-10 rounded-2xl border-2 border-[color:var(--border)] bg-white/10 p-10 text-center">
              <h3 className="text-lg font-bold text-white">Chưa có ai tham gia</h3>
              <p className="mt-1 text-sm text-white/50">
                Chờ học viên nhập mã PIN <strong className="text-white">{room.code}</strong>
              </p>
            </div>
          ) : (
            sorted.map((entry, idx) => {
              const rank = idx + 1;
              const progressPct =
                entry.totalQuestions > 0
                  ? Math.round((entry.answeredCount / entry.totalQuestions) * 100)
                  : 0;
              return (
                <div
                  key={entry.studentId}
                  className="grid grid-cols-[60px_1fr_140px_100px] items-center gap-3 rounded-2xl border-2 border-[color:var(--border)] bg-white px-4 py-4 shadow-[4px_4px_0_#1a1a1a]"
                >
                  <RankBadge rank={rank} />
                  <div className="flex min-w-0 items-center gap-3">
                    <StudentAvatar name={entry.username} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-zinc-900">{entry.username}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {entry.status === "completed" ? "✓ Đã nộp" : "⏳ Đang làm"}
                        {entry.violationCount > 0 ? ` • ⚠ ${entry.violationCount}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-xs font-bold text-zinc-700">
                    Câu {entry.currentQuestion}/{entry.totalQuestions}
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center text-2xl font-black text-zinc-900">
                    {tab === "score"
                      ? entry.score !== undefined
                        ? entry.score
                        : entry.correctCount
                      : `${entry.accuracy}%`}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <footer className="border-t border-white/10 px-6 py-3 text-center text-xs text-white/50">
        <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        LIVE — {sorted.filter((e) => e.status === "completed").length}/{sorted.length} đã nộp
      </footer>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getRoomDetail, getViolationsByAttempt, getViolationLabel, type RoomDetail, type ViolationDetail } from "@/lib/api";
import { applyLeaderboardAnswer } from "@/lib/leaderboard-live";
import { connectSocket, leaveQuizSocketRoom, roomIdentification } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { AlertTriangle, Flame, X, ShieldAlert, Award, TrendingUp, BarChart2 } from "lucide-react";

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
  attemptId?: number;
};

function buildEntriesFromRoom(room: RoomDetail): LeaderboardEntry[] {
  const total = room.exam.questionCount;
  return room.attempts.map((a) => {
    const completed = Boolean(a.submittedAt);
    const answeredCount = a.answerCount;
    return {
      studentId: a.studentId,
      attemptId: a.id,
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

function StudentAvatar({ name, className = "h-11 w-11 text-sm" }: { name: string, className?: string }) {
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
      className={`flex items-center justify-center rounded-full border-2 border-[color:var(--border)] bg-gradient-to-br ${colorClass} font-black text-white shadow-[2px_2px_0_#1a1a1a] ${className}`}
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
  
  // Real-time detailed logs for clicked student
  const [selectedStudent, setSelectedStudent] = useState<LeaderboardEntry | null>(null);
  const [violations, setViolations] = useState<ViolationDetail[]>([]);
  const [loadingViolations, setLoadingViolations] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const roomCode = room?.code;
  const totalQuestions = room?.exam.questionCount ?? 0;
  const roomStatus = room?.status;

  useEffect(() => {
    if (!roomCode) return;
    const s = connectSocket();
    if (!s.connected) s.connect();

    s.emit("join", roomIdentification(roomCode, roomId));

    s.on("leaderboard", (payload: {
      student: { id: number; username: string };
      correctCount: number;
      answeredCount: number;
      totalQuestions: number;
    }) => {
      setLeaderboard((prev) =>
        applyLeaderboardAnswer(prev, payload, (p) => ({
          studentId: p.student.id,
          username: p.student.username,
          correctCount: p.correctCount,
          answeredCount: p.answeredCount,
          totalQuestions: p.totalQuestions || totalQuestions,
          currentQuestion: Math.min(
            p.answeredCount + 1,
            p.totalQuestions || totalQuestions || 1,
          ),
          violationCount: 0,
          status: "in_progress" as const,
          accuracy:
            p.answeredCount > 0
              ? Math.round((p.correctCount / p.answeredCount) * 100)
              : 0,
          updatedAt: new Date().toISOString(),
        })),
      );
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
        setLeaderboard((prev) => {
          const next = prev.map((e) =>
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
          );
          return next;
        });
        setLastUpdated(new Date().toISOString());
      },
    );

    s.on(
      "student_join",
      (payload: { id: number; username: string; attemptId?: number }) => {
        setLeaderboard((prev) => {
          if (prev.some((e) => e.studentId === payload.id)) return prev;
          return [
            ...prev,
            {
              studentId: payload.id,
              attemptId: payload.attemptId,
              username: payload.username,
              correctCount: 0,
              answeredCount: 0,
              totalQuestions,
              currentQuestion: 1,
              violationCount: 0,
              status: "in_progress" as const,
              accuracy: 0,
              updatedAt: new Date().toISOString(),
            },
          ];
        });
        setLastUpdated(new Date().toISOString());
      },
    );

    s.on("log_violation", (payload: { student: { id: number }; attemptId?: number }) => {
      setLeaderboard((prev) =>
        prev.map((e) =>
          e.studentId === payload.student.id
            ? { 
                ...e, 
                violationCount: e.violationCount + 1,
                attemptId: payload.attemptId ?? e.attemptId
              }
            : e,
        ),
      );
      // Update selectedStudent dynamically if they are being viewed
      setSelectedStudent((prev) => {
        if (prev && prev.studentId === payload.student.id) {
          return { 
            ...prev, 
            violationCount: prev.violationCount + 1,
            attemptId: payload.attemptId ?? prev.attemptId
          };
        }
        return prev;
      });
    });

    s.on("room_start", () => void loadRoom());
    s.on("room_time_up", () => void loadRoom());
    s.on("force_submit", () => void loadRoom());

    s.on("room_ended", () => {
      setRoom((prev) => (prev ? { ...prev, status: "FINISHED" } : prev));
      void loadRoom();
    });

    return () => {
      leaveQuizSocketRoom(roomCode, roomId);
      s.off("leaderboard");
      s.off("student_submit");
      s.off("student_join");
      s.off("log_violation");
      s.off("room_start");
      s.off("room_time_up");
      s.off("force_submit");
      s.off("room_ended");
    };
  }, [roomCode, roomId, totalQuestions, loadRoom]);

  /* Đồng bộ modal chi tiết khi leaderboard cập nhật realtime */
  useEffect(() => {
    setSelectedStudent((prev) => {
      if (!prev) return null;
      return leaderboard.find((e) => e.studentId === prev.studentId) ?? prev;
    });
  }, [leaderboard]);

  /* Fallback nhẹ khi đang thi (phòng hờ socket trễ) */
  useEffect(() => {
    if (roomStatus !== "ACTIVE") return;
    const timer = setInterval(() => void loadRoom(), 8000);
    return () => clearInterval(timer);
  }, [roomStatus, loadRoom]);

  // Fetch detailed violation data when selectedStudent changes
  useEffect(() => {
    if (!selectedStudent || !selectedStudent.attemptId) {
      setViolations([]);
      return;
    }
    
    let active = true;
    const fetchViolations = async () => {
      setLoadingViolations(true);
      try {
        const list = await getViolationsByAttempt(selectedStudent.attemptId!);
        if (active) {
          setViolations(list);
        }
      } catch (err) {
        console.error("Failed to fetch violations:", err);
      } finally {
        if (active) {
          setLoadingViolations(false);
        }
      }
    };
    
    fetchViolations();
    return () => {
      active = false;
    };
  }, [selectedStudent?.attemptId, selectedStudent?.violationCount]);

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

  const isFinished =
    room.status === "FINISHED" ||
    (sorted.length > 0 && sorted.every((s) => s.status === "completed"));

  const top3 = sorted.slice(0, 3);
  const remaining = sorted.slice(3);

  const podiumOrder = [
    top3[1] || null, // 2nd
    top3[0] || null, // 1st
    top3[2] || null, // 3rd
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--header-bg)] pb-10">
      {isFinished && windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.15}
        />
      )}

      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3 relative z-10">
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

      <div className="px-6 pb-4 pt-10 text-center relative z-10">
        <h1 className="text-4xl font-black tracking-wider text-white sm:text-5xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">LEADERBOARD</h1>
        <div className="mt-5 inline-flex overflow-hidden rounded-full border-2 border-[color:var(--border)] bg-white/10 shadow-[3px_3px_0_#1a1a1a]">
          <button
            type="button"
            onClick={() => setTab("score")}
            className={`px-6 py-2.5 text-sm font-bold transition-all ${tab === "score" ? "bg-white text-zinc-900" : "text-white/80 hover:bg-white/20"}`}
          >
            Điểm số
          </button>
          <button
            type="button"
            onClick={() => setTab("accuracy")}
            className={`px-6 py-2.5 text-sm font-bold transition-all ${tab === "accuracy" ? "bg-white text-zinc-900" : "text-white/80 hover:bg-white/20"}`}
          >
            Độ chính xác
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 relative z-10 max-w-4xl mx-auto w-full">
        {/* TOP 3 PODIUM */}
        {sorted.length > 0 && (
          <div className="mb-12 flex items-end justify-center gap-2 sm:gap-6 pt-4">
            {podiumOrder.map((entry, idx) => {
              if (!entry) return <div key={idx} className="w-24 sm:w-32" />;
              
              const isFirst = idx === 1;
              const isSecond = idx === 0;
              const rank = isFirst ? 1 : isSecond ? 2 : 3;
              const height = isFirst ? "h-40 sm:h-48" : isSecond ? "h-32 sm:h-40" : "h-24 sm:h-32";
              const color = isFirst 
                ? "bg-gradient-to-t from-amber-500 to-amber-300" 
                : isSecond 
                  ? "bg-gradient-to-t from-zinc-400 to-zinc-200" 
                  : "bg-gradient-to-t from-amber-800 to-amber-600/80";
              const isOnFire = entry.accuracy >= 80 && entry.answeredCount >= 3;

              return (
                <div 
                  key={entry.studentId}
                  className="flex flex-col items-center"
                >
                  <div 
                    onClick={() => setSelectedStudent(entry)}
                    className="relative mb-3 flex flex-col items-center cursor-pointer hover:-translate-y-2 transition-transform duration-300 group"
                  >
                    {entry.violationCount > 0 && (
                      <div className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md animate-pulse">
                        <AlertTriangle size={14} />
                      </div>
                    )}
                    {isOnFire && (
                      <div className="absolute -left-3 -top-2 z-10 text-orange-400 drop-shadow-md animate-bounce">
                        <Flame size={28} fill="currentColor" />
                      </div>
                    )}
                    
                    <StudentAvatar name={entry.username} className={isFirst ? "h-20 w-20 text-2xl border-4 ring-4 ring-amber-400/40" : "h-16 w-16 text-lg border-4"} />
                    
                    <div className="mt-2 w-24 truncate text-center text-xs font-black text-white sm:text-sm drop-shadow-md group-hover:underline">
                      {entry.username}
                    </div>
                    <div className="text-[11px] font-black text-white bg-black/40 px-2 py-0.5 rounded-full mt-1 border border-white/10">
                      {tab === "score" ? (entry.score !== undefined ? entry.score : entry.correctCount) : `${entry.accuracy}%`}
                    </div>
                  </div>
                  <div
                    className={`flex w-24 flex-col items-center justify-start rounded-t-2xl sm:w-32 ${height} ${color} border-2 border-[color:var(--border)] shadow-[4px_4px_0_#1a1a1a]`}
                  >
                    <span className="mt-4 text-4xl font-black text-black/20">{rank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* REMAINING STUDENTS LIST */}
        <div className="mx-auto max-w-2xl space-y-3">
          {remaining.length === 0 && sorted.length === 0 ? (
            <div className="mt-10 rounded-2xl border-2 border-[color:var(--border)] bg-white/10 p-10 text-center">
              <h3 className="text-lg font-bold text-white">Chưa có ai tham gia</h3>
              <p className="mt-1 text-sm text-white/50">
                Chờ học viên nhập mã PIN <strong className="text-white">{room.code}</strong>
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {remaining.map((entry, idx) => {
                const rank = idx + 4;
                const progressPct =
                  entry.totalQuestions > 0
                    ? Math.round((entry.answeredCount / entry.totalQuestions) * 100)
                    : 0;
                const isCheater = entry.violationCount > 0;
                const isOnFire = entry.accuracy >= 80 && entry.answeredCount >= 3;

                return (
                  <motion.div
                    key={entry.studentId}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    onClick={() => setSelectedStudent(entry)}
                    className={`grid grid-cols-[50px_1fr_140px_80px] sm:grid-cols-[60px_1fr_140px_100px] items-center gap-3 rounded-2xl border-2 cursor-pointer transition-all hover:-translate-y-0.5 px-4 py-4 shadow-[4px_4px_0_#1a1a1a] ${
                      isCheater
                        ? "border-red-500 bg-red-50/90 hover:bg-red-100"
                        : "border-[color:var(--border)] bg-white hover:bg-zinc-50"
                    }`}
                  >
                    <RankBadge rank={rank} />
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative">
                        {isCheater && (
                          <div className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm animate-pulse">
                            <AlertTriangle size={10} />
                          </div>
                        )}
                        {isOnFire && (
                          <div className="absolute -left-1 -top-1 z-10 text-orange-500 drop-shadow-sm">
                            <Flame size={20} fill="currentColor" />
                          </div>
                        )}
                        <StudentAvatar name={entry.username} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-zinc-900">{entry.username}</div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
                          {entry.status === "completed" ? "✓ Đã nộp" : "⏳ Đang làm"}
                          {isCheater && (
                            <span className="font-bold text-red-600 ml-1 bg-red-100 px-1.5 py-0.2 rounded-full">• ⚠ {entry.violationCount} vi phạm</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-xs font-bold text-zinc-700 hidden sm:block">
                      Câu {entry.currentQuestion}/{entry.totalQuestions}
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right sm:text-center text-xl sm:text-2xl font-black text-zinc-900">
                      {tab === "score"
                        ? entry.score !== undefined
                          ? entry.score
                          : entry.correctCount
                        : `${entry.accuracy}%`}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* STUDENT DETAIL MODAL */}
      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl border-4 border-[color:var(--border)] bg-white p-6 shadow-[8px_8px_0_#1a1a1a]"
            >
              <button
                className="absolute right-4 top-4 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                onClick={() => setSelectedStudent(null)}
              >
                <X size={24} />
              </button>
              
              <div className="flex flex-col items-center text-center">
                <StudentAvatar name={selectedStudent.username} className="h-20 w-20 text-2xl border-4 ring-4 ring-zinc-200/50" />
                <h2 className="mt-4 text-3xl font-black text-zinc-900 tracking-tight">{selectedStudent.username}</h2>
                <div className="mt-2 flex items-center justify-center gap-2 text-xs font-bold">
                  <span className="bg-indigo-100 px-3 py-1 rounded-full text-indigo-700">ID: {selectedStudent.studentId}</span>
                  <span className={`px-3 py-1 rounded-full ${selectedStudent.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {selectedStudent.status === "completed" ? "Đã nộp bài" : "Đang làm bài"}
                  </span>
                </div>

                {/* DETAILED VIOLATIONS VIEW */}
                {selectedStudent.violationCount > 0 && (
                  <div className="mt-5 flex w-full flex-col gap-2 text-left">
                    <div className="flex items-center gap-2 font-black text-red-700 text-sm uppercase tracking-wider">
                      <ShieldAlert size={20} className="text-red-600 animate-pulse" />
                      <span>Chi tiết vi phạm ({selectedStudent.violationCount})</span>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto rounded-2xl border-2 border-red-200 bg-red-50/30 p-3 space-y-2 scrollbar-thin">
                      {loadingViolations ? (
                        <div className="text-xs text-red-500 text-center py-4">Đang tải chi tiết vi phạm...</div>
                      ) : violations.length === 0 ? (
                        <div className="text-xs text-red-500 text-center py-4 font-bold">Không tìm thấy chi tiết vi phạm.</div>
                      ) : (
                        violations.map((v) => (
                          <div key={v.id} className="rounded-xl border border-red-200 bg-white p-3 text-xs shadow-sm">
                            <div className="flex justify-between font-bold text-red-600">
                              <span className="bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                {getViolationLabel(v.violationType)}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-normal">
                                {new Date(v.timestamp).toLocaleTimeString("vi-VN")}
                              </span>
                            </div>
                            {v.evidenceUrl && (
                              <div className="mt-2 pt-2 border-t border-dashed border-zinc-100 flex items-center justify-between">
                                <span className="text-[10px] text-zinc-500 truncate max-w-[180px]">{v.evidenceUrl}</span>
                                <a 
                                  href={v.evidenceUrl} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline shrink-0 ml-2"
                                >
                                  Xem minh chứng →
                                </a>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6 grid w-full grid-cols-2 gap-4">
                  <div className="rounded-2xl border-2 border-[color:var(--border)] bg-blue-50/50 p-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-black text-blue-600 uppercase tracking-wider">
                      <Award size={14} className="text-blue-500" />
                      <span>Điểm số</span>
                    </div>
                    <div className="mt-1 text-3xl font-black text-blue-950">{selectedStudent.score ?? selectedStudent.correctCount}</div>
                  </div>
                  <div className="rounded-2xl border-2 border-[color:var(--border)] bg-violet-50/50 p-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-black text-violet-600 uppercase tracking-wider">
                      <TrendingUp size={14} className="text-violet-500" />
                      <span>Chính xác</span>
                    </div>
                    <div className="mt-1 text-3xl font-black text-violet-950">{selectedStudent.accuracy}%</div>
                  </div>
                  <div className="col-span-2 rounded-2xl border-2 border-[color:var(--border)] bg-emerald-50/50 p-4 text-center">
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex items-center gap-1 text-[11px] font-black text-emerald-700 uppercase tracking-wider">
                        <BarChart2 size={14} className="text-emerald-600" />
                        <span>Tiến độ câu hỏi</span>
                      </div>
                      <div className="text-sm font-black text-emerald-950">
                        {selectedStudent.answeredCount} / {selectedStudent.totalQuestions}
                      </div>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-emerald-100 border border-emerald-200">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                        style={{ width: `${selectedStudent.totalQuestions > 0 ? (selectedStudent.answeredCount / selectedStudent.totalQuestions) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

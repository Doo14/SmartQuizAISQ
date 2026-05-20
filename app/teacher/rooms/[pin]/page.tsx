"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { getRoomDetail, type RoomDetail, type AttemptSummary } from "@/lib/api";
import { connectSocket, leaveQuizSocketRoom, roomIdentification, type Socket } from "@/lib/socket";

const TEACHER_NAV = [
  { href: "/teacher", label: "Tổng quan" },
  { href: "/teacher/exams", label: "Danh sách đề" },
  { href: "/teacher/exams/new", label: "Tạo đề mới", badge: "Excel/Manual/AI" },
  { href: "/teacher/results", label: "Kết quả & Vi phạm" },
];

type LeaderboardEntry = {
  studentId: number;
  username: string;
  correctCount: number;
  submittedAt?: string;
  answerCount: number;
  violationCount: number;
  status: "in_progress" | "completed";
};

function statusLabel(s: string) {
  if (s === "WAITING") return "Chờ bắt đầu";
  if (s === "ACTIVE") return "Đang thi";
  if (s === "FINISHED") return "Đã kết thúc";
  return "Chưa mở";
}
function statusBadge(s: string): "success" | "warning" | "danger" | "default" {
  if (s === "WAITING") return "success";
  if (s === "ACTIVE") return "warning";
  if (s === "FINISHED") return "danger";
  return "default";
}

export default function TeacherRoomDetailPage({
  params,
}: {
  params: Promise<{ pin: string }>;
}) {
  // "pin" here is actually the room ID (number string) since we link by ID
  const { pin: roomIdStr } = use(params);
  const roomId = Number(roomIdStr);
  const router = useRouter();
  const { push: toastPush } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const existingStudentIdsRef = useRef<Set<number>>(new Set());

  /* Load room data */
  const loadRoom = useCallback(async () => {
    try {
      const r = await getRoomDetail(roomId);
      setRoom(r);
      // Build initial leaderboard from attempts
      const lb: LeaderboardEntry[] = r.attempts.map((a) => ({
        studentId: a.studentId,
        username: a.username ?? `Student #${a.studentId}`,
        correctCount: a.correctCount,
        submittedAt: a.submittedAt,
        answerCount: a.answerCount,
        violationCount: a.violationCount,
        status: a.submittedAt ? "completed" : "in_progress",
      }));
      setLeaderboard(lb);
      // Initialize existing student IDs ref
      existingStudentIdsRef.current = new Set(r.attempts.map((a) => a.studentId));
    } catch {
      toastPush({ title: "Không thể tải thông tin phòng thi", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [roomId, toastPush]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "teacher") { router.push("/student"); return; }
    loadRoom();
  }, [user, authLoading, router, loadRoom]);

  const roomCode = room?.code;
  const roomStatus = room?.status;

  /* Socket.IO connection */
  useEffect(() => {
    if (!roomCode) return;
    const s = connectSocket();
    if (!s.connected) s.connect();
    setSocket(s);

    s.emit("join", roomIdentification(roomCode, roomId), (res: { error?: string }) => {
      if (res?.error) {
        toastPush({ title: "Lỗi kết nối phòng thi", message: res.error, variant: "danger" });
      }
    });

    s.on("student_join", (payload: { username: string; id: number; attemptId?: number }) => {
      if (!existingStudentIdsRef.current.has(payload.id)) {
        existingStudentIdsRef.current.add(payload.id);
        toastPush({ title: `${payload.username} đã vào phòng`, variant: "success" });
      }
      setLeaderboard((prev) => {
        if (prev.some((e) => e.studentId === payload.id)) return prev;
        return [
          ...prev,
          {
            studentId: payload.id,
            username: payload.username,
            correctCount: 0,
            answerCount: 0,
            violationCount: 0,
            status: "in_progress" as const,
          },
        ];
      });
    });

    s.on("room_start", (payload: { startTime: string; endTime: string; durationMinutes: number }) => {
      toastPush({ title: "Phòng thi đã bắt đầu!", message: `Thời gian: ${payload.durationMinutes} phút`, variant: "success" });
      void loadRoom();
    });

    s.on(
      "leaderboard",
      (payload: {
        student: { id: number; username: string };
        correctCount: number;
        answeredCount: number;
        totalQuestions: number;
      }) => {
        setLeaderboard((prev) => {
          const existing = prev.find((e) => e.studentId === payload.student.id);
          if (existing) {
            return prev
              .map((e) =>
                e.studentId === payload.student.id
                  ? {
                      ...e,
                      correctCount: payload.correctCount,
                      answerCount: payload.answeredCount,
                    }
                  : e,
              )
              .sort((a, b) => b.correctCount - a.correctCount);
          }
          return [
            ...prev,
            {
              studentId: payload.student.id,
              username: payload.student.username,
              correctCount: payload.correctCount,
              answerCount: payload.answeredCount,
              violationCount: 0,
              status: "in_progress" as const,
            },
          ].sort((a, b) => b.correctCount - a.correctCount);
        });
      },
    );

    s.on("student_submit", (payload: { student: { id: number; username: string }; correctCount?: number; totalQuestions?: number }) => {
      toastPush({ title: `${payload.student.username} đã nộp bài`, variant: "success" });
      setLeaderboard((prev) =>
        prev.map((e) =>
          e.studentId === payload.student.id
            ? {
                ...e,
                status: "completed" as const,
                submittedAt: new Date().toISOString(),
                correctCount: payload.correctCount ?? e.correctCount,
              }
            : e,
        ),
      );
    });

    s.on("room_time_up", () => {
      toastPush({ title: "Hết giờ!", message: "Phòng thi đã kết thúc.", variant: "warning" });
      void loadRoom();
    });

    s.on("force_submit", () => void loadRoom());

    s.on("room_ended", () => {
      setRoom((prev) => (prev ? { ...prev, status: "FINISHED" } : prev));
      void loadRoom();
    });

    s.on("log_violation", (payload: { student: { id: number; username: string }; violationType?: string; type?: string }) => {
      const vtype = payload.violationType ?? payload.type ?? "vi phạm";
      toastPush({ title: `Vi phạm: ${payload.student.username}`, message: vtype, variant: "danger" });
      setLeaderboard((prev) =>
        prev.map((e) =>
          e.studentId === payload.student.id
            ? { ...e, violationCount: e.violationCount + 1 }
            : e,
        ),
      );
    });

    return () => {
      leaveQuizSocketRoom(roomCode, roomId);
      s.off("student_join");
      s.off("room_start");
      s.off("leaderboard");
      s.off("student_submit");
      s.off("room_time_up");
      s.off("log_violation");
      s.off("force_submit");
      s.off("room_ended");
    };
  }, [roomCode, roomId, loadRoom, toastPush]);

  useEffect(() => {
    if (roomStatus !== "ACTIVE") return;
    const timer = setInterval(() => void loadRoom(), 8000);
    return () => clearInterval(timer);
  }, [roomStatus, loadRoom]);

  const handleStart = () => {
    if (!socket || !room) return;
    if (!socket.connected) {
      toastPush({ title: "Chưa kết nối", message: "Đang kết nối lại máy chủ...", variant: "warning" });
      connectSocket();
      return;
    }
    socket.emit("start", roomIdentification(room.code, roomId), (res: unknown) => {
      console.log("[Teacher WS] start:", res);
      if (res === "Room started") {
        toastPush({ title: "Đã bắt đầu phòng thi!", variant: "success" });
        loadRoom();
      } else {
        const message =
          typeof res === "string"
            ? res
            : (res as { error?: string; message?: string })?.error ??
              (res as { message?: string })?.message ??
              "Không thể bắt đầu phòng thi";
        toastPush({ title: "Lỗi", message, variant: "danger" });
      }
    });
  };

  if (loading) {
    return (
      <AppShell title="Teacher Dashboard" subtitle="Phòng thi" nav={TEACHER_NAV}>
        <SkeletonGrid count={4} cols={2} />
      </AppShell>
    );
  }

  if (!room) {
    return (
      <AppShell title="Teacher Dashboard" subtitle="Phòng thi" nav={TEACHER_NAV}>
        <EmptyState
          icon="🔍"
          title="Không tìm thấy phòng thi"
          description={`Phòng thi #${roomId} không tồn tại.`}
          action={{ href: "/teacher/exams", label: "Về danh sách đề", variant: "secondary" }}
        />
      </AppShell>
    );
  }

  const selected = leaderboard.find((e) => e.studentId === selectedId);
  const inProgressCount = leaderboard.filter((e) => e.status === "in_progress").length;
  const completedCount = leaderboard.filter((e) => e.status === "completed").length;
  const totalViolations = leaderboard.reduce((s, e) => s + e.violationCount, 0);

  return (
    <AppShell title="Teacher Dashboard" subtitle={`Phòng thi ${room.code}`} nav={TEACHER_NAV}>
      <div className="page-stack">
        {/* Header */}
        <div className="section-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-widest text-zinc-900">{room.code}</h1>
              <Badge variant={statusBadge(room.status)}>{statusLabel(room.status)}</Badge>
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              {room.exam.title} • {room.exam.durationMinutes} phút • {room.exam.questionCount} câu
            </p>
          </div>
          <div className="flex gap-2">
            <ButtonLink href={`/teacher/rooms/${roomId}/leaderboard`}>🏆 Leaderboard</ButtonLink>
            {room.status === "WAITING" && (
              <Button onClick={handleStart}>Bắt đầu thi</Button>
            )}
            <ButtonLink href={`/teacher/exams/${room.exam.id}`} variant="secondary">Xem đề</ButtonLink>
          </div>
        </div>

        {/* PIN card */}
        {room.status === "WAITING" && (
          <Card shadow="green">
            <div className="py-6 text-center">
              <div className="text-sm font-bold text-zinc-500">Mã PIN phòng thi</div>
              <div className="mt-2 text-5xl font-black tracking-[0.3em] text-zinc-900">{room.code}</div>
              <p className="mt-3 text-sm text-zinc-500">
                Chia sẻ mã này cho học viên để tham gia. Bấm <strong>Bắt đầu thi</strong> khi sẵn sàng.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(room.code);
                    toastPush({ title: "Đã copy!", message: "PIN đã copy vào clipboard.", variant: "success" });
                  }}
                >
                  Copy PIN
                </Button>
              </div>
            </div>
          </Card>
        )}

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

        {/* Leaderboard + detail */}
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Card
            title="Bảng xếp hạng — Realtime"
            description={`${leaderboard.length} student • Socket.IO live`}
            right={<Badge variant="success">{leaderboard.length} online</Badge>}
          >
            {leaderboard.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                {room.status === "WAITING"
                  ? "Chưa có ai tham gia. Chờ học viên nhập PIN…"
                  : "Chưa có ai tham gia phòng thi này."}
              </div>
            ) : (
              <div className="grid gap-2">
                {leaderboard.map((entry, idx) => {
                  const isSelected = selectedId === entry.studentId;
                  const isCompleted = entry.status === "completed";
                  const total = room.exam.questionCount;
                  const progressPct = total > 0 ? Math.round((entry.answerCount / total) * 100) : 0;

                  return (
                    <button
                      key={entry.studentId}
                      type="button"
                      onClick={() => setSelectedId(entry.studentId)}
                      className={[
                        "flex items-center gap-3 rounded-xl border-2 border-[color:var(--border)] px-4 py-3 text-left transition-all",
                        isSelected
                          ? "bg-[color:var(--surface-mint)] shadow-[2px_2px_0_#166534]"
                          : "bg-white shadow-[3px_3px_0_#1a1a1a] hover:shadow-[5px_5px_0_#1a1a1a]",
                      ].join(" ")}
                    >
                      <span className={[
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                        idx === 0 ? "bg-yellow-400 text-yellow-900"
                          : idx === 1 ? "bg-zinc-300 text-zinc-800"
                          : idx === 2 ? "bg-orange-300 text-orange-900"
                          : "bg-zinc-100 text-zinc-600",
                      ].join(" ")}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold text-zinc-900">{entry.username}</span>
                          {isCompleted
                            ? <Badge variant="success">Đã nộp</Badge>
                            : <Badge variant="warning">Đang làm</Badge>}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                          <span>Đúng <strong className="text-emerald-600">{entry.correctCount}</strong>/{entry.answerCount}</span>
                          {entry.violationCount > 0 && (
                            <span className="text-red-500">{entry.violationCount} vi phạm</span>
                          )}
                        </div>
                        {!isCompleted && (
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-[color:var(--primary)] transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-lg font-black text-zinc-900">{entry.correctCount}</div>
                        <div className="text-xs text-zinc-500">đúng</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Chi tiết" description={selected ? selected.username : "Chọn student từ bảng xếp hạng"}>
            {selected ? (
              <div className="grid gap-4">
                <div className="flex justify-center">
                  {selected.status === "completed"
                    ? <Badge variant="success">Đã nộp bài</Badge>
                    : <Badge variant="warning">Đang làm bài</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-warm)] p-3 text-center shadow-[2px_2px_0_#1a1a1a]">
                    <div className="text-xs font-bold text-zinc-500">Đúng</div>
                    <div className="text-2xl font-black text-zinc-900">{selected.correctCount}</div>
                  </div>
                  <div className="rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-warm)] p-3 text-center shadow-[2px_2px_0_#1a1a1a]">
                    <div className="text-xs font-bold text-zinc-500">Tiến độ</div>
                    <div className="text-2xl font-black text-zinc-900">{selected.answerCount}/{room.exam.questionCount}</div>
                  </div>
                </div>
                <ProgressBar value={selected.correctCount} max={room.exam.questionCount} color="green" label="Tỉ lệ đúng" />
                <ProgressBar value={selected.answerCount} max={room.exam.questionCount} color="orange" label="Tiến độ làm bài" />
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Vi phạm</span>
                    <Badge variant={selected.violationCount > 0 ? "warning" : "default"}>{selected.violationCount}</Badge>
                  </div>
                  {selected.submittedAt && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Nộp lúc</span>
                      <span className="text-xs text-zinc-600">{new Date(selected.submittedAt).toLocaleString("vi-VN")}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-zinc-400">
                Chọn một student từ bảng xếp hạng bên trái để xem chi tiết.
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

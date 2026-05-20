"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import {
  getExamDetail,
  getRoomsByExam,
  createRoom,
  openRoom,
  ApiError,
  type ExamDetail,
  type RoomSummary,
} from "@/lib/api";

const TEACHER_NAV = [
  { href: "/teacher", label: "Tổng quan" },
  { href: "/teacher/exams", label: "Danh sách đề" },
  { href: "/teacher/exams/new", label: "Tạo đề mới", badge: "Excel/Manual/AI" },
  { href: "/teacher/results", label: "Kết quả & Vi phạm" },
];

function roomStatusBadge(status: RoomSummary["status"]) {
  if (status === "ACTIVE") return { label: "Đang thi", variant: "warning" as const };
  if (status === "WAITING") return { label: "Chờ bắt đầu", variant: "success" as const };
  if (status === "FINISHED") return { label: "Đã kết thúc", variant: "danger" as const };
  return { label: "Chưa mở", variant: "default" as const };
}

export default function TeacherExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const [e, r] = await Promise.all([
        getExamDetail(Number(id)),
        getRoomsByExam(Number(id)),
      ]);
      setExam(e);
      setRooms(r);
    } catch {
      toast.push({ title: "Không thể tải thông tin đề thi", variant: "danger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "teacher") { router.push("/student"); return; }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, id]);

  /* Tự làm mới danh sách phòng đang ACTIVE (phòng hết giờ chuyển FINISHED trên server) */
  useEffect(() => {
    const hasActive = rooms.some((r) => r.status === "ACTIVE");
    if (!hasActive) return;
    const timer = setInterval(() => void reload(), 10000);
    return () => clearInterval(timer);
  }, [rooms, reload]);

  const handleCreateRoom = async () => {
    try {
      const room = await createRoom(Number(id));
      toast.push({ title: "Tạo phòng thành công", message: `Code: ${room.code}`, variant: "success" });
      reload();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Không thể tạo phòng thi.";
      toast.push({ title: "Lỗi tạo phòng thi", message, variant: "danger" });
    }
  };

  const handleOpenRoom = async (roomId: number) => {
    try {
      await openRoom(roomId);
      toast.push({ title: "Phòng thi đã mở!", message: "Học viên có thể vào phòng bằng mã PIN.", variant: "success" });
      reload();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Không thể mở phòng thi.";
      toast.push({ title: "Lỗi mở phòng thi", message, variant: "danger" });
    }
  };

  if (loading) {
    return (
      <AppShell title="Teacher Dashboard" subtitle="Chi tiết đề thi" nav={TEACHER_NAV}>
        <SkeletonGrid count={4} cols={2} />
      </AppShell>
    );
  }

  if (!exam) {
    return (
      <AppShell title="Teacher Dashboard" subtitle="Chi tiết đề thi" nav={TEACHER_NAV}>
        <EmptyState
          icon="🔍"
          title="Không tìm thấy đề thi"
          description="Đề thi không tồn tại hoặc bạn không có quyền truy cập."
          action={{ href: "/teacher/exams", label: "Về danh sách", variant: "secondary" }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Teacher Dashboard" subtitle="Chi tiết đề thi" nav={TEACHER_NAV}>
      <div className="page-stack">
        <div className="section-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">{exam.title}</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {exam.description || "Không có mô tả"} • {exam.durationMinutes} phút • {exam.questions.length} câu
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreateRoom}>Tạo phòng thi</Button>
          </div>
        </div>

        <div className="bento-grid">
          <Card title="Câu hỏi" shadow="green">
            <div className="text-3xl font-black text-zinc-900">{exam.questions.length}</div>
          </Card>
          <Card title="Phòng thi" shadow="orange">
            <div className="text-3xl font-black text-zinc-900">{rooms.length}</div>
          </Card>
          <Card title="Thời gian" shadow="dark">
            <div className="text-3xl font-black text-zinc-900">
              {exam.durationMinutes} <span className="text-base font-semibold text-zinc-500">phút</span>
            </div>
          </Card>
        </div>

        {rooms.length > 0 ? (
          <Card
            title="Danh sách phòng thi"
            description="Mỗi phòng có mã PIN riêng — tạo nhiều phòng cho các lớp hoặc ca thi khác nhau"
            right={<Badge variant="default">{rooms.length} phòng</Badge>}
            shadow="green"
          >
            <div className="grid gap-2">
              {rooms.map((r) => {
                const { label, variant } = roomStatusBadge(r.status);
                return (
                  <div
                    key={r.id}
                    className="flex flex-col gap-3 rounded-xl border-2 border-[color:var(--border)] bg-white px-4 py-3 shadow-[2px_2px_0_#1a1a1a] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-lg font-black tracking-widest text-zinc-900">
                          {r.code}
                        </span>
                        <Badge variant={variant}>{label}</Badge>
                        {r.attemptCount != null && r.attemptCount > 0 && (
                          <span className="text-xs text-zinc-500">{r.attemptCount} học viên</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Chia sẻ mã PIN này cho học viên lớp tương ứng
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {r.status === "INACTIVE" && (
                        <Button onClick={() => handleOpenRoom(r.id)}>Mở phòng</Button>
                      )}
                      {(r.status === "WAITING" || r.status === "ACTIVE" || r.status === "FINISHED") && (
                        <ButtonLink href={`/teacher/rooms/${r.id}`}>
                          {r.status === "FINISHED" ? "Xem kết quả" : "Xem phòng thi"}
                        </ButtonLink>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card title="Chưa có phòng thi" description="Tạo phòng để học viên vào thi bằng mã PIN">
            <Button onClick={handleCreateRoom} className="w-full justify-center sm:w-auto">
              Tạo phòng thi đầu tiên
            </Button>
          </Card>
        )}

        <Card title="Danh sách câu hỏi" description={`${exam.questions.length} câu`}>
          {exam.questions.length === 0 ? (
            <div className="py-4 text-center text-sm text-zinc-500">Đề thi chưa có câu hỏi nào.</div>
          ) : (
            <div className="grid gap-3">
              {exam.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-xl border-2 border-[color:var(--border)] bg-white p-4 shadow-[3px_3px_0_#1a1a1a]"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-[color:var(--border)] bg-[color:var(--surface-warm)] text-xs font-bold text-zinc-900 shadow-[2px_2px_0_#1a1a1a]">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-zinc-900">{q.content}</div>
                      <div className="mt-2 grid gap-1.5">
                        {q.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={[
                              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs",
                              opt.isCorrect
                                ? "border-2 border-emerald-500 bg-[color:var(--surface-mint)] font-bold text-emerald-800"
                                : "border border-zinc-200 text-zinc-600",
                            ].join(" ")}
                          >
                            <span>{opt.content}</span>
                            {opt.isCorrect && <span className="ml-auto text-emerald-600">✓ Đúng</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

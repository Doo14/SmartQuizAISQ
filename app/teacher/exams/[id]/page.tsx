"use client";

import { useEffect, useState, use } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  getExam,
  getExamQuestions,
  getRoomsByExam,
  createRoomForExam,
  generateShareToken,
  upsertExam,
  type DemoExam,
  type DemoQuestion,
  type DemoRoom,
} from "@/lib/demo-store";

const TEACHER_NAV = [
  { href: "/teacher", label: "Tổng quan" },
  { href: "/teacher/exams", label: "Danh sách đề" },
  { href: "/teacher/exams/new", label: "Tạo đề mới", badge: "Excel/Manual/AI" },
  { href: "/teacher/results", label: "Kết quả & Vi phạm" },
];

export default function TeacherExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();

  const [exam, setExam] = useState<DemoExam | null>(null);
  const [questions, setQuestions] = useState<DemoQuestion[]>([]);
  const [rooms, setRooms] = useState<DemoRoom[]>([]);
  const [shareModal, setShareModal] = useState(false);

  const reload = () => {
    const e = getExam(id);
    if (e) {
      setExam(e);
      setQuestions(getExamQuestions(id));
      setRooms(getRoomsByExam(id));
    }
  };

  useEffect(() => {
    reload();
    window.addEventListener("storage", reload);
    return () => window.removeEventListener("storage", reload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!exam) {
    return (
      <AppShell title="Teacher Dashboard" subtitle="Chi tiết đề thi" nav={TEACHER_NAV}>
        <EmptyState
          icon="🔍"
          title="Không tìm thấy đề thi"
          description="Đề thi không tồn tại hoặc đã bị xóa."
          action={{ href: "/teacher/exams", label: "Về danh sách", variant: "secondary" }}
        />
      </AppShell>
    );
  }

  const handleCreateRoom = () => {
    const room = createRoomForExam(exam.id, exam.title);
    toast.push({ title: "Tạo phòng thành công", message: `PIN: ${room.pin}`, variant: "success" });
    reload();
  };

  const handleShare = () => {
    if (!exam.shareToken) {
      const updated = { ...exam, shareToken: generateShareToken(), updatedAt: new Date().toISOString() };
      upsertExam(updated);
      setExam(updated);
    }
    setShareModal(true);
  };

  const activeRoom = rooms.find((r) => r.status === "waiting" || r.status === "in_progress");
  const oldRooms = rooms.filter((r) => r.status === "finished");

  return (
    <AppShell title="Teacher Dashboard" subtitle="Chi tiết đề thi" nav={TEACHER_NAV}>
      <div className="page-stack">
        {/* Header */}
        <div className="section-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">{exam.title}</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {exam.description || "Không có mô tả"} • {exam.durationMinutes} phút • {questions.length} câu
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleShare} variant="secondary">Chia sẻ</Button>
            <Button onClick={handleCreateRoom}>Tạo phòng thi</Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="bento-grid">
          <Card title="Câu hỏi" shadow="green">
            <div className="text-3xl font-black text-zinc-900">{questions.length}</div>
          </Card>
          <Card title="Phòng thi" shadow="orange">
            <div className="text-3xl font-black text-zinc-900">{rooms.length}</div>
          </Card>
          <Card title="Thời gian" shadow="dark">
            <div className="text-3xl font-black text-zinc-900">{exam.durationMinutes} <span className="text-base font-semibold text-zinc-500">phút</span></div>
          </Card>
        </div>

        {/* Active Room */}
        {activeRoom ? (
          <Card
            title="Phòng thi đang hoạt động"
            right={
              <Badge variant={activeRoom.status === "in_progress" ? "warning" : "success"}>
                {activeRoom.status === "in_progress" ? "Đang thi" : "Chờ bắt đầu"}
              </Badge>
            }
            shadow="green"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-2xl font-black tracking-widest text-zinc-900">{activeRoom.pin}</div>
                <div className="text-sm text-zinc-500">
                  Tạo lúc {new Date(activeRoom.createdAt).toLocaleString("vi-VN")}
                </div>
              </div>
              <ButtonLink href={`/teacher/rooms/${activeRoom.pin}`}>Xem phòng thi</ButtonLink>
            </div>
          </Card>
        ) : null}

        {/* Questions preview */}
        <Card title="Danh sách câu hỏi" description={`${questions.length} câu`}>
          {questions.length === 0 ? (
            <div className="py-4 text-center text-sm text-zinc-500">Đề thi chưa có câu hỏi nào.</div>
          ) : (
            <div className="grid gap-3">
              {questions.map((q, idx) => (
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
                        {(["A", "B", "C", "D"] as const).map((opt) =>
                          q.options[opt] ? (
                            <div
                              key={opt}
                              className={[
                                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs",
                                opt === q.correct
                                  ? "border-2 border-emerald-500 bg-[color:var(--surface-mint)] font-bold text-emerald-800"
                                  : "border border-zinc-200 text-zinc-600",
                              ].join(" ")}
                            >
                              <span className="font-bold">{opt}.</span>
                              <span>{q.options[opt]}</span>
                              {opt === q.correct ? <span className="ml-auto text-emerald-600">✓</span> : null}
                            </div>
                          ) : null,
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Old rooms */}
        {oldRooms.length > 0 ? (
          <Card title="Lịch sử phòng thi" description={`${oldRooms.length} phòng đã kết thúc`}>
            <div className="grid gap-2">
              {oldRooms.map((r) => (
                <div
                  key={r.pin}
                  className="flex items-center justify-between rounded-xl border-2 border-[color:var(--border)] bg-white px-4 py-3 shadow-[2px_2px_0_#1a1a1a]"
                >
                  <div>
                    <span className="mr-2 font-mono text-sm font-bold tracking-wider text-zinc-900">{r.pin}</span>
                    <span className="text-xs text-zinc-500">
                      {r.startedAt ? new Date(r.startedAt).toLocaleString("vi-VN") : "—"}
                    </span>
                  </div>
                  <ButtonLink href={`/teacher/rooms/${r.pin}`} variant="ghost">Chi tiết</ButtonLink>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>

      {/* Share Modal */}
      <Modal open={shareModal} onClose={() => setShareModal(false)} title="Chia sẻ đề thi" size="sm">
        <div className="grid gap-4">
          <div className="rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-warm)] p-4 text-center">
            <div className="text-xs font-bold text-zinc-500">Share Token</div>
            <div className="mt-1 text-lg font-black tracking-wider text-zinc-900">
              {exam.shareToken || "—"}
            </div>
          </div>
          <p className="text-center text-xs text-zinc-500">
            Gửi token này cho đồng nghiệp để họ có thể xem đề thi. (Backend sẽ xử lý quyền truy cập)
          </p>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(exam.shareToken || "");
              toast.push({ title: "Đã copy!", message: "Token đã được copy vào clipboard.", variant: "success" });
            }}
          >
            Copy token
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}

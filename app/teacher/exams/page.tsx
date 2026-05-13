"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { listExams, listRooms, listAttempts, type DemoExam, type DemoRoom } from "@/lib/demo-store";

function formatDateTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
}

export default function TeacherExamsPage() {
  const toast = useToast();
  const [exams, setExams] = useState<DemoExam[]>([]);
  const [rooms, setRooms] = useState<DemoRoom[]>([]);
  const [attempts, setAttempts] = useState<ReturnType<typeof listAttempts>>([]);

  useEffect(() => {
    const load = () => {
      setExams(listExams());
      setRooms(listRooms());
      setAttempts(listAttempts());
    };

    load();
    window.addEventListener("storage", load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("focus", load);
    };
  }, []);

  const examStats = useMemo(() => {
    const map = new Map<string, { activeRoom?: DemoRoom; roomCount: number; attemptCount: number; violations: number }>();
    for (const exam of exams) {
      const examRooms = rooms.filter((r) => r.examId === exam.id);
      const activeRoom = examRooms.find((r) => r.status === "waiting" || r.status === "in_progress");
      const codes = new Set(examRooms.map((r) => r.pin));
      const examAttempts = attempts.filter((a) => a.roomPin && codes.has(a.roomPin));
      map.set(exam.id, {
        activeRoom,
        roomCount: examRooms.length,
        attemptCount: examAttempts.length,
        violations: examAttempts.reduce((s, a) => s + a.violationCount, 0),
      });
    }
    return map;
  }, [exams, rooms, attempts]);

  return (
    <AppShell
      title="Teacher Dashboard"
      subtitle="Danh sách đề thi"
      nav={[
        { href: "/teacher", label: "Tổng quan" },
        { href: "/teacher/exams", label: "Danh sách đề" },
        { href: "/teacher/exams/new", label: "Tạo đề mới", badge: "Excel/Manual/AI" },
        { href: "/teacher/results", label: "Kết quả & Vi phạm" },
      ]}
    >
      <div className="grid gap-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">Danh sách đề thi</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {exams.length} đề thi • {rooms.length} phòng
            </p>
          </div>
          <ButtonLink href="/teacher/exams/new">Tạo đề mới</ButtonLink>
        </div>

        <div className="grid gap-3">
          {exams.length === 0 ? (
            <EmptyState
              icon="📝"
              title="Chưa có đề thi"
              description="Tạo đề thi đầu tiên bằng Excel, nhập tay, hoặc AI."
              action={{ href: "/teacher/exams/new", label: "Tạo đề mới" }}
            />
          ) : (
            exams.map((exam) => {
              const stats = examStats.get(exam.id) ?? { roomCount: 0, attemptCount: 0, violations: 0 };
              return (
                <Card
                  key={exam.id}
                  title={exam.title}
                  description={`${exam.durationMinutes} phút • ${exam.questionCount} câu hỏi`}
                  right={
                    stats.activeRoom ? (
                      <Badge variant="success">PIN: {stats.activeRoom.pin}</Badge>
                    ) : (
                      <Badge>{stats.roomCount} phòng</Badge>
                    )
                  }
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
                      <span>{stats.roomCount} phòng</span>
                      <span>{stats.attemptCount} lượt thi</span>
                      {stats.violations > 0 ? (
                        <span className="text-red-600">{stats.violations} vi phạm</span>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      {exam.shareToken ? (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(exam.shareToken!);
                            toast.push({ title: "Đã copy share token!", variant: "success" });
                          }}
                        >
                          Share
                        </Button>
                      ) : null}
                      <ButtonLink href={`/teacher/exams/${exam.id}`} variant="secondary">
                        Chi tiết
                      </ButtonLink>
                      {stats.activeRoom ? (
                        <ButtonLink href={`/teacher/rooms/${stats.activeRoom.pin}`}>
                          Xem phòng
                        </ButtonLink>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}

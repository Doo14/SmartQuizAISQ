"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { listExams, getRoomsByExam, type Exam, type RoomSummary } from "@/lib/api";

const TEACHER_NAV = [
  { href: "/teacher", label: "Tổng quan" },
  { href: "/teacher/exams", label: "Danh sách đề" },
  { href: "/teacher/exams/new", label: "Tạo đề mới", badge: "Excel/Manual/AI" },
  { href: "/teacher/results", label: "Kết quả & Vi phạm" },
];

type ExamWithRooms = Exam & { rooms: RoomSummary[] };

export default function TeacherExamsPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const [exams, setExams] = useState<ExamWithRooms[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { exams: list } = await listExams();
      const withRooms = await Promise.all(
        list.map(async (e) => {
          const rooms = await getRoomsByExam(e.id).catch(() => []);
          return { ...e, rooms };
        }),
      );
      setExams(withRooms);
    } catch {
      toast.push({ title: "Lỗi tải danh sách đề thi", variant: "danger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "teacher") { router.push("/student"); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const activeRoom = (rooms: RoomSummary[]) =>
    rooms.find((r) => r.status === "WAITING" || r.status === "ACTIVE");

  return (
    <AppShell title="Teacher Dashboard" subtitle="Danh sách đề thi" nav={TEACHER_NAV}>
      <div className="grid gap-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">Danh sách đề thi</h1>
            <p className="mt-1 text-sm text-zinc-600">{exams.length} đề thi</p>
          </div>
          <ButtonLink href="/teacher/exams/new">Tạo đề mới</ButtonLink>
        </div>

        <div className="grid gap-3">
          {loading ? (
            <SkeletonGrid count={3} cols={1} />
          ) : exams.length === 0 ? (
            <EmptyState
              icon="📝"
              title="Chưa có đề thi"
              description="Tạo đề thi đầu tiên bằng Excel, nhập tay, hoặc AI."
              action={{ href: "/teacher/exams/new", label: "Tạo đề mới" }}
            />
          ) : (
            exams.map((exam) => {
              const ar = activeRoom(exam.rooms);
              return (
                <Card
                  key={exam.id}
                  title={exam.title}
                  description={`${exam.durationMinutes} phút • ${exam.questionCount} câu hỏi`}
                  right={
                    ar ? (
                      <Badge variant="success">
                        PIN: {ar.code}
                      </Badge>
                    ) : (
                      <Badge>{exam.roomCount} phòng</Badge>
                    )
                  }
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
                      <span>{exam.roomCount} phòng</span>
                      <span>{exam.questionCount} câu hỏi</span>
                    </div>
                    <div className="flex gap-2">
                      <ButtonLink href={`/teacher/exams/${exam.id}`} variant="secondary">
                        Chi tiết
                      </ButtonLink>
                      {ar && (
                        <ButtonLink href={`/teacher/rooms/${ar.id}`}>
                          Xem phòng
                        </ButtonLink>
                      )}
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

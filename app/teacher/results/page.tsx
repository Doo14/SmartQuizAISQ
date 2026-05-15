"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import {
  listExams,
  getRoomsByExam,
  getRoomDetail,
  getViolationsByAttempt,
  getViolationLabel,
  type Exam,
  type AttemptSummary,
  type ViolationDetail,
} from "@/lib/api";

const TEACHER_NAV = [
  { href: "/teacher", label: "Tổng quan" },
  { href: "/teacher/exams", label: "Danh sách đề" },
  { href: "/teacher/exams/new", label: "Tạo đề mới", badge: "Excel/Manual/AI" },
  { href: "/teacher/results", label: "Kết quả & Vi phạm" },
];

type AttemptRow = AttemptSummary & {
  examTitle: string;
  roomCode: string;
  roomId: number;
};

function violationIcon(type: string): string {
  const key = type.toUpperCase().replace(/-/g, "_");
  const icons: Record<string, string> = {
    TAB_SWITCH: "🔄",
    KEYBOARD_COPY: "📋",
    KEYBOARD_PASTE: "📥",
    CAMERA_MULTIPLE_FACES: "👥",
    CAMERA_GAZE_AWAY: "👀",
    CAMERA_MISSING: "📷",
    OTHER: "⚠️",
  };
  return icons[key] ?? "⚠️";
}

export default function TeacherResultsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | "all">("all");
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [violations, setViolations] = useState<ViolationDetail[]>([]);
  const [violationsLoading, setViolationsLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "teacher") { router.push("/student"); return; }

    const loadAll = async () => {
      try {
        const { exams: examList } = await listExams();
        setExams(examList);

        const allAttempts: AttemptRow[] = [];
        for (const exam of examList) {
          const rooms = await getRoomsByExam(exam.id).catch(() => []);
          for (const room of rooms) {
            if (room.attemptCount && room.attemptCount > 0) {
              try {
                const detail = await getRoomDetail(room.id);
                for (const att of detail.attempts) {
                  allAttempts.push({
                    ...att,
                    examTitle: exam.title,
                    roomCode: room.code,
                    roomId: room.id,
                  });
                }
              } catch {
                // skip
              }
            }
          }
        }
        setAttempts(allAttempts);
      } catch {
        setAttempts([]);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [user, authLoading, router]);

  const filteredAttempts = useMemo(() => {
    if (selectedExamId === "all") return attempts;
    return attempts.filter((a) => {
      const exam = exams.find((e) => e.title === a.examTitle);
      return exam?.id === selectedExamId;
    });
  }, [attempts, selectedExamId, exams]);

  const selected = selectedAttemptId !== null
    ? attempts.find((a) => a.id === selectedAttemptId) ?? null
    : null;

  useEffect(() => {
    if (!selectedAttemptId) {
      setViolations([]);
      return;
    }
    let cancelled = false;
    setViolationsLoading(true);
    getViolationsByAttempt(selectedAttemptId).then((list) => {
      if (!cancelled) {
        setViolations(list);
        setViolationsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedAttemptId]);

  const totalViolations = filteredAttempts.reduce((s, a) => s + (a.violationCount ?? 0), 0);
  const avgCorrect = filteredAttempts.length > 0
    ? (filteredAttempts.reduce((s, a) => s + a.correctCount, 0) / filteredAttempts.length).toFixed(1)
    : "—";

  return (
    <AppShell title="Teacher Dashboard" subtitle="Kết quả & Vi phạm" nav={TEACHER_NAV}>
      <div className="page-stack">
        <div className="section-head flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">Kết quả & Vi phạm</h1>
            <p className="mt-1 text-sm text-zinc-600">Xem chi tiết kết quả bài thi và vi phạm của học viên.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="bento-grid">
          <Card title="Tổng attempts" shadow="green">
            <div className="text-3xl font-black text-zinc-900">{filteredAttempts.length}</div>
          </Card>
          <Card title="Vi phạm" shadow="red">
            <div className="text-3xl font-black text-zinc-900">{totalViolations}</div>
          </Card>
          <Card title="Câu đúng TB" shadow="orange">
            <div className="text-3xl font-black text-zinc-900">{avgCorrect}</div>
          </Card>
        </div>

        {/* Filter */}
        <Card title="Lọc theo đề thi">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedExamId("all")}
              className={[
                "rounded-xl border-2 border-[color:var(--border)] px-4 py-2 text-sm font-bold transition-all",
                selectedExamId === "all"
                  ? "bg-[color:var(--primary)] text-white shadow-[3px_3px_0_#1a1a1a]"
                  : "bg-white text-zinc-700 shadow-[2px_2px_0_#1a1a1a] hover:shadow-[4px_4px_0_#1a1a1a]",
              ].join(" ")}
            >
              Tất cả
            </button>
            {exams.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedExamId(e.id)}
                className={[
                  "rounded-xl border-2 border-[color:var(--border)] px-4 py-2 text-sm font-bold transition-all",
                  selectedExamId === e.id
                    ? "bg-[color:var(--primary)] text-white shadow-[3px_3px_0_#1a1a1a]"
                    : "bg-white text-zinc-700 shadow-[2px_2px_0_#1a1a1a] hover:shadow-[4px_4px_0_#1a1a1a]",
                ].join(" ")}
              >
                {e.title}
              </button>
            ))}
          </div>
        </Card>

        {/* Attempts list + detail */}
        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <Card
            title="Danh sách bài thi"
            description={`${filteredAttempts.length} attempts`}
          >
            {loading ? (
              <SkeletonGrid count={3} cols={1} />
            ) : filteredAttempts.length === 0 ? (
              <EmptyState
                icon="📊"
                title="Chưa có dữ liệu"
                description="Chưa có học viên nào nộp bài trong phòng thi này."
                action={{ href: "/teacher/exams", label: "Xem đề thi", variant: "secondary" }}
              />
            ) : (
              <div className="grid gap-2">
                {filteredAttempts.map((a) => {
                  const isSelected = selectedAttemptId === a.id;
                  const passed = a.correctCount >= 5;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAttemptId(a.id)}
                      className={[
                        "flex items-center gap-3 rounded-xl border-2 border-[color:var(--border)] px-4 py-3 text-left transition-all",
                        isSelected
                          ? "bg-[color:var(--surface-mint)] shadow-[2px_2px_0_#166534]"
                          : "bg-white shadow-[3px_3px_0_#1a1a1a] hover:shadow-[5px_5px_0_#1a1a1a]",
                      ].join(" ")}
                    >
                      <div className={[
                        "grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-[color:var(--border)] text-sm font-black",
                        passed ? "bg-[color:var(--surface-mint)]" : "bg-[#FFD6DD]",
                      ].join(" ")}>
                        {a.correctCount}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold text-zinc-900">
                            {a.username ?? `Student #${a.studentId}`}
                          </span>
                          {a.violationCount > 0 && (
                            <Badge variant="danger">{a.violationCount} vi phạm</Badge>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {a.examTitle} • PIN: {a.roomCode}
                          {a.submittedAt
                            ? ` • ${new Date(a.submittedAt).toLocaleString("vi-VN")}`
                            : ""}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-base font-black text-zinc-900">{a.correctCount}</div>
                        <div className="text-xs text-zinc-500">câu đúng</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Detail panel */}
          <Card title="Chi tiết" description={selected ? (selected.username ?? `Student #${selected.studentId}`) : "Chọn một bài thi"}>
            {selected ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-warm)] p-3 text-center shadow-[2px_2px_0_#1a1a1a]">
                    <div className="text-xs font-bold text-zinc-500">Câu đúng</div>
                    <div className="text-2xl font-black text-zinc-900">{selected.correctCount}</div>
                  </div>
                  <div className="rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-warm)] p-3 text-center shadow-[2px_2px_0_#1a1a1a]">
                    <div className="text-xs font-bold text-zinc-500">Đã trả lời</div>
                    <div className="text-2xl font-black text-zinc-900">{selected.answerCount}</div>
                  </div>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Phòng thi</span>
                    <span className="font-bold font-mono text-zinc-900">{selected.roomCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Đề thi</span>
                    <span className="font-bold text-zinc-900 text-right max-w-[60%] truncate">{selected.examTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Vi phạm</span>
                    <Badge variant={selected.violationCount > 0 ? "danger" : "default"}>{selected.violationCount}</Badge>
                  </div>
                  {selected.submittedAt && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Nộp lúc</span>
                      <span className="text-xs">{new Date(selected.submittedAt).toLocaleString("vi-VN")}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-zinc-200 pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-900">Chi tiết vi phạm</span>
                    {selected.violationCount > 0 && (
                      <Badge variant="danger">{selected.violationCount}</Badge>
                    )}
                  </div>
                  {violationsLoading ? (
                    <p className="py-4 text-center text-sm text-zinc-400">Đang tải...</p>
                  ) : violations.length === 0 ? (
                    <p className="rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
                      {selected.violationCount > 0
                        ? "Không tải được danh sách vi phạm."
                        : "Học viên không có vi phạm trong bài thi này."}
                    </p>
                  ) : (
                    <ul className="grid max-h-72 gap-2 overflow-y-auto">
                      {violations.map((v) => (
                        <li
                          key={v.id}
                          className="rounded-xl border-2 border-[color:var(--border)] bg-[#FFF5F5] px-3 py-2.5 shadow-[2px_2px_0_#991B1B]"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-base leading-none">{violationIcon(v.violationType)}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold text-red-900">
                                {getViolationLabel(v.violationType)}
                              </div>
                              {v.evidenceUrl ? (
                                <p className="mt-1 text-xs leading-relaxed text-red-800/80">{v.evidenceUrl}</p>
                              ) : null}
                              <div className="mt-1 text-[10px] font-semibold text-red-700/60">
                                {new Date(v.timestamp).toLocaleString("vi-VN")}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <ButtonLink href={`/teacher/rooms/${selected.roomId}`} variant="secondary" className="justify-center">
                  Xem phòng thi
                </ButtonLink>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-zinc-400">
                Chọn một bài thi để xem chi tiết.
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

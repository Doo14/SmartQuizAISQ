"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { getStudentHistory, type HistoryItem } from "@/lib/api";

const PAGE_SIZE = 6;

export default function StudentHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [all, setAll] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "student") { router.push("/teacher"); return; }

    const load = async () => {
      try {
        const { history, total: t } = await getStudentHistory(PAGE_SIZE, page * PAGE_SIZE);
        setAll(history);
        setTotal(t);
      } catch {
        setAll([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, authLoading, page, router]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AppShell
      title="Student Dashboard"
      subtitle="Lịch sử bài thi"
      nav={[
        { href: "/student", label: "Tổng quan" },
        { href: "/student/join", label: "Nhập mã phòng thi", badge: "PIN" },
        { href: "/student/history", label: "Lịch sử bài thi" },
      ]}
    >
      <div className="grid gap-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">Lịch sử bài thi</h1>
            <p className="mt-1 text-sm text-zinc-600">{total} bài thi đã thực hiện.</p>
          </div>
          <ButtonLink href="/student" variant="secondary">Về dashboard</ButtonLink>
        </div>

        {loading ? (
          <SkeletonGrid count={4} cols={1} />
        ) : all.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Chưa có bài thi nào"
            description="Sau khi hoàn thành bài thi, kết quả sẽ hiện ở đây."
            action={{ href: "/student/join", label: "Vào phòng thi" }}
          />
        ) : (
          <>
            <Card title="Danh sách attempt">
              <div className="grid gap-3">
                {all.map((a) => {
                  const total = a.correctCount;
                  const score = parseFloat(((a.correctCount / 10) * 10).toFixed(1));
                  const passed = a.correctCount >= 5;
                  return (
                    <div
                      key={a.attemptId}
                      className="flex flex-col gap-3 rounded-2xl border-2 border-[color:var(--border)] bg-white p-4 shadow-[4px_4px_0_#1a1a1a] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-zinc-900">{a.examTitle}</div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                          {a.submittedAt && (
                            <span>{new Date(a.submittedAt).toLocaleString("vi-VN")}</span>
                          )}
                          <span>Đúng {a.correctCount} câu</span>
                          <span className="font-mono">{a.roomCode}</span>
                          {a.violationCount > 0 && (
                            <span className="text-red-500">{a.violationCount} vi phạm</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={passed ? "success" : "danger"}>
                          {a.correctCount} câu đúng
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => { setPage((p) => Math.max(0, p - 1)); setLoading(true); }}
                  disabled={page === 0}
                >
                  Trước
                </Button>
                <span className="rounded-full border-2 border-[color:var(--border)] bg-white px-4 py-2 text-sm font-bold text-zinc-900 shadow-[2px_2px_0_#1a1a1a]">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => { setPage((p) => Math.min(totalPages - 1, p + 1)); setLoading(true); }}
                  disabled={page >= totalPages - 1}
                >
                  Sau
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

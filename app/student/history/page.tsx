"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listAttempts, type DemoAttempt } from "@/lib/demo-store";

const PAGE_SIZE = 6;

export default function StudentHistoryPage() {
  const [all, setAll] = useState<DemoAttempt[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const load = () => setAll(listAttempts());
    load();
    window.addEventListener("storage", load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("focus", load);
    };
  }, []);

  const totalPages = Math.ceil(all.length / PAGE_SIZE);
  const paged = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
            <p className="mt-1 text-sm text-zinc-600">{all.length} bài thi đã thực hiện.</p>
          </div>
          <ButtonLink href="/student" variant="secondary">Về dashboard</ButtonLink>
        </div>

        {all.length === 0 ? (
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
                {paged.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col gap-3 rounded-2xl border-2 border-[color:var(--border)] bg-white p-4 shadow-[4px_4px_0_#1a1a1a] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-zinc-900">{a.examTitle}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                        <span>{new Date(a.startedAt).toLocaleString("vi-VN")}</span>
                        <span>{a.totalCorrect}/{a.totalQuestions} đúng</span>
                        <span>{a.examCode}</span>
                        {a.violationCount > 0 ? (
                          <span className="text-red-500">{a.violationCount} vi phạm</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={a.score >= 5 ? "success" : "danger"}>
                        {a.score}/10
                      </Badge>
                      <ButtonLink
                        href={`/student/result?code=${a.examCode}`}
                        variant="ghost"
                      >
                        Xem kết quả
                      </ButtonLink>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Pagination */}
            {totalPages > 1 ? (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Trước
                </Button>
                <span className="rounded-full border-2 border-[color:var(--border)] bg-white px-4 py-2 text-sm font-bold text-zinc-900 shadow-[2px_2px_0_#1a1a1a]">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Sau
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}

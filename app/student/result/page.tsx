"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Student result page.
 * After submitting via socket, the exam page shows inline results.
 * This page handles the case where student navigates to /student/result directly
 * (e.g., from history) — it shows a summary without detailed answers.
 * Params accepted: correctCount, total, score (passed as query string by exam page if needed)
 */
function StudentResultContent() {
  const searchParams = useSearchParams();

  const correctCount = Number(searchParams.get("correctCount") ?? "0");
  const total = Number(searchParams.get("total") ?? "0");
  const examTitle = searchParams.get("examTitle") ?? "Bài thi";
  const score = total > 0 ? parseFloat(((correctCount / total) * 10).toFixed(1)) : 0;
  const hasData = total > 0;

  return (
    <AppShell
      title="Student Dashboard"
      subtitle="Kết quả bài thi"
      nav={[
        { href: "/student", label: "Tổng quan" },
        { href: "/student/join", label: "Nhập mã phòng thi", badge: "PIN" },
        { href: "/student/history", label: "Lịch sử bài thi" },
      ]}
    >
      <div className="page-stack">
        <div className="section-head flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">Kết quả bài thi</h1>
            {hasData && (
              <p className="mt-1 text-sm text-zinc-600">
                Bài thi: <span className="font-bold">{examTitle}</span>
              </p>
            )}
          </div>
          <ButtonLink href="/student" variant="secondary">Về dashboard</ButtonLink>
        </div>

        {!hasData ? (
          <EmptyState
            icon="📊"
            title="Không có dữ liệu kết quả"
            description="Vào phòng thi, hoàn thành và nộp bài để xem kết quả tại đây."
            action={{ href: "/student/join", label: "Vào phòng thi" }}
          />
        ) : (
          <>
            <div className="bento-grid">
              <Card title="Điểm số" description="Thang điểm 10" shadow="green">
                <div className="text-3xl font-black text-zinc-900">{score.toFixed(1)}</div>
              </Card>
              <Card title="Câu đúng" shadow="orange">
                <div className="text-3xl font-black text-zinc-900">
                  {correctCount}/{total}
                </div>
              </Card>
              <Card title="Kết quả" shadow={score >= 5 ? "green" : "red"}>
                <Badge variant={score >= 5 ? "success" : "danger"}>
                  {score >= 5 ? "Đạt" : "Chưa đạt"}
                </Badge>
              </Card>
            </div>

            <Card title="Tóm tắt" description="Kết quả tổng hợp">
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Điểm số</span>
                  <span className="font-bold text-zinc-900">{score.toFixed(1)} / 10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Câu trả lời đúng</span>
                  <span className="font-bold text-zinc-900">{correctCount} / {total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Tỉ lệ đúng</span>
                  <span className="font-bold text-zinc-900">
                    {total > 0 ? Math.round((correctCount / total) * 100) : 0}%
                  </span>
                </div>
              </div>
            </Card>

            <div className="flex justify-center gap-3">
              <ButtonLink href="/student">Về dashboard</ButtonLink>
              <ButtonLink href="/student/history" variant="secondary">Xem lịch sử</ButtonLink>
              <ButtonLink href="/student/join" variant="ghost">Thi tiếp</ButtonLink>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function StudentResultPage() {
  return (
    <Suspense>
      <StudentResultContent />
    </Suspense>
  );
}

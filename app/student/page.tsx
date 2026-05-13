"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { listAttempts, type DemoAttempt } from "@/lib/demo-store";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [recent, setRecent] = useState<DemoAttempt[]>([]);

  useEffect(() => {
    const load = () => setRecent(listAttempts().slice(0, 8));
    load();
    window.addEventListener("storage", load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("focus", load);
    };
  }, []);

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = pin.trim().toUpperCase();
    if (code.length >= 4) {
      router.push(`/student/exam?code=${encodeURIComponent(code)}`);
    }
  };

  return (
    <AppShell
      title="Student Dashboard"
      subtitle="Vào phòng thi • Làm bài • Xem kết quả"
      nav={[
        { href: "/student", label: "Tổng quan" },
        { href: "/student/join", label: "Nhập mã phòng thi", badge: "PIN" },
        { href: "/student/history", label: "Lịch sử bài thi" },
      ]}
    >
      <div className="page-stack">
        <div className="section-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">Tổng quan</h1>
            <p className="mt-1 text-sm text-zinc-600">Nhập mã PIN để vào phòng thi nhanh.</p>
          </div>
          <ButtonLink href="/student/join">Vào phòng thi</ButtonLink>
        </div>

        {/* Quick join */}
        {/* Recent results */}
        <Card title="Kết quả gần đây" description={`${recent.length} bài thi gần nhất`}>
          {recent.length === 0 ? (
            <EmptyState
              icon="📚"
              title="Chưa có kết quả"
              description="Tham gia phòng thi đầu tiên để xem kết quả ở đây."
              action={{ href: "/student/join", label: "Vào phòng thi" }}
            />
          ) : (
            <div className="bento-grid">
              {recent.map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl border-2 border-[color:var(--border)] bg-white p-4 shadow-[4px_4px_0_#1a1a1a] transition hover:shadow-[6px_6px_0_#1a1a1a]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-zinc-900">{a.examTitle}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {new Date(a.startedAt).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    <Badge variant={a.score >= 5 ? "success" : "danger"}>
                      {a.score}/10
                    </Badge>
                  </div>
                  <div className="mt-3 text-sm text-zinc-600">
                    {a.totalCorrect}/{a.totalQuestions} đúng
                    {a.violationCount > 0 ? (
                      <span className="ml-2 text-red-500">• {a.violationCount} vi phạm</span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <ButtonLink
                      href={`/student/result?code=${a.examCode}`}
                      variant="secondary"
                      className="flex-1 justify-center"
                    >
                      Xem kết quả
                    </ButtonLink>
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

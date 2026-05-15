"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { getStudentHistory, type HistoryItem } from "@/lib/api";

export default function StudentDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "student") { router.push("/teacher"); return; }

    getStudentHistory(5, 0)
      .then(({ history: h }) => setHistory(h))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  return (
    <AppShell
      title="Student Dashboard"
      subtitle="Quản lý bài thi của bạn"
      nav={[
        { href: "/student", label: "Tổng quan" },
        { href: "/student/join", label: "Nhập mã phòng thi", badge: "PIN" },
        { href: "/student/history", label: "Lịch sử bài thi" },
      ]}
    >
      <div className="page-stack">
        <div className="section-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">Xin chào, {user?.username}!</h1>
            <p className="mt-1 text-sm text-zinc-600">Sẵn sàng làm bài thi? Nhập mã PIN từ giáo viên để bắt đầu.</p>
          </div>
          <ButtonLink href="/student/join">Vào phòng thi</ButtonLink>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card title="Vào phòng thi nhanh" shadow="green">
            <p className="mb-3 text-sm text-zinc-600">Nhập mã PIN do giáo viên cung cấp để tham gia phòng thi ngay.</p>
            <ButtonLink href="/student/join" className="w-full justify-center">
              Nhập mã PIN →
            </ButtonLink>
          </Card>
          <Card title="Lịch sử bài thi" shadow="orange">
            <p className="mb-3 text-sm text-zinc-600">Xem lại các lần thi đã hoàn thành và kết quả chi tiết.</p>
            <ButtonLink href="/student/history" variant="secondary" className="w-full justify-center">
              Xem lịch sử →
            </ButtonLink>
          </Card>
        </div>

        {/* Recent attempts */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black text-zinc-900">Bài thi gần đây</h2>
            <ButtonLink href="/student/history" variant="ghost">Xem tất cả</ButtonLink>
          </div>
          {loading ? (
            <SkeletonGrid count={3} cols={1} />
          ) : history.length === 0 ? (
            <EmptyState
              icon="📋"
              title="Chưa có bài thi nào"
              description="Sau khi hoàn thành bài thi đầu tiên, kết quả sẽ hiện ở đây."
              action={{ href: "/student/join", label: "Vào phòng thi ngay" }}
            />
          ) : (
            <div className="grid gap-3">
              {history.map((a) => {
                const passed = a.correctCount >= 5;
                return (
                  <div
                    key={a.attemptId}
                    className="flex items-center gap-3 rounded-2xl border-2 border-[color:var(--border)] bg-white p-3 shadow-[3px_3px_0_#1a1a1a]"
                  >
                    <div className={[
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-[color:var(--border)] text-lg font-black",
                      passed ? "bg-[color:var(--surface-mint)]" : "bg-[#FFD6DD]",
                    ].join(" ")}>
                      {passed ? "✓" : "✗"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-zinc-900">{a.examTitle}</div>
                      <div className="text-xs text-zinc-500">
                        {a.submittedAt
                          ? new Date(a.submittedAt).toLocaleString("vi-VN")
                          : "—"}{" "}
                        • {a.roomCode}
                      </div>
                    </div>
                    <Badge variant={passed ? "success" : "danger"}>
                      {a.correctCount} đúng
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Anti-cheat reminder */}
        <Card title="Lưu ý khi làm bài" shadow="dark">
          <ul className="grid gap-2 text-sm text-zinc-600">
            {[
              "Không chuyển tab trong khi làm bài",
              "Không dùng Ctrl+C / Ctrl+V",
              "Không click chuột phải",
              "Camera phải bật và hiển thị khuôn mặt rõ ràng",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full border-2 border-[color:var(--border)] bg-[color:var(--primary)]" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}

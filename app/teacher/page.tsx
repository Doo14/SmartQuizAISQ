"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { listExams, listRooms, listAttempts, listViolations } from "@/lib/demo-store";

export default function TeacherDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({ exams: 0, rooms: 0, attempts: 0, violations: 0 });

  useEffect(() => {
    const load = () => {
      setStats({
        exams: listExams().length,
        rooms: listRooms().length,
        attempts: listAttempts().length,
        violations: listViolations().length,
      });
    };
    load();
    setMounted(true);
    window.addEventListener("storage", load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("focus", load);
    };
  }, []);

  return (
    <AppShell
      title="Teacher Dashboard"
      subtitle="Quản lý đề thi • Phòng thi • Vi phạm"
      nav={[
        { href: "/teacher", label: "Tổng quan" },
        { href: "/teacher/exams", label: "Danh sách đề" },
        { href: "/teacher/exams/new", label: "Tạo đề mới", badge: "Excel/Manual/AI" },
        { href: "/teacher/results", label: "Kết quả & Vi phạm" },
      ]}
    >
      <div className="page-stack">
        <div className="section-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">Tổng quan</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Xem nhanh thống kê đề thi, phòng thi, và vi phạm.
            </p>
          </div>
          <div className="flex gap-2">
            <ButtonLink href="/teacher/exams/new">Tạo đề</ButtonLink>
            <ButtonLink href="/teacher/exams" variant="secondary">
              Xem danh sách
            </ButtonLink>
          </div>
        </div>

        {!mounted ? (
          <SkeletonGrid count={4} cols={2} />
        ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Đề thi" shadow="green">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-black text-zinc-900">{stats.exams}</div>
              <Badge>tổng</Badge>
            </div>
          </Card>
          <Card title="Phòng thi" shadow="orange">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-black text-zinc-900">{stats.rooms}</div>
              <Badge variant="success">rooms</Badge>
            </div>
          </Card>
          <Card title="Lượt thi" shadow="dark">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-black text-zinc-900">{stats.attempts}</div>
              <Badge variant="success">attempts</Badge>
            </div>
          </Card>
          <Card title="Vi phạm" shadow="red">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-black text-zinc-900">{stats.violations}</div>
              <Badge variant="warning">anti-cheat</Badge>
            </div>
          </Card>
        </div>
        )}

        <Card
          title="Bắt đầu nhanh"
          description="Các tác vụ thường dùng"
          shadow="dark"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <ButtonLink href="/teacher/exams/new" className="justify-center">
              📝 Tạo đề mới
            </ButtonLink>
            <ButtonLink href="/teacher/exams" variant="secondary" className="justify-center">
              📋 Danh sách đề
            </ButtonLink>
            <ButtonLink href="/teacher/results" variant="secondary" className="justify-center">
              📊 Kết quả thi
            </ButtonLink>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

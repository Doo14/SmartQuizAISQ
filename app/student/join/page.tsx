"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getRoom, type DemoRoom } from "@/lib/demo-store";

export default function StudentJoinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [foundRoom, setFoundRoom] = useState<DemoRoom | null>(null);
  const [searching, setSearching] = useState(false);

  // Live-search: check PIN as user types (debounced)
  useEffect(() => {
    const trimmed = pin.trim().toUpperCase();
    if (trimmed.length < 4) {
      setFoundRoom(null);
      setError(undefined);
      return;
    }

    setSearching(true);
    const timeout = setTimeout(() => {
      const room = getRoom(trimmed);
      setFoundRoom(room ?? null);
      setSearching(false);
      if (room) {
        setError(undefined);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [pin]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = pin.trim().toUpperCase();

    if (trimmed.length < 4 || trimmed.length > 10) {
      setError("Mã PIN phải từ 4-10 ký tự.");
      return;
    }

    // Check if room exists
    const room = getRoom(trimmed);
    if (!room) {
      setError("Không tìm thấy phòng thi với mã PIN này.");
      return;
    }

    if (room.status === "finished") {
      setError("Phòng thi này đã kết thúc.");
      return;
    }

    if (room.status === "waiting") {
      setError("Phòng thi chưa bắt đầu. Vui lòng chờ giáo viên mở phòng.");
      return;
    }

    // Room is in_progress → go to exam
    router.push(`/student/exam?code=${encodeURIComponent(trimmed)}`);
  };

  const statusInfo = foundRoom
    ? foundRoom.status === "in_progress"
      ? { label: "Đang thi", variant: "success" as const, canJoin: true }
      : foundRoom.status === "waiting"
        ? { label: "Chờ bắt đầu", variant: "warning" as const, canJoin: false }
        : { label: "Đã kết thúc", variant: "danger" as const, canJoin: false }
    : null;

  return (
    <AppShell
      title="Student Dashboard"
      subtitle="Nhập mã phòng thi"
      nav={[
        { href: "/student", label: "Tổng quan" },
        { href: "/student/join", label: "Nhập mã phòng thi", badge: "PIN" },
        { href: "/student/history", label: "Lịch sử bài thi" },
      ]}
    >
      <div className="grid gap-5">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">Vào phòng thi</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Nhập mã PIN do giáo viên cung cấp để vào phòng thi.
          </p>
        </div>

        <Card title="Nhập mã PIN" shadow="green">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
              <Input
                label="Mã phòng thi (PIN)"
                placeholder="VD: HABS5A"
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value.toUpperCase());
                  if (error) setError(undefined);
                }}
                error={error}
                hint={!error && !foundRoom ? "Nhập mã 4-10 ký tự do giáo viên cung cấp." : undefined}
              />
              <Button
                type="submit"
                className="w-full sm:w-auto mt-7 sm:mt-6"
                disabled={!foundRoom || !statusInfo?.canJoin}
              >
                Vào thi
              </Button>
            </div>

            {/* Room preview */}
            {searching ? (
              <div className="rounded-xl border-2 border-[color:var(--border)] bg-white p-4 shadow-[3px_3px_0_#1a1a1a]">
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ) : foundRoom && statusInfo ? (
              <div className="rounded-xl border-2 border-[color:var(--border)] bg-white p-4 shadow-[3px_3px_0_#1a1a1a]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900">{foundRoom.examTitle}</span>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      PIN: {foundRoom.pin} • Tạo lúc {new Date(foundRoom.createdAt).toLocaleString("vi-VN")}
                    </div>
                  </div>
                  {statusInfo.canJoin ? (
                    <span className="text-xl">✅</span>
                  ) : (
                    <span className="text-xl">⏳</span>
                  )}
                </div>
                {!statusInfo.canJoin ? (
                  <div className="mt-3 rounded-lg bg-[color:var(--accent-surface)] px-3 py-2 text-xs font-semibold text-amber-800">
                    {foundRoom.status === "waiting"
                      ? "Phòng thi chưa bắt đầu. Vui lòng chờ giáo viên bấm 'Bắt đầu thi'."
                      : "Phòng thi đã kết thúc. Bạn không thể vào phòng này nữa."}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg bg-[color:var(--primary-surface)] px-3 py-2 text-xs font-semibold text-emerald-800">
                    Phòng thi đang mở! Bấm <strong>Vào thi</strong> để bắt đầu làm bài.
                  </div>
                )}
              </div>
            ) : pin.trim().length >= 4 && !searching ? (
              <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-4 text-center">
                <span className="text-sm text-zinc-400">Không tìm thấy phòng thi với mã PIN này.</span>
              </div>
            ) : null}
          </form>
        </Card>

        <Card title="Lưu ý anti-cheat" description="Hệ thống sẽ ghi nhận vi phạm trong khi thi">
          <ul className="grid gap-2 text-sm text-zinc-600">
            <li className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full border-2 border-[color:var(--border)] bg-[#FFD6DD]" />
              Không chuyển tab (tab-switch detection)
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full border-2 border-[color:var(--border)] bg-[#FFD6DD]" />
              Không dùng Ctrl+C / Ctrl+V (keyboard logger)
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full border-2 border-[color:var(--border)] bg-[#FFD6DD]" />
              Không click chuột phải (context menu blocked)
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full border-2 border-[color:var(--border)] bg-[#FFD6DD]" />
              Bật camera khi được yêu cầu (fallback nếu từ chối)
            </li>
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}

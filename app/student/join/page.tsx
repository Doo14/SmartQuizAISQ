"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { getRoomPublicInfo, type RoomPublicInfo } from "@/lib/api";

export default function StudentJoinPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [foundRoom, setFoundRoom] = useState<RoomPublicInfo | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "student") { router.push("/teacher"); return; }
  }, [user, authLoading, router]);

  // Debounced PIN search (backend requires exactly 8 characters)
  useEffect(() => {
    const trimmed = pin.trim();
    if (trimmed.length !== 8) {
      setFoundRoom(null);
      setError(undefined);
      return;
    }

    setSearching(true);
    const timeout = setTimeout(async () => {
      const room = await getRoomPublicInfo(trimmed);
      setFoundRoom(room);
      setSearching(false);
      if (room) setError(undefined);
    }, 400);

    return () => clearTimeout(timeout);
  }, [pin]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = pin.trim();

    if (trimmed.length !== 8) {
      setError("Mã PIN phải đúng 8 ký tự.");
      return;
    }

    if (!foundRoom) {
      setError("Không tìm thấy phòng thi với mã PIN này.");
      return;
    }

    if (foundRoom.status === "FINISHED") {
      setError("Phòng thi này đã kết thúc.");
      return;
    }

    if (foundRoom.status === "INACTIVE") {
      setError("Phòng thi chưa được mở. Vui lòng chờ giáo viên.");
      return;
    }

    // Only WAITING — student must join before teacher starts (ACTIVE rejects new joins)
    sessionStorage.setItem(`room_${foundRoom.id}_examId`, String(foundRoom.examId));
    router.push(`/student/exam?roomId=${foundRoom.id}&code=${encodeURIComponent(foundRoom.code)}`);
  };

  const statusInfo = foundRoom
    ? foundRoom.status === "WAITING"
      ? { label: "Chờ bắt đầu", variant: "warning" as const, canJoin: true }
      : foundRoom.status === "ACTIVE"
        ? { label: "Đang thi", variant: "success" as const, canJoin: false }
        : foundRoom.status === "FINISHED"
          ? { label: "Đã kết thúc", variant: "danger" as const, canJoin: false }
          : { label: "Chưa mở", variant: "default" as const, canJoin: false }
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
                hint={!error && !foundRoom ? "Nhập đúng 8 ký tự do giáo viên cung cấp." : undefined}
                maxLength={8}
              />
              <Button
                type="submit"
                className="w-full sm:w-auto mt-7 sm:mt-6"
                disabled={!foundRoom || !statusInfo?.canJoin}
              >
                Vào thi
              </Button>
            </div>

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
                      PIN: {foundRoom.code} • {foundRoom.durationMinutes} phút
                    </div>
                  </div>
                  {statusInfo.canJoin ? <span className="text-xl">✅</span> : <span className="text-xl">⏳</span>}
                </div>
                {!statusInfo.canJoin ? (
                  <div className="mt-3 rounded-lg bg-[color:var(--accent-surface)] px-3 py-2 text-xs font-semibold text-amber-800">
                    {foundRoom.status === "ACTIVE"
                      ? "Phòng đã bắt đầu. Bạn cần vào phòng trước khi giáo viên bấm \"Bắt đầu thi\"."
                      : foundRoom.status === "FINISHED"
                        ? "Phòng thi đã kết thúc. Bạn không thể vào phòng này nữa."
                        : "Phòng thi chưa được mở. Vui lòng chờ giáo viên."}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg bg-[color:var(--primary-surface)] px-3 py-2 text-xs font-semibold text-emerald-800">
                    Phòng đang chờ! Bấm <strong>Vào thi</strong> để vào phòng, sau đó chờ giáo viên bắt đầu.
                  </div>
                )}
              </div>
            ) : pin.trim().length === 8 && !searching ? (
              <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-4 text-center">
                <span className="text-sm text-zinc-400">Không tìm thấy phòng thi với mã PIN này.</span>
              </div>
            ) : null}
          </form>
        </Card>

        <Card title="Lưu ý anti-cheat" description="Hệ thống sẽ ghi nhận vi phạm trong khi thi">
          <ul className="grid gap-2 text-sm text-zinc-600">
            {[
              "Không chuyển tab (tab-switch detection)",
              "Không dùng Ctrl+C / Ctrl+V (keyboard logger)",
              "Không click chuột phải (context menu blocked)",
              "Bật camera khi được yêu cầu (fallback nếu từ chối)",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full border-2 border-[color:var(--border)] bg-[#FFD6DD]" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      toast.push({ title: "Đăng nhập thành công!", variant: "success" });
      // Redirect by role
      if ((user as any)?.role === "teacher") {
        router.push("/teacher");
      } else {
        router.push("/student");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Đăng nhập thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-[color:var(--surface-cream)] py-12">
      <div className="mx-auto w-full max-w-lg px-4 sm:px-6">
        <div className="mb-6 text-center">
          <div className="mx-auto inline-block rounded-full border-2 border-[color:var(--border)] bg-[color:var(--primary)] px-5 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#1a1a1a]">
            SmartQuiz
          </div>
          <h1 className="mt-5 text-3xl font-black text-zinc-900">Đăng nhập</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Chọn role sau khi đăng nhập để vào dashboard phù hợp.
          </p>
        </div>

        <Card shadow="green">
          <form className="grid gap-3" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <div className="rounded-xl border-2 border-red-500 bg-[#FFD6DD] px-3 py-2 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
              <ButtonLink href="/" variant="ghost">
                Quay lại trang chủ
              </ButtonLink>
            </div>

            <div className="text-center text-sm text-zinc-600">
              Chưa có tài khoản?{" "}
              <ButtonLink href="/register" variant="ghost" className="inline-flex h-auto px-1 py-0">
                Đăng ký
              </ButtonLink>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

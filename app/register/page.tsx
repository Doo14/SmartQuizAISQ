"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
    if (password.length < 8 || password.length > 20) {
      setError("Mật khẩu phải từ 8 đến 20 ký tự.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(email, username, password, role);
      toast.push({ title: "Đăng ký thành công!", message: "Vui lòng đăng nhập.", variant: "success" });
      router.push("/login");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Đăng ký thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-[color:var(--surface-cream)] py-12">
      <div className="mx-auto w-full max-w-lg px-4 sm:px-6">
        <div className="mb-6 text-center">
          <Badge className="mb-3" variant="success">
            Teacher / Student
          </Badge>
          <h1 className="text-3xl font-black text-zinc-900">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Điền thông tin để tạo tài khoản mới.
          </p>
        </div>

        <Card shadow="orange">
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
              label="Username"
              type="text"
              placeholder="johndoe"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Nhập lại mật khẩu"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <div className="grid gap-2">
              <div className="text-sm font-bold text-zinc-900">Role</div>
              <div className="grid grid-cols-2 gap-2">
                <label className={[
                  "flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-[color:var(--border)] px-3 py-3 text-sm font-bold text-zinc-700 transition",
                  role === "STUDENT"
                    ? "bg-[color:var(--primary-surface)] shadow-[5px_5px_0_#166534]"
                    : "bg-white shadow-[3px_3px_0_#166534] hover:shadow-[5px_5px_0_#166534]",
                ].join(" ")}>
                  <input
                    type="radio"
                    name="role"
                    value="STUDENT"
                    checked={role === "STUDENT"}
                    onChange={() => setRole("STUDENT")}
                  />
                  Student
                </label>
                <label className={[
                  "flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-[color:var(--border)] px-3 py-3 text-sm font-bold text-zinc-700 transition",
                  role === "TEACHER"
                    ? "bg-[color:var(--accent-surface)] shadow-[5px_5px_0_#D4860A]"
                    : "bg-white shadow-[3px_3px_0_#D4860A] hover:shadow-[5px_5px_0_#D4860A]",
                ].join(" ")}>
                  <input
                    type="radio"
                    name="role"
                    value="TEACHER"
                    checked={role === "TEACHER"}
                    onChange={() => setRole("TEACHER")}
                  />
                  Teacher
                </label>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border-2 border-red-500 bg-[#FFD6DD] px-3 py-2 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Đang đăng ký..." : "Đăng ký"}
              </Button>
              <ButtonLink href="/" variant="ghost">
                Quay lại trang chủ
              </ButtonLink>
            </div>

            <div className="text-center text-sm text-zinc-600">
              Đã có tài khoản?{" "}
              <ButtonLink href="/login" variant="ghost" className="inline-flex h-auto px-1 py-0">
                Đăng nhập
              </ButtonLink>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

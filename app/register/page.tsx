import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[color:var(--surface-cream)] py-12">
      <div className="mx-auto w-full max-w-lg px-4 sm:px-6">
        <div className="mb-6 text-center">
          <Badge className="mb-3" variant="success">
            Teacher / Student
          </Badge>
          <h1 className="text-3xl font-black text-zinc-900">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Sau khi đăng ký, bạn sẽ nhận email xác thực.
          </p>
        </div>

        <Card shadow="orange">
          <form className="grid gap-3">
            <Input label="Email" type="email" placeholder="you@example.com" autoComplete="email" required />
            <Input label="Username" type="text" placeholder="johndoe" autoComplete="username" required />
            <Input label="Mật khẩu" type="password" placeholder="••••••••" autoComplete="new-password" required />
            <Input
              label="Nhập lại mật khẩu"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />

            <div className="grid gap-2">
              <div className="text-sm font-bold text-zinc-900">Role</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-[color:var(--border)] bg-[color:var(--primary-surface)] px-3 py-3 text-sm font-bold text-zinc-700 shadow-[3px_3px_0_#166534] transition hover:shadow-[5px_5px_0_#166534]">
                  <input type="radio" name="role" defaultChecked />
                  Student
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-[color:var(--border)] bg-[color:var(--accent-surface)] px-3 py-3 text-sm font-bold text-zinc-700 shadow-[3px_3px_0_#D4860A] transition hover:shadow-[5px_5px_0_#D4860A]">
                  <input type="radio" name="role" />
                  Teacher
                </label>
              </div>
              <div className="text-xs text-zinc-500">
                Demo nhanh: Teacher ở <span className="font-bold">/teacher</span>, Student ở{" "}
                <span className="font-bold">/student</span>.
              </div>
            </div>

            <div className="grid gap-3">
              <Button type="button">Đăng ký</Button>
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

        <div className="mt-4 text-center text-xs text-zinc-500">
          Placeholder UI: sẽ nối API `/auth/register` + `/auth/verify/:token` khi backend sẵn sàng.
        </div>
      </div>
    </div>
  );
}

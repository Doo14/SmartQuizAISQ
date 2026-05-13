import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
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
          <form className="grid gap-3">
            <Input label="Email" type="email" placeholder="you@example.com" autoComplete="email" required />
            <Input label="Mật khẩu" type="password" placeholder="••••••••" autoComplete="current-password" required />

            <div className="grid gap-3">
              <Button type="button">Đăng nhập</Button>
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

        <div className="mt-4 text-center text-xs text-zinc-500">
          Placeholder UI: sẽ nối API `/auth/login` khi backend sẵn sàng.
        </div>
      </div>
    </div>
  );
}

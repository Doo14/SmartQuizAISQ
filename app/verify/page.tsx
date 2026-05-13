import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function VerifyPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[color:var(--surface-cream)] py-12">
      <div className="container-app max-w-lg">
        <Card
          title="Xác thực email"
          description="Trang này sẽ nhận token từ link email và gọi API verify."
          right={<Badge variant="warning">Placeholder</Badge>}
          shadow="orange"
        >
          <div className="grid gap-3 text-sm text-zinc-600">
            <p>
              Backend sẽ gửi link dạng <span className="font-bold text-zinc-900">/verify?token=...</span>. Frontend đọc token, gọi{" "}
              <span className="font-bold text-zinc-900">GET /auth/verify/:token</span>, sau đó điều hướng về{" "}
              <span className="font-bold text-zinc-900">/login</span>.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href="/login">Đi tới đăng nhập</ButtonLink>
              <ButtonLink href="/" variant="secondary">
                Về trang chủ
              </ButtonLink>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[color:var(--surface-cream)] py-16">
      <div className="container-app max-w-md text-center">
        <div className="mb-6 text-6xl">🔍</div>
        <h1 className="text-5xl font-black text-zinc-900">404</h1>
        <p className="mt-2 text-lg font-semibold text-zinc-600">Trang không tồn tại</p>

        <Card shadow="orange" className="mt-8">
          <div className="grid gap-4">
            <p className="text-sm text-zinc-600">
              Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <ButtonLink href="/" className="justify-center">Trang chủ</ButtonLink>
              <ButtonLink href="/student/join" variant="secondary" className="justify-center">
                Vào phòng thi
              </ButtonLink>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

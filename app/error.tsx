"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SmartQuiz Error]", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center bg-[color:var(--surface-cream)] py-16">
      <div className="container-app max-w-md text-center">
        <div className="mb-6 text-6xl">⚠️</div>
        <h1 className="text-3xl font-black text-zinc-900">Đã xảy ra lỗi</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Có lỗi không mong muốn xảy ra. Vui lòng thử lại.
        </p>

        <Card shadow="red" className="mt-8">
          <div className="grid gap-4">
            <div className="rounded-xl border-2 border-red-200 bg-[color:var(--danger-surface)] p-3 text-left">
              <div className="text-xs font-bold text-red-700">Chi tiết lỗi</div>
              <div className="mt-1 font-mono text-xs text-red-600 break-all">
                {error.message || "Unknown error"}
              </div>
              {error.digest ? (
                <div className="mt-1 text-xs text-red-400">Digest: {error.digest}</div>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={reset} className="justify-center">
                Thử lại
              </Button>
              <ButtonLink href="/" variant="secondary" className="justify-center">
                Trang chủ
              </ButtonLink>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

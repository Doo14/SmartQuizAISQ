import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* ── HEADER — dark green, matching brand ── */}
      <header className="border-b-2 border-[color:var(--border)] bg-header-bg">
        <div className="container-app flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full border-2 border-white px-4 py-1.5 text-sm font-bold text-white">
              SmartQuiz
            </div>
          </div>
          <nav className="hidden items-center gap-6 sm:flex">
            <a href="#features" className="text-sm font-semibold text-white/80 hover:text-white transition">Tính năng</a>
            <a href="#how" className="text-sm font-semibold text-white/80 hover:text-white transition">Cách hoạt động</a>
            <a href="#faq" className="text-sm font-semibold text-white/80 hover:text-white transition">FAQ</a>
          </nav>
          <ButtonLink href="/login" size="md">Đăng nhập</ButtonLink>
        </div>
      </header>

      <main className="flex-1">
        {/* ── HERO — white bg, bold text, orange highlight ── */}
        <section className="bg-white border-b-2 border-[color:var(--border)]">
          <div className="container-app py-20 sm:py-28 text-center">
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 sm:text-6xl leading-tight">
              Thi trắc nghiệm
              <br />
              <span className="inline-block rounded-2xl bg-[color:var(--accent)] px-5 py-2 text-white -rotate-1 shadow-[4px_4px_0_#1a1a1a] mt-2">
                có giám sát.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-zinc-600 sm:text-lg">
              Tạo đề bằng Excel / nhập tay / AI. Học viên vào phòng bằng mã code, làm bài có timer,
              log vi phạm real-time.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/register" size="lg">
                Bắt đầu ngay
              </ButtonLink>
              <ButtonLink href="/teacher" variant="secondary" size="lg">
                Xem demo
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* ── FEATURES — dark bg with colored-shadow cards ── */}
        <section id="features" className="bg-[#1a1a1a] border-b-2 border-[color:var(--border)]">
          <div className="container-app py-16 sm:py-20">
            <h2 className="text-center text-2xl font-black text-white sm:text-3xl">
              Học tài thi phận!
            </h2>
            <div className="bento-grid mt-10">
              {/* Card 1 – green shadow */}
              <div className="rounded-2xl border-2 border-[color:var(--border)] bg-white p-6 shadow-[5px_5px_0_#166534] transition hover:shadow-[8px_8px_0_#166534]">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-full border-2 border-[color:var(--border)] bg-[color:var(--primary-surface)] text-lg">
                  ⚡
                </div>
                <div className="text-base font-bold text-zinc-900">Tạo đề nhanh</div>
                <p className="mt-2 text-sm text-zinc-600">
                  Import Excel, nhập tay, hoặc AI tự sinh câu hỏi. Preview trước khi lưu.
                </p>
              </div>

              {/* Card 2 – orange shadow */}
              <div className="rounded-2xl border-2 border-[color:var(--border)] bg-white p-6 shadow-[5px_5px_0_#D4860A] transition hover:shadow-[8px_8px_0_#D4860A]">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-full border-2 border-[color:var(--border)] bg-[color:var(--accent-surface)] text-lg">
                  🎨
                </div>
                <div className="text-base font-bold text-zinc-900">Giao diện thân thiện</div>
                <p className="mt-2 text-sm text-zinc-600">
                  Thiết kế neo-brutalism hiện đại, dễ nhìn, dễ dùng cho cả teacher và student.
                </p>
              </div>

              {/* Card 3 – red shadow */}
              <div className="rounded-2xl border-2 border-[color:var(--border)] bg-white p-6 shadow-[5px_5px_0_#DC2626] transition hover:shadow-[8px_8px_0_#DC2626]">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-full border-2 border-[color:var(--border)] bg-[color:var(--danger-surface)] text-lg">
                  🛡️
                </div>
                <div className="text-base font-bold text-zinc-900">Anti-cheat mạnh mẽ</div>
                <p className="mt-2 text-sm text-zinc-600">
                  Tab-switch, keyboard logger, camera detection — tất cả được log realtime.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS — cream bg like FictionSaaS ── */}
        <section id="how" className="bg-[color:var(--surface-cream)] border-b-2 border-[color:var(--border)]">
          <div className="container-app py-16 sm:py-20">
            <h2 className="text-center text-2xl font-black text-zinc-900 sm:text-3xl">Luồng hoạt động</h2>
            <div className="mx-auto mt-10 max-w-2xl">
              <Card
                title="4 bước đơn giản"
                description="Teacher tạo đề → Student vào thi → Chấm điểm → Thống kê"
                shadow="green"
              >
                <ol className="grid gap-4 text-sm text-zinc-700">
                  <li className="flex gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[color:var(--border)] bg-[color:var(--primary-surface)] font-bold shadow-[2px_2px_0_#166534]">
                      1
                    </span>
                    <div>
                      <div className="font-bold">Teacher tạo đề</div>
                      <div className="text-zinc-500">Excel / Manual / AI Generate</div>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[color:var(--border)] bg-[color:var(--accent-surface)] font-bold shadow-[2px_2px_0_#D4860A]">
                      2
                    </span>
                    <div>
                      <div className="font-bold">Student vào phòng</div>
                      <div className="text-zinc-500">Nhập code, validate thời gian</div>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[color:var(--border)] bg-[color:var(--danger-surface)] font-bold shadow-[2px_2px_0_#DC2626]">
                      3
                    </span>
                    <div>
                      <div className="font-bold">Làm bài + Anti-cheat</div>
                      <div className="text-zinc-500">Tab/keyboard/camera → cảnh báo vi phạm</div>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[color:var(--border)] bg-white font-bold shadow-[2px_2px_0_#1a1a1a]">
                      4
                    </span>
                    <div>
                      <div className="font-bold">Nộp bài + Kết quả</div>
                      <div className="text-zinc-500">Điểm + đáp án đúng/sai + log vi phạm</div>
                    </div>
                  </li>
                </ol>
              </Card>
            </div>
          </div>
        </section>

        {/* ── FAQ — bright green bg like FictionSaaS ── */}
        <section id="faq" className="bg-[color:var(--primary)] border-b-2 border-[color:var(--border)]">
          <div className="container-app py-16 sm:py-20">
            <h2 className="text-center text-2xl font-black text-white sm:text-3xl">Câu hỏi thường gặp</h2>
            <div className="mx-auto mt-10 max-w-2xl grid gap-4">
              <div className="rounded-2xl border-2 border-[color:var(--border)] bg-white px-6 py-5 shadow-[5px_5px_0_#1a1a1a]">
                <div className="font-bold text-zinc-900">Đây là demo UI hay sản phẩm thật?</div>
                <p className="mt-2 text-sm text-zinc-600">
                  Hiện tại là demo UI với localStorage. Backend Spring Boot sẽ được tích hợp trong Sprint 2–3.
                </p>
              </div>
              <div className="rounded-2xl border-2 border-[color:var(--border)] bg-white px-6 py-5 shadow-[5px_5px_0_#1a1a1a]">
                <div className="font-bold text-zinc-900">Anti-cheat hoạt động như thế nào?</div>
                <p className="mt-2 text-sm text-zinc-600">
                  Hệ thống giám sát tab-switch (Page Visibility API), keyboard (Ctrl+C/V), và camera (face-api.js).
                </p>
              </div>
              <div className="rounded-2xl border-2 border-[color:var(--border)] bg-white px-6 py-5 shadow-[5px_5px_0_#1a1a1a]">
                <div className="font-bold text-zinc-900">Teacher có thể tạo đề bằng cách nào?</div>
                <p className="mt-2 text-sm text-zinc-600">
                  3 cách: Import file CSV/Excel, nhập tay từng câu, hoặc dùng AI tự sinh câu hỏi theo chủ đề.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA — cream bg ── */}
        <section className="bg-[color:var(--surface-cream)] border-b-2 border-[color:var(--border)]">
          <div className="container-app py-16 sm:py-20 text-center">
            <h2 className="text-2xl font-black text-zinc-900 sm:text-3xl">Sẵn sàng thử?</h2>
            <p className="mx-auto mt-3 max-w-md text-base text-zinc-600">
              Không cần cài đặt. Truy cập ngay demo Teacher hoặc Student UI.
            </p>
            <div className="mt-8">
              <ButtonLink href="/register" size="lg">
                Bắt đầu ngay
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER — dark ── */}
      <footer className="border-t-2 border-[color:var(--border)] bg-[#111111] text-sm text-white/60">
        <div className="container-app flex flex-col items-center justify-between gap-6 py-10 sm:flex-row">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white bg-[color:var(--primary)] text-white font-black text-sm shadow-[3px_3px_0_#1a1a1a]">
              SQ
            </div>
            <div>
              <div className="text-sm font-black text-white">SmartQuiz AI</div>
              <div className="text-xs text-white/40">Hệ thống thi trực tuyến</div>
            </div>
          </div>

          {/* Tech logos — emoji only, no text */}
          <div className="flex items-center gap-3">
            {[
              { name: "Next.js",     emoji: "▲" },
              { name: "NestJS",      emoji: "🦅" },
              { name: "Gemini AI",   emoji: "✦" },
              { name: "PostgreSQL",  emoji: "🐘" },
              { name: "Docker",      emoji: "🐳" },
              { name: "Socket.IO",   emoji: "⚡" },
              { name: "Prisma",      emoji: "◆" },
              { name: "face-api.js", emoji: "👁" },
            ].map((tech) => (
              <span
                key={tech.name}
                title={tech.name}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-xl transition hover:border-white/30 hover:bg-white/10 hover:scale-110 cursor-default"
              >
                {tech.emoji}
              </span>
            ))}
          </div>

          {/* Copyright */}
          <div className="text-xs text-white/40 text-center sm:text-right">
            © {new Date().getFullYear()} SmartQuiz AI.<br className="hidden sm:block" /> All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

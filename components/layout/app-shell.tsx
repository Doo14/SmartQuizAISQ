"use client";

import Link from "next/link";
import * as React from "react";

export type NavItem = {
  href: string;
  label: string;
  badge?: string;
};

function SidebarContent({
  nav,
  onNavClick,
}: {
  nav: NavItem[];
  onNavClick?: () => void;
}) {
  return (
    <>
      {/* Brand logo */}
      <Link
        href="/"
        className="flex h-16 items-center gap-3 border-b-2 border-[color:var(--border)] px-5 transition-opacity hover:opacity-80"
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-white bg-[color:var(--primary)] text-white font-bold text-sm shadow-[2px_2px_0_#1a1a1a]">
          SQ
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-bold text-white">SmartQuiz AI</div>
          <div className="truncate text-xs text-white/50">Hệ thống thi trực tuyến</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="grid gap-1">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavClick}
                className="flex items-center justify-between rounded-full px-4 py-2.5 text-sm font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-white"
              >
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full border-2 border-white/30 bg-white/10 px-2 py-0.5 text-xs font-bold text-white/90">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

export function AppShell({
  title,
  subtitle,
  nav,
  children,
}: {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r-2 border-[color:var(--border)] bg-header-bg lg:flex lg:flex-col">
        <SidebarContent nav={nav} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          {/* Slide-over panel */}
          <aside className="relative flex h-full w-72 max-w-[80vw] flex-col border-r-2 border-[color:var(--border)] bg-header-bg shadow-[6px_0_0_#1a1a1a]">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-full border-2 border-white/30 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Đóng menu"
            >
              ✕
            </button>
            <SidebarContent
              nav={nav}
              onNavClick={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header bar */}
        <header className="sticky top-0 z-10 border-b-2 border-[color:var(--border)] bg-header-bg">
          <div className="container-app flex h-16 items-center justify-between gap-3">
            {/* Hamburger – mobile only */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white/30 text-white transition hover:bg-white/10 lg:hidden"
              aria-label="Mở menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="5" x2="17" y2="5" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="15" x2="17" y2="15" />
              </svg>
            </button>

            {/* Page title — mobile only (sidebar already shows brand on desktop) */}
            <div className="min-w-0 flex-1 lg:hidden">
              <div className="truncate text-sm font-bold text-white">{title}</div>
              {subtitle ? <div className="truncate text-xs text-white/60">{subtitle}</div> : null}
            </div>
            {/* Desktop: show page context */}
            <div className="hidden min-w-0 flex-1 lg:block">
              <div className="truncate text-sm font-bold text-white">{title}</div>
              {subtitle ? <div className="truncate text-xs text-white/80">{subtitle}</div> : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/"
                className="hidden rounded-full px-3 py-2 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition sm:inline-flex"
              >
                Trang chủ
              </Link>
              <Link
                href="/login"
                className="rounded-full border-2 border-white/30 bg-[color:var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#1a1a1a] hover:shadow-[5px_5px_0_#1a1a1a] transition-all"
              >
                Đăng nhập
              </Link>
            </div>
          </div>
        </header>

        <main className="container-app min-w-0 w-full flex-1 py-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

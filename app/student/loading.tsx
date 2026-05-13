import { AppShell } from "@/components/layout/app-shell";
import { SkeletonGrid } from "@/components/ui/skeleton";

export default function StudentLoading() {
  return (
    <AppShell
      title="Student Dashboard"
      subtitle="Đang tải..."
      nav={[
        { href: "/student", label: "Tổng quan" },
        { href: "/student/join", label: "Nhập mã phòng thi", badge: "code" },
        { href: "/student/history", label: "Lịch sử bài thi" },
      ]}
    >
      <div className="grid gap-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
           <div>
             <div className="h-8 w-[250px] animate-pulse rounded-md bg-zinc-200"></div>
             <div className="mt-2 h-4 w-[150px] animate-pulse rounded-md bg-zinc-200"></div>
           </div>
        </div>
        <SkeletonGrid count={3} cols={3} />
      </div>
    </AppShell>
  );
}

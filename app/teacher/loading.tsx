import { AppShell } from "@/components/layout/app-shell";
import { SkeletonGrid } from "@/components/ui/skeleton";

export default function TeacherLoading() {
  return (
    <AppShell
      title="Teacher Dashboard"
      subtitle="Đang tải..."
      nav={[
        { href: "/teacher", label: "Tổng quan" },
        { href: "/teacher/exams", label: "Danh sách đề" },
        { href: "/teacher/exams/new", label: "Tạo đề mới", badge: "Excel/Manual/AI" },
        { href: "/teacher/results", label: "Kết quả & Vi phạm" },
      ]}
    >
      <div className="grid gap-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
           <div>
             <div className="h-8 w-[250px] animate-pulse rounded-md bg-zinc-200"></div>
             <div className="mt-2 h-4 w-[150px] animate-pulse rounded-md bg-zinc-200"></div>
           </div>
        </div>
        <SkeletonGrid count={3} cols={1} />
      </div>
    </AppShell>
  );
}

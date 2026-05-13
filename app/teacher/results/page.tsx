"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  listAttempts,
  listViolations,
  type DemoAttempt,
  type DemoViolation,
  type ViolationType,
} from "@/lib/demo-store";

const VIOLATION_LABEL: Record<ViolationType, string> = {
  tab_switch: "Tab switch",
  keyboard_copy: "Copy",
  keyboard_paste: "Paste",
  camera_multiple_faces: "Multiple faces",
  camera_gaze_away: "Gaze away",
  camera_missing: "Camera missing",
};

const VIOLATION_COLOR: Record<ViolationType, "warning" | "danger"> = {
  tab_switch: "warning",
  keyboard_copy: "warning",
  keyboard_paste: "warning",
  camera_multiple_faces: "danger",
  camera_gaze_away: "warning",
  camera_missing: "danger",
};

export default function TeacherResultsPage() {
  const [selectedExamCode, setSelectedExamCode] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<ViolationType | "all">("all");
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  const attempts = listAttempts();
  const violations = listViolations();

  const examCodes = useMemo(() => {
    const set = new Set(attempts.map((a) => a.examCode).filter(Boolean));
    return Array.from(set).sort();
  }, [attempts]);

  const filteredAttempts = useMemo(() => {
    return attempts.filter((a) =>
      selectedExamCode === "all" ? true : a.examCode === selectedExamCode
    );
  }, [attempts, selectedExamCode]);

  const filteredViolations = useMemo(() => {
    const byAttempt = selectedAttemptId
      ? violations.filter((v) => v.attemptId === selectedAttemptId)
      : [];
    return byAttempt.filter((v) =>
      selectedType === "all" ? true : v.type === selectedType
    );
  }, [violations, selectedAttemptId, selectedType]);

  const selectedAttempt: DemoAttempt | undefined = useMemo(() => {
    if (!selectedAttemptId) return undefined;
    return attempts.find((a) => a.id === selectedAttemptId);
  }, [attempts, selectedAttemptId]);

  return (
    <AppShell
      title="Teacher Dashboard"
      subtitle="Kết quả & Vi phạm"
      nav={[
        { href: "/teacher", label: "Tổng quan" },
        { href: "/teacher/exams", label: "Danh sách đề" },
        { href: "/teacher/exams/new", label: "Tạo đề mới", badge: "Excel/Manual/AI" },
        { href: "/teacher/results", label: "Kết quả & Vi phạm" },
      ]}
    >
      <div className="page-stack">
        {/* ── Page header ── */}
        <div className="section-head flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">Kết quả & Vi phạm</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Demo data lấy từ localStorage khi student nộp bài. Chọn attempt để xem
              drill-down violation logs.
            </p>
          </div>
          <Badge variant="success">drill-down</Badge>
        </div>

        {/* ── Filters ── */}
        <Card title="Bộ lọc">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="grid gap-1.5 text-sm">
              <span className="font-bold text-zinc-900">Exam code</span>
              <select
                className="h-11 rounded-xl border-2 border-[color:var(--border)] bg-white px-3 text-sm text-zinc-900 shadow-[3px_3px_0_#1a1a1a] outline-none focus:shadow-[1px_1px_0_#1a1a1a] focus:ring-2 focus:ring-[color:var(--primary)]/20 transition-all"
                value={selectedExamCode}
                onChange={(e) => {
                  setSelectedExamCode(e.target.value);
                  setSelectedAttemptId(null);
                }}
              >
                <option value="all">Tất cả</option>
                {examCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-bold text-zinc-900">Violation type</span>
              <select
                className="h-11 rounded-xl border-2 border-[color:var(--border)] bg-white px-3 text-sm text-zinc-900 shadow-[3px_3px_0_#1a1a1a] outline-none focus:shadow-[1px_1px_0_#1a1a1a] focus:ring-2 focus:ring-[color:var(--primary)]/20 transition-all"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as ViolationType | "all")}
                disabled={!selectedAttemptId}
              >
                <option value="all">Tất cả</option>
                {Object.entries(VIOLATION_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        {/* ── Attempts table — full width ── */}
        <Card
          title="Attempts"
          description="Click nút Xem để drill-down violation logs của attempt đó"
          right={
            <span className="text-xs font-semibold text-zinc-500">
              {filteredAttempts.length} kết quả
            </span>
          }
        >
          {filteredAttempts.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-500">
              Chưa có attempt nào. Hãy vào{" "}
              <span className="font-bold text-zinc-800">/student/join</span> làm bài và
              nộp để tạo demo data.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border-2 border-zinc-200 bg-zinc-50">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b-2 border-zinc-200 bg-zinc-100 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3">Bài thi</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3 text-center">Score</th>
                    <th className="px-4 py-3 text-center">Vi phạm</th>
                    <th className="px-4 py-3">Nộp lúc</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttempts.map((a) => {
                    const active = a.id === selectedAttemptId;
                    return (
                      <tr
                        key={a.id}
                        className={[
                          "border-b border-zinc-200 transition-colors",
                          active
                            ? "bg-emerald-50 ring-2 ring-inset ring-emerald-400"
                            : "hover:bg-white",
                        ].join(" ")}
                      >
                        {/* Bài thi */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-zinc-900">{a.examTitle}</div>
                          <div className="mt-0.5 text-xs text-zinc-400">
                            Mã: {a.examCode}
                          </div>
                        </td>

                        {/* Student */}
                        <td className="px-4 py-3">
                          <span className="block max-w-[180px] truncate text-zinc-700">
                            {a.studentEmail}
                          </span>
                        </td>

                        {/* Score */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={[
                              "inline-flex items-center justify-center rounded-full border-2 px-3 py-1 text-sm font-black",
                              a.score >= 8
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : a.score >= 5
                                ? "border-amber-500 bg-amber-50 text-amber-700"
                                : "border-red-500 bg-red-50 text-red-700",
                            ].join(" ")}
                          >
                            {a.score.toFixed(1)}
                          </span>
                        </td>

                        {/* Vi phạm */}
                        <td className="px-4 py-3 text-center">
                          {a.violationCount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full border-2 border-amber-500 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
                              ⚠ {a.violationCount}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border-2 border-zinc-300 bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-500">
                              0
                            </span>
                          )}
                        </td>

                        {/* Nộp lúc */}
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {a.submittedAt
                            ? new Date(a.submittedAt).toLocaleString("vi-VN")
                            : "—"}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            variant={active ? "primary" : "secondary"}
                            onClick={() =>
                              setSelectedAttemptId(active ? null : a.id)
                            }
                          >
                            {active ? "Đóng" : "Xem"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── Drill-down panel — full width, below Attempts ── */}
        {selectedAttempt ? (
          <Card
            title="Drill-down — Chi tiết attempt"
            description={`Student: ${selectedAttempt.studentEmail}`}
            right={<Badge variant="success">selected</Badge>}
            shadow="green"
          >
            {/* Two-column layout: summary left | violation logs right */}
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              {/* Left: summary stats */}
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border-2 border-zinc-200 bg-zinc-50 p-4">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-400">
                    Thông tin attempt
                  </div>
                  <dl className="grid gap-2.5 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <dt className="text-zinc-500">Student</dt>
                      <dd className="max-w-[150px] break-all text-right font-semibold text-zinc-800">
                        {selectedAttempt.studentEmail}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-zinc-500">Điểm số</dt>
                      <dd>
                        <span
                          className={[
                            "inline-flex items-center justify-center rounded-full border-2 px-3 py-1 text-base font-black",
                            selectedAttempt.score >= 8
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : selectedAttempt.score >= 5
                              ? "border-amber-500 bg-amber-50 text-amber-700"
                              : "border-red-500 bg-red-50 text-red-700",
                          ].join(" ")}
                        >
                          {selectedAttempt.score.toFixed(1)} / 10
                        </span>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-zinc-500">Vi phạm</dt>
                      <dd>
                        {selectedAttempt.violationCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full border-2 border-amber-500 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
                            ⚠ {selectedAttempt.violationCount} lần
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border-2 border-emerald-400 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                            ✓ Không vi phạm
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-zinc-200 pt-2.5">
                      <dt className="text-zinc-500">Bắt đầu</dt>
                      <dd className="text-xs text-zinc-600">
                        {new Date(selectedAttempt.startedAt).toLocaleString("vi-VN")}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-zinc-500">Nộp bài</dt>
                      <dd className="text-xs text-zinc-600">
                        {selectedAttempt.submittedAt
                          ? new Date(selectedAttempt.submittedAt).toLocaleString("vi-VN")
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAttemptId(null)}
                  className="rounded-xl border-2 border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 shadow-[2px_2px_0_#d4d4d8] transition-all hover:shadow-none hover:bg-zinc-50"
                >
                  ✕ Đóng drill-down
                </button>
              </div>

              {/* Right: violation logs */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-bold text-zinc-900">
                    Violation Logs
                    <span className="ml-2 text-xs font-normal text-zinc-400">
                      ({filteredViolations.length} bản ghi)
                    </span>
                  </div>
                </div>

                {filteredViolations.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-500">
                    Không có violation log nào.
                    {selectedAttempt.violationCount === 0
                      ? " Student không vi phạm."
                      : " Thử thay đổi filter Violation type."}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border-2 border-zinc-200 bg-zinc-50">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead>
                        <tr className="border-b-2 border-zinc-200 bg-zinc-100 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                          <th className="px-4 py-3 w-32">Thời gian</th>
                          <th className="px-4 py-3 w-40">Loại vi phạm</th>
                          <th className="px-4 py-3">Mô tả</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredViolations.map((v: DemoViolation) => (
                          <tr
                            key={v.id}
                            className="border-b border-zinc-200 hover:bg-white transition-colors"
                          >
                            <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                              {new Date(v.createdAt).toLocaleTimeString("vi-VN")}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={VIOLATION_COLOR[v.type]}>
                                {VIOLATION_LABEL[v.type]}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-zinc-700">{v.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : (
          /* Placeholder khi chưa chọn attempt */
          <div className="rounded-2xl border-2 border-dashed border-zinc-300 px-6 py-8 text-center text-sm text-zinc-400">
            <div className="mb-1 text-2xl">👆</div>
            Chọn một attempt ở bảng trên để xem chi tiết vi phạm
          </div>
        )}
      </div>
    </AppShell>
  );
}

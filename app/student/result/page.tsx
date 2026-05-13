"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { calculateExamResult, mockExam, normalizeExamCode, parseSerializedAnswers, type OptionId } from "../mock-exam";

function StudentResultContent() {
  const searchParams = useSearchParams();

  const examCode = normalizeExamCode(searchParams.get("code") ?? "");
  const serializedAnswers = searchParams.get("answers") ?? "";
  const hasSubmission = Boolean(serializedAnswers);

  const answers = useMemo(
    () => parseSerializedAnswers(serializedAnswers, mockExam.questions.length),
    [serializedAnswers],
  );
  const result = useMemo(() => calculateExamResult(mockExam, answers), [answers]);

  return (
    <AppShell
      title="Student Dashboard"
      subtitle="Kết quả bài thi"
      nav={[
        { href: "/student", label: "Tổng quan" },
        { href: "/student/join", label: "Nhập mã phòng thi", badge: "code" },
        { href: "/student/history", label: "Lịch sử bài thi" },
      ]}
    >
      <div className="page-stack">
        <div className="section-head flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">Kết quả</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {hasSubmission ? (
                <>
                  Bài thi <span className="font-bold">{mockExam.title}</span>{" "}
                  {examCode ? (
                    <>
                      • Mã phòng: <span className="font-bold">{examCode}</span>
                    </>
                  ) : null}
                </>
              ) : (
                "Chưa có dữ liệu nộp bài. Hãy vào trang thi để làm và nộp bài trước."
              )}
            </p>
          </div>
          <ButtonLink href="/student" variant="secondary">
            Về dashboard
          </ButtonLink>
        </div>

        {!hasSubmission ? (
          <Card title="Chưa có kết quả">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-600">
                Không tìm thấy dữ liệu câu trả lời từ trang thi.
              </p>
              <ButtonLink href="/student/join">Vào làm bài</ButtonLink>
            </div>
          </Card>
        ) : null}

        <div className="bento-grid">
          <Card title="Điểm" description="Thang điểm 10">
            <div className="text-3xl font-black text-zinc-900">{result.score.toFixed(1)}</div>
          </Card>
          <Card title="Đúng" description="Số câu trả lời đúng">
            <div className="text-3xl font-black text-zinc-900">
              {result.correctCount}/{result.totalQuestions}
            </div>
          </Card>
          <Card title="Đã trả lời" description="Số câu đã chọn đáp án">
            <div className="text-3xl font-black text-zinc-900">
              {result.answeredCount}/{result.totalQuestions}
            </div>
          </Card>
        </div>

        <Card title="Xem lại câu trả lời" description="Đối chiếu với đáp án chuẩn của mock exam">
          <div className="grid gap-3">
            {mockExam.questions.map((question, index) => {
              const selected = answers[index];
              const isCorrect = selected === question.answer;
              const optionEntries = Object.entries(question.options) as Array<[OptionId, string]>;

              return (
                <div
                  key={question.id}
                  className="rounded-2xl border-2 border-[color:var(--border)] bg-white p-4 shadow-[4px_4px_0_#1a1a1a]"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-zinc-900">
                        Câu {index + 1}: {question.content}
                      </div>
                      <div className="mt-1 text-sm text-zinc-600">
                        Bạn chọn: <span className="font-bold">{selected ?? "Chưa trả lời"}</span> • Đáp án đúng:{" "}
                        <span className="font-bold">{question.answer}</span>
                      </div>
                    </div>
                    <Badge variant={selected ? (isCorrect ? "success" : "danger") : "warning"}>
                      {selected ? (isCorrect ? "Đúng" : "Sai") : "Bỏ trống"}
                    </Badge>
                  </div>

                  <div className="grid gap-2">
                    {optionEntries.map(([option, content]) => {
                      const isAnswer = option === question.answer;
                      const isSelected = option === selected;

                      return (
                        <div
                          key={option}
                          className={[
                            "rounded-xl border-2 px-3 py-2 text-sm",
                            isAnswer
                              ? "border-emerald-600 bg-[#D4F5E9] text-emerald-800 font-semibold shadow-[2px_2px_0_#065F46]"
                              : isSelected
                                ? "border-red-500 bg-[#FFD6DD] text-red-800 font-semibold shadow-[2px_2px_0_#991B1B]"
                                : "border-[color:var(--border)] bg-white text-zinc-700 shadow-[2px_2px_0_#1a1a1a]",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="font-bold">{option}.</span> {content}
                          {isAnswer ? " • Đáp án đúng" : ""}
                          {!isAnswer && isSelected ? " • Bạn đã chọn" : ""}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export default function StudentResultPage() {
  return (
    <Suspense>
      <StudentResultContent />
    </Suspense>
  );
}

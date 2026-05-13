"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { randomId, setExamQuestions, upsertExam, type DemoQuestion } from "@/lib/demo-store";

type TabKey = "excel" | "manual" | "ai";
type OptionId = "A" | "B" | "C" | "D";

type EditorQuestion = {
  id: string;
  content: string;
  options: Record<OptionId, string>;
  correct: OptionId;
};

type CsvParseResult = {
  questions: EditorQuestion[];
  rowErrors: string[];
  fatalError?: string;
};

const OPTION_IDS: OptionId[] = ["A", "B", "C", "D"];

function createEmptyQuestion(partial?: Partial<EditorQuestion>): EditorQuestion {
  return {
    id: partial?.id ?? randomId("q"),
    content: partial?.content ?? "",
    options: {
      A: partial?.options?.A ?? "",
      B: partial?.options?.B ?? "",
      C: partial?.options?.C ?? "",
      D: partial?.options?.D ?? "",
    },
    correct: partial?.correct ?? "A",
  };
}

function parseCsvRows(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = raw[i + 1];
        if (next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(current.trim());
      current = "";
      continue;
    }
    if (ch === "\n") {
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
      continue;
    }
    if (ch === "\r") continue;
    current += ch;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.length > 0));
}

function parseCsv(text: string): CsvParseResult {
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    return { questions: [], rowErrors: [], fatalError: "File CSV trống." };
  }

  const expectedHeader = ["content", "a", "b", "c", "d", "answer"];
  const header = rows[0].map((x) => x.toLowerCase());
  const validHeader =
    header.length === expectedHeader.length &&
    expectedHeader.every((expected, idx) => expected === header[idx]);

  if (!validHeader) {
    return {
      questions: [],
      rowErrors: [],
      fatalError: "Header không hợp lệ. Cần đúng thứ tự: content,A,B,C,D,answer",
    };
  }

  const questions: EditorQuestion[] = [];
  const rowErrors: string[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const line = i + 1;
    if (row.length < 6) {
      rowErrors.push(`Dòng ${line}: cần đủ 6 cột.`);
      continue;
    }

    const [content, a, b, c, d, answerRaw] = row;
    const answer = answerRaw.toUpperCase() as OptionId;
    if (!content || !a || !b || !c || !d) {
      rowErrors.push(`Dòng ${line}: content và đáp án A-D không được để trống.`);
      continue;
    }
    if (!OPTION_IDS.includes(answer)) {
      rowErrors.push(`Dòng ${line}: answer phải là A/B/C/D.`);
      continue;
    }

    questions.push(
      createEmptyQuestion({
        content,
        options: { A: a, B: b, C: c, D: d },
        correct: answer,
      }),
    );
  }

  return { questions, rowErrors };
}

function buildAiQuestions(topic: string, count: number, difficulty: string): EditorQuestion[] {
  const safeTopic = topic.trim() || "Chủ đề tổng hợp";
  const safeDifficulty = difficulty.trim() || "medium";

  return Array.from({ length: count }).map((_, idx) => {
    const no = idx + 1;
    const correct = OPTION_IDS[idx % OPTION_IDS.length];
    return createEmptyQuestion({
      content: `[AI-${safeDifficulty}] ${safeTopic} - Câu ${no}: chọn phương án đúng nhất.`,
      options: {
        A: `${safeTopic} - phương án A #${no}`,
        B: `${safeTopic} - phương án B #${no}`,
        C: `${safeTopic} - phương án C #${no}`,
        D: `${safeTopic} - phương án D #${no}`,
      },
      correct,
    });
  });
}

function toDemoQuestions(items: EditorQuestion[]): DemoQuestion[] {
  return items.map((q) => ({
    id: q.id,
    content: q.content.trim(),
    options: {
      A: q.options.A.trim(),
      B: q.options.B.trim(),
      C: q.options.C.trim(),
      D: q.options.D.trim(),
    },
    correct: q.correct,
  }));
}

export default function TeacherCreateExamPage() {
  const router = useRouter();
  const toast = useToast();

  const [tab, setTab] = useState<TabKey>("manual");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("15");

  const [questions, setQuestions] = useState<EditorQuestion[]>([createEmptyQuestion()]);

  const [csvFileName, setCsvFileName] = useState("");
  const [csvPreview, setCsvPreview] = useState<EditorQuestion[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvRowErrors, setCsvRowErrors] = useState<string[]>([]);

  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState("5");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiPreview, setAiPreview] = useState<EditorQuestion[]>([]);

  const [saveError, setSaveError] = useState<string | null>(null);

  const answeredCount = useMemo(
    () => questions.filter((q) => q.content.trim().length > 0).length,
    [questions],
  );

  const canSave = useMemo(() => {
    const duration = Number(durationMinutes);
    if (!title.trim() || Number.isNaN(duration) || duration <= 0) return false;
    if (!questions.length) return false;
    return questions.every(
      (q) =>
        q.content.trim() &&
        q.options.A.trim() &&
        q.options.B.trim() &&
        q.options.C.trim() &&
        q.options.D.trim(),
    );
  }, [durationMinutes, questions, title]);

  const updateQuestion = (id: string, updater: (old: EditorQuestion) => EditorQuestion) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? updater(q) : q)));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    setQuestions((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((q) => q.id !== id);
    });
  };

  const onCsvSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setCsvPreview([]);
    setCsvError(null);
    setCsvRowErrors([]);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Demo hiện hỗ trợ CSV. Vui lòng chọn file .csv");
      return;
    }

    const text = await file.text();
    const parsed = parseCsv(text);
    setCsvPreview(parsed.questions);
    setCsvRowErrors(parsed.rowErrors);
    if (parsed.fatalError) setCsvError(parsed.fatalError);
  };

  const importCsvToManual = () => {
    if (!csvPreview.length) return;
    setQuestions(csvPreview);
    setTab("manual");
    toast.push({
      title: "Import thành công",
      message: `Đã nạp ${csvPreview.length} câu hỏi vào Manual editor.`,
      variant: "success",
    });
  };

  const generateAiPreview = () => {
    const count = Math.max(1, Math.min(50, Number(aiCount) || 1));
    const generated = buildAiQuestions(aiTopic, count, aiDifficulty);
    setAiPreview(generated);
  };

  const applyAiPreview = () => {
    if (!aiPreview.length) return;
    setQuestions(aiPreview);
    setTab("manual");
    toast.push({
      title: "Áp dụng AI preview",
      message: `Đã chuyển ${aiPreview.length} câu AI vào Manual editor.`,
      variant: "success",
    });
  };

  const handleSave = () => {
    setSaveError(null);

    const duration = Number(durationMinutes);
    if (!title.trim()) {
      setSaveError("Vui lòng nhập tiêu đề đề thi.");
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      setSaveError("Thời lượng phải là số dương.");
      return;
    }
    if (!canSave) {
      setSaveError("Cần nhập đầy đủ nội dung và 4 đáp án cho tất cả câu hỏi.");
      return;
    }

    const examId = randomId("exam");
    const now = new Date().toISOString();

    const normalizedQuestions = toDemoQuestions(questions);

    upsertExam({
      id: examId,
      title: title.trim(),
      description: description.trim() || undefined,
      durationMinutes: duration,
      questionCount: normalizedQuestions.length,
      createdAt: now,
      updatedAt: now,
    });

    setExamQuestions(examId, normalizedQuestions);

    toast.push({
      title: "Lưu đề thi thành công",
      message: `Đề thi "${title.trim()}" đã được tạo.`,
      variant: "success",
    });

    router.push(`/teacher/exams/${examId}`);
  };

  return (
    <AppShell
      title="Teacher Dashboard"
      subtitle="Tạo đề thi mới"
      nav={[
        { href: "/teacher", label: "Tổng quan" },
        { href: "/teacher/exams", label: "Danh sách đề" },
        { href: "/teacher/exams/new", label: "Tạo đề mới", badge: "Excel/Manual/AI" },
        { href: "/teacher/results", label: "Kết quả & Vi phạm" },
      ]}
    >
      <div className="page-stack">
        <div className="section-head flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">Tạo đề thi</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Nhập metadata, soạn câu hỏi bằng Manual hoặc import CSV / AI preview.
            </p>
          </div>
          <Badge variant="success">Demo localStorage</Badge>
        </div>

        <Card title="Thông tin đề thi" description="Metadata cơ bản cho phòng thi">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Tiêu đề đề thi" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Java Core Midterm" />
            <Input
              label="Thời lượng (phút)"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
            <Input label="Bắt đầu" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <Input label="Kết thúc" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>

          <div className="mt-3 grid gap-1.5 text-sm">
            <span className="font-bold text-zinc-900">Mô tả</span>
            <textarea
              className="min-h-24 w-full rounded-xl border-2 border-[color:var(--border)] bg-white px-3 py-2 text-sm text-zinc-900 shadow-[3px_3px_0_#1a1a1a] outline-none transition focus:shadow-[1px_1px_0_#1a1a1a] focus:ring-2 focus:ring-[color:var(--primary)]/20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về đề thi..."
            />
          </div>
        </Card>

        <Card title="Question Builder" description={`Đã có ${questions.length} câu • đã nhập nội dung ${answeredCount} câu`}>
          <div className="mb-5 flex flex-wrap gap-2">
            {(["excel", "manual", "ai"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={[
                  "rounded-xl border-2 border-[color:var(--border)] px-4 py-2.5 text-sm font-bold transition-all",
                  tab === item
                    ? "bg-[color:var(--primary)] text-white shadow-[4px_4px_0_#1a1a1a]"
                    : "bg-white text-zinc-700 shadow-[3px_3px_0_#1a1a1a] hover:shadow-[5px_5px_0_#1a1a1a]",
                ].join(" ")}
              >
                {item === "excel" ? "Excel Import" : item === "manual" ? "Manual" : "AI Generate"}
              </button>
            ))}
          </div>

          {tab === "excel" ? (
            <div className="grid gap-3">
              <div className="text-sm text-zinc-600">
                Upload file CSV theo format: <span className="font-bold">content,A,B,C,D,answer</span>
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={onCsvSelected}
                className="block w-full rounded-xl border-2 border-[color:var(--border)] bg-white px-3 py-2 text-sm text-zinc-700 shadow-[3px_3px_0_#1a1a1a] file:mr-3 file:rounded-lg file:border-2 file:border-[color:var(--border)] file:bg-[color:var(--surface-warm)] file:px-3 file:py-1.5 file:font-bold file:text-zinc-700"
              />
              {csvFileName ? <div className="text-xs text-zinc-500">Đã chọn file: {csvFileName}</div> : null}
              {csvError ? <div className="rounded-xl border-2 border-red-500 bg-[#FFD6DD] px-3 py-2 text-sm font-semibold text-red-700">{csvError}</div> : null}
              {csvRowErrors.length > 0 ? (
                <div className="rounded-xl border-2 border-amber-500 bg-[#FFF3CD] px-3 py-2 text-sm text-amber-900">
                  {csvRowErrors.slice(0, 8).map((err) => (
                    <div key={err}>- {err}</div>
                  ))}
                  {csvRowErrors.length > 8 ? <div>- ... và {csvRowErrors.length - 8} lỗi khác</div> : null}
                </div>
              ) : null}

              {csvPreview.length > 0 ? (
                <>
                  <div className="brutal-card-soft overflow-auto rounded-xl">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-[color:var(--surface-warm)] text-left text-zinc-600">
                        <tr>
                          <th className="px-3 py-2 font-bold">#</th>
                          <th className="px-3 py-2 font-bold">Content</th>
                          <th className="px-3 py-2 font-bold">A</th>
                          <th className="px-3 py-2 font-bold">B</th>
                          <th className="px-3 py-2 font-bold">C</th>
                          <th className="px-3 py-2 font-bold">D</th>
                          <th className="px-3 py-2 font-bold">Answer</th>
                        </tr>
                      </thead>
                      <tbody className="text-zinc-700">
                        {csvPreview.map((q, idx) => (
                          <tr key={q.id} className="border-t-2 border-zinc-200">
                            <td className="px-3 py-2">{idx + 1}</td>
                            <td className="px-3 py-2">{q.content}</td>
                            <td className="px-3 py-2">{q.options.A}</td>
                            <td className="px-3 py-2">{q.options.B}</td>
                            <td className="px-3 py-2">{q.options.C}</td>
                            <td className="px-3 py-2">{q.options.D}</td>
                            <td className="px-3 py-2">
                              <Badge>{q.correct}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={importCsvToManual}>
                      Import vào Manual
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {tab === "manual" ? (
            <div className="grid gap-4">
              <div className="flex justify-end">
                <Button type="button" onClick={addQuestion}>
                  + Thêm câu hỏi
                </Button>
              </div>

              {questions.map((q, index) => (
                <div key={q.id} className="brutal-card rounded-2xl p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-black text-zinc-900">Câu hỏi #{index + 1}</div>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" size="sm" disabled={index === 0} onClick={() => moveQuestion(index, -1)}>
                        Lên
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={index === questions.length - 1}
                        onClick={() => moveQuestion(index, 1)}
                      >
                        Xuống
                      </Button>
                      <Button type="button" variant="danger" size="sm" disabled={questions.length === 1} onClick={() => removeQuestion(q.id)}>
                        Xóa
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="grid gap-1.5 text-sm">
                      <span className="font-bold text-zinc-900">Nội dung câu hỏi</span>
                      <textarea
                        className="min-h-20 w-full rounded-xl border-2 border-[color:var(--border)] bg-white px-3 py-2 text-sm text-zinc-900 shadow-[3px_3px_0_#1a1a1a] outline-none transition focus:shadow-[1px_1px_0_#1a1a1a] focus:ring-2 focus:ring-[color:var(--primary)]/20"
                        value={q.content}
                        onChange={(e) =>
                          updateQuestion(q.id, (old) => ({
                            ...old,
                            content: e.target.value,
                          }))
                        }
                        placeholder="Nhập nội dung câu hỏi"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {OPTION_IDS.map((option) => (
                        <Input
                          key={option}
                          label={`Đáp án ${option}`}
                          value={q.options[option]}
                          onChange={(e) =>
                            updateQuestion(q.id, (old) => ({
                              ...old,
                              options: {
                                ...old.options,
                                [option]: e.target.value,
                              },
                            }))
                          }
                        />
                      ))}
                    </div>

                    <label className="grid gap-1.5 text-sm">
                      <span className="font-bold text-zinc-900">Đáp án đúng</span>
                      <select
                        value={q.correct}
                        onChange={(e) =>
                          updateQuestion(q.id, (old) => ({
                            ...old,
                            correct: e.target.value as OptionId,
                          }))
                        }
                        className="h-11 rounded-xl border-2 border-[color:var(--border)] bg-white px-3 text-sm text-zinc-900 shadow-[3px_3px_0_#1a1a1a] outline-none focus:shadow-[1px_1px_0_#1a1a1a] focus:ring-2 focus:ring-[color:var(--primary)]/20 transition-all"
                      >
                        {OPTION_IDS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {tab === "ai" ? (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Chủ đề" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="VD: Java OOP" />
                <Input label="Số câu" type="number" min={1} max={50} value={aiCount} onChange={(e) => setAiCount(e.target.value)} />
                <label className="grid gap-1.5 text-sm">
                  <span className="font-bold text-zinc-900">Độ khó</span>
                  <select
                    className="h-11 rounded-xl border-2 border-[color:var(--border)] bg-white px-3 text-sm text-zinc-900 shadow-[3px_3px_0_#1a1a1a] outline-none focus:shadow-[1px_1px_0_#1a1a1a] focus:ring-2 focus:ring-[color:var(--primary)]/20 transition-all"
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value)}
                  >
                    <option value="easy">easy</option>
                    <option value="medium">medium</option>
                    <option value="hard">hard</option>
                  </select>
                </label>
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={generateAiPreview}>
                  Tạo AI preview
                </Button>
                <Button type="button" variant="secondary" disabled={aiPreview.length === 0} onClick={applyAiPreview}>
                  Áp dụng vào Manual
                </Button>
              </div>

              {aiPreview.length > 0 ? (
                <div className="brutal-card-soft grid gap-2 rounded-xl p-3">
                  {aiPreview.map((q, idx) => (
                    <div key={q.id} className="text-sm text-zinc-700">
                      <span className="font-bold">#{idx + 1}</span> {q.content}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-[color:var(--border)] bg-[color:var(--surface-warm)] px-3 py-4 text-sm text-zinc-500">
                  Chưa có AI preview. Nhập chủ đề và số câu rồi bấm nút Tạo AI preview.
                </div>
              )}
            </div>
          ) : null}
        </Card>

        <Card title="Hoàn tất" description="Lưu đề thi vào localStorage để demo danh sách và kết quả">
          <div className="grid gap-3">
            <div className="text-sm text-zinc-600">
              Tổng câu hỏi: <span className="font-bold text-zinc-900">{questions.length}</span> • Đã có nội dung:{" "}
              <span className="font-bold text-zinc-900">{answeredCount}</span>
            </div>
            {saveError ? <div className="rounded-xl border-2 border-red-500 bg-[#FFD6DD] px-3 py-2 text-sm font-semibold text-red-700">{saveError}</div> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={handleSave} disabled={!canSave}>
                Lưu đề thi
              </Button>
              <ButtonLink href="/teacher/exams" variant="secondary">
                Quay lại danh sách
              </ButtonLink>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

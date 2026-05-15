"use client";

import { ChangeEvent, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { createExam, importExamExcel, generateAiQuestions, getExamDetail, ApiError } from "@/lib/api";

type TabKey = "excel" | "manual" | "ai";
type OptionId = "A" | "B" | "C" | "D";

type EditorQuestion = {
  id: string;
  content: string;
  options: Record<OptionId, string>;
  correct: OptionId;
};

const OPTION_IDS: OptionId[] = ["A", "B", "C", "D"];

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

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

/* ── CSV parser ──────────────────────────────────────────────────────── */
function parseCsvRows(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else current += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(current.trim()); current = ""; continue; }
    if (ch === '\n') { row.push(current.trim()); rows.push(row); row = []; current = ""; continue; }
    if (ch === '\r') continue;
    current += ch;
  }
  if (current.length > 0 || row.length > 0) { row.push(current.trim()); rows.push(row); }
  return rows.filter((cells) => cells.some((c) => c.length > 0));
}

function parseCsv(text: string): { questions: EditorQuestion[]; rowErrors: string[]; fatalError?: string } {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return { questions: [], rowErrors: [], fatalError: "File CSV trống." };
  const expectedHeader = ["content", "a", "b", "c", "d", "answer"];
  const header = rows[0].map((x) => x.toLowerCase());
  const validHeader = header.length === expectedHeader.length && expectedHeader.every((e, i) => e === header[i]);
  if (!validHeader) return { questions: [], rowErrors: [], fatalError: "Header không hợp lệ. Cần: content,A,B,C,D,answer" };

  const questions: EditorQuestion[] = [];
  const rowErrors: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 6) { rowErrors.push(`Dòng ${i + 1}: cần đủ 6 cột.`); continue; }
    const [content, a, b, c, d, answerRaw] = r;
    const answer = answerRaw.toUpperCase() as OptionId;
    if (!content || !a || !b || !c || !d) { rowErrors.push(`Dòng ${i + 1}: không được để trống.`); continue; }
    if (!OPTION_IDS.includes(answer)) { rowErrors.push(`Dòng ${i + 1}: answer phải là A/B/C/D.`); continue; }
    questions.push(createEmptyQuestion({ content, options: { A: a, B: b, C: c, D: d }, correct: answer }));
  }
  return { questions, rowErrors };
}

export default function TeacherCreateExamPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "teacher") { router.push("/student"); return; }
  }, [user, authLoading, router]);

  const [tab, setTab] = useState<TabKey>("manual");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("15");
  const [questions, setQuestions] = useState<EditorQuestion[]>([createEmptyQuestion()]);

  // Excel tab
  const [csvFileName, setCsvFileName] = useState("");
  const [csvPreview, setCsvPreview] = useState<EditorQuestion[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvRowErrors, setCsvRowErrors] = useState<string[]>([]);

  // AI tab
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState("5");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiLoading, setAiLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const answeredCount = useMemo(
    () => questions.filter((q) => q.content.trim().length > 0).length,
    [questions],
  );

  const canSave = useMemo(() => {
    const duration = Number(durationMinutes);
    if (!title.trim() || isNaN(duration) || duration <= 0) return false;
    if (!questions.length) return false;
    return questions.every(
      (q) => q.content.trim() && q.options.A.trim() && q.options.B.trim() && q.options.C.trim() && q.options.D.trim(),
    );
  }, [durationMinutes, questions, title]);

  const updateQuestion = (id: string, updater: (old: EditorQuestion) => EditorQuestion) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? updater(q) : q)));
  const addQuestion = () => setQuestions((prev) => [...prev, createEmptyQuestion()]);
  const removeQuestion = (id: string) =>
    setQuestions((prev) => (prev.length === 1 ? prev : prev.filter((q) => q.id !== id)));
  const moveQuestion = (index: number, dir: -1 | 1) =>
    setQuestions((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  /* Excel handlers */
  const onCsvSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvPreview([]); setCsvError(null); setCsvRowErrors([]);
    if (!file.name.toLowerCase().endsWith(".csv")) { setCsvError("Chỉ hỗ trợ file .csv"); return; }
    const text = await file.text();
    const parsed = parseCsv(text);
    setCsvPreview(parsed.questions); setCsvRowErrors(parsed.rowErrors);
    if (parsed.fatalError) setCsvError(parsed.fatalError);
  };
  const importCsvToManual = () => {
    if (!csvPreview.length) return;
    setQuestions(csvPreview); setTab("manual");
    toast.push({ title: "Import thành công", message: `${csvPreview.length} câu hỏi.`, variant: "success" });
  };

  /* AI handler */
  const generateAiPreview = async () => {
    if (!title.trim()) { toast.push({ title: "Vui lòng nhập tiêu đề đề thi trước", variant: "warning" }); return; }
    const duration = Number(durationMinutes);
    if (!duration) { toast.push({ title: "Vui lòng nhập thời lượng trước", variant: "warning" }); return; }

    setAiLoading(true);
    setSaveError(null);
    try {
      // Create exam first to get ID, then generate AI questions
      const qty = Math.max(1, Math.min(50, Number(aiCount) || 5));
      // Create a temporary exam with no questions
      const { id: examId } = await createExam({
        title: title.trim(),
        description: description.trim() || undefined,
        durationMinutes: duration,
        questions: [],
      });
      // Generate AI questions into that exam
      await generateAiQuestions(examId, aiTopic || "Chủ đề tổng hợp", aiDifficulty, qty);
      toast.push({ title: "AI đã tạo câu hỏi!", message: "Đang tải danh sách câu hỏi...", variant: "success" });
      // Fetch the created questions
      const detail = await getExamDetail(examId);
      if (detail?.questions?.length) {
        const editorQs: EditorQuestion[] = detail.questions.map((q) => {
          const opts: Record<OptionId, string> = { A: "", B: "", C: "", D: "" };
          const optKeys: OptionId[] = ["A", "B", "C", "D"];
          let correctOpt: OptionId = "A";
          q.options.forEach((o, idx) => {
            opts[optKeys[idx]] = o.content;
            if (o.isCorrect) correctOpt = optKeys[idx];
          });
          return createEmptyQuestion({ id: String(q.id), content: q.content, options: opts, correct: correctOpt });
        });
        setQuestions(editorQs);
        setTab("manual");
        toast.push({ title: "Đã nạp câu hỏi AI vào editor", variant: "success" });
        router.push(`/teacher/exams/${examId}`);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Lỗi tạo câu hỏi AI";
      setSaveError(msg);
      toast.push({ title: "Lỗi AI", message: msg, variant: "danger" });
    } finally {
      setAiLoading(false);
    }
  };

  /* Save handler */
  const handleSave = async () => {
    setSaveError(null);
    const duration = Number(durationMinutes);
    if (!title.trim()) { setSaveError("Vui lòng nhập tiêu đề đề thi."); return; }
    if (!isFinite(duration) || duration <= 0) { setSaveError("Thời lượng phải là số dương."); return; }
    if (!canSave) { setSaveError("Cần nhập đầy đủ nội dung và 4 đáp án cho tất cả câu hỏi."); return; }

    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        durationMinutes: duration,
        questions: questions.map((q) => ({
          content: q.content.trim(),
          options: OPTION_IDS.map((id) => ({
            content: q.options[id].trim(),
            isCorrect: q.correct === id,
          })),
        })),
      };
      const { id: examId } = await createExam(body);
      toast.push({ title: "Lưu đề thi thành công", message: `"${title.trim()}" đã được tạo.`, variant: "success" });
      router.push(`/teacher/exams/${examId}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Lỗi lưu đề thi";
      setSaveError(msg);
      toast.push({ title: "Lỗi", message: msg, variant: "danger" });
    } finally {
      setSaving(false);
    }
  };

  /* Excel import via backend (for .xlsx) */
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [xlsxExamId, setXlsxExamId] = useState<number | null>(null);
  const handleXlsxImport = async () => {
    if (!xlsxFile || !title.trim()) {
      toast.push({ title: "Cần nhập tiêu đề và chọn file", variant: "warning" }); return;
    }
    setSaving(true);
    try {
      const { id: examId } = await createExam({
        title: title.trim(), description: description.trim() || undefined,
        durationMinutes: Number(durationMinutes) || 15, questions: [],
      });
      await importExamExcel(examId, xlsxFile);
      toast.push({ title: "Import Excel thành công!", variant: "success" });
      router.push(`/teacher/exams/${examId}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Lỗi import Excel";
      toast.push({ title: "Lỗi", message: msg, variant: "danger" });
    } finally {
      setSaving(false);
    }
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
            <p className="mt-1 text-sm text-zinc-600">Nhập metadata, soạn câu hỏi bằng Manual hoặc import CSV/Excel / AI.</p>
          </div>
          <Badge variant="success">Kết nối backend</Badge>
        </div>

        {/* Metadata */}
        <Card title="Thông tin đề thi" description="Metadata cơ bản cho phòng thi">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Tiêu đề đề thi" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Java Core Midterm" />
            <Input label="Thời lượng (phút)" type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
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

        {/* Question Builder */}
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
                {item === "excel" ? "Excel/CSV Import" : item === "manual" ? "Manual" : "AI Generate"}
              </button>
            ))}
          </div>

          {/* Excel tab */}
          {tab === "excel" && (
            <div className="grid gap-4">
              <div className="text-sm text-zinc-600">
                <strong>CSV format:</strong> <code>content,A,B,C,D,answer</code> (header bắt buộc)<br />
                <strong>Excel/XLSX:</strong> Upload file Excel, backend tự xử lý.
              </div>

              {/* CSV section */}
              <div className="grid gap-2">
                <div className="text-xs font-bold text-zinc-700 uppercase">CSV (client-side parse)</div>
                <input type="file" accept=".csv,text/csv" onChange={onCsvSelected}
                  className="block w-full rounded-xl border-2 border-[color:var(--border)] bg-white px-3 py-2 text-sm text-zinc-700 shadow-[3px_3px_0_#1a1a1a] file:mr-3 file:rounded-lg file:border-2 file:border-[color:var(--border)] file:bg-[color:var(--surface-warm)] file:px-3 file:py-1.5 file:font-bold file:text-zinc-700"
                />
                {csvFileName && <div className="text-xs text-zinc-500">Đã chọn: {csvFileName}</div>}
                {csvError && <div className="rounded-xl border-2 border-red-500 bg-[#FFD6DD] px-3 py-2 text-sm font-semibold text-red-700">{csvError}</div>}
                {csvRowErrors.length > 0 && (
                  <div className="rounded-xl border-2 border-amber-500 bg-[#FFF3CD] px-3 py-2 text-sm text-amber-900">
                    {csvRowErrors.slice(0, 8).map((e) => <div key={e}>- {e}</div>)}
                  </div>
                )}
                {csvPreview.length > 0 && (
                  <div className="flex gap-2">
                    <Button type="button" onClick={importCsvToManual}>Import {csvPreview.length} câu vào Manual</Button>
                  </div>
                )}
              </div>

              {/* Excel/XLSX section */}
              <div className="grid gap-2 border-t-2 border-dashed border-zinc-200 pt-4">
                <div className="text-xs font-bold text-zinc-700 uppercase">Excel/XLSX (backend parse)</div>
                <p className="text-xs text-zinc-500">Nhập tiêu đề đề thi trước, sau đó upload file Excel.</p>
                <input type="file" accept=".xlsx,.xls" onChange={(e) => setXlsxFile(e.target.files?.[0] ?? null)}
                  className="block w-full rounded-xl border-2 border-[color:var(--border)] bg-white px-3 py-2 text-sm text-zinc-700 shadow-[3px_3px_0_#1a1a1a] file:mr-3 file:rounded-lg file:border-2 file:border-[color:var(--border)] file:bg-[color:var(--accent-surface)] file:px-3 file:py-1.5 file:font-bold file:text-zinc-700"
                />
                <Button type="button" onClick={handleXlsxImport} disabled={!xlsxFile || saving}>
                  {saving ? "Đang xử lý..." : "Upload Excel & Tạo đề"}
                </Button>
              </div>
            </div>
          )}

          {/* Manual tab */}
          {tab === "manual" && (
            <div className="grid gap-4">
              <div className="flex justify-end">
                <Button type="button" onClick={addQuestion}>+ Thêm câu hỏi</Button>
              </div>
              {questions.map((q, index) => (
                <div key={q.id} className="brutal-card rounded-2xl p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-black text-zinc-900">Câu hỏi #{index + 1}</div>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" size="sm" disabled={index === 0} onClick={() => moveQuestion(index, -1)}>Lên</Button>
                      <Button type="button" variant="secondary" size="sm" disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)}>Xuống</Button>
                      <Button type="button" variant="danger" size="sm" disabled={questions.length === 1} onClick={() => removeQuestion(q.id)}>Xóa</Button>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <div className="grid gap-1.5 text-sm">
                      <span className="font-bold text-zinc-900">Nội dung câu hỏi</span>
                      <textarea
                        className="min-h-20 w-full rounded-xl border-2 border-[color:var(--border)] bg-white px-3 py-2 text-sm text-zinc-900 shadow-[3px_3px_0_#1a1a1a] outline-none transition focus:shadow-[1px_1px_0_#1a1a1a] focus:ring-2 focus:ring-[color:var(--primary)]/20"
                        value={q.content}
                        onChange={(e) => updateQuestion(q.id, (old) => ({ ...old, content: e.target.value }))}
                        placeholder="Nhập nội dung câu hỏi"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {OPTION_IDS.map((option) => (
                        <Input
                          key={option}
                          label={`Đáp án ${option}`}
                          value={q.options[option]}
                          onChange={(e) => updateQuestion(q.id, (old) => ({ ...old, options: { ...old.options, [option]: e.target.value } }))}
                        />
                      ))}
                    </div>
                    <label className="grid gap-1.5 text-sm">
                      <span className="font-bold text-zinc-900">Đáp án đúng</span>
                      <select
                        value={q.correct}
                        onChange={(e) => updateQuestion(q.id, (old) => ({ ...old, correct: e.target.value as OptionId }))}
                        className="h-11 rounded-xl border-2 border-[color:var(--border)] bg-white px-3 text-sm text-zinc-900 shadow-[3px_3px_0_#1a1a1a] outline-none focus:shadow-[1px_1px_0_#1a1a1a] focus:ring-2 focus:ring-[color:var(--primary)]/20 transition-all"
                      >
                        {OPTION_IDS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI tab */}
          {tab === "ai" && (
            <div className="grid gap-3">
              <p className="text-sm text-zinc-600">AI sẽ tạo câu hỏi và lưu thẳng vào đề thi. Vui lòng nhập tiêu đề và thời lượng trước.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Chủ đề" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="VD: Java OOP" />
                <Input label="Số câu" type="number" min={1} max={50} value={aiCount} onChange={(e) => setAiCount(e.target.value)} />
                <label className="grid gap-1.5 text-sm">
                  <span className="font-bold text-zinc-900">Độ khó</span>
                  <select
                    className="h-11 rounded-xl border-2 border-[color:var(--border)] bg-white px-3 text-sm text-zinc-900 shadow-[3px_3px_0_#1a1a1a] outline-none focus:ring-2 focus:ring-[color:var(--primary)]/20 transition-all"
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
              </div>
              <Button type="button" onClick={generateAiPreview} disabled={aiLoading}>
                {aiLoading ? "Đang tạo câu hỏi AI..." : "✦ Tạo câu hỏi với AI"}
              </Button>
            </div>
          )}
        </Card>

        {/* Save */}
        {tab !== "ai" && (
          <Card title="Hoàn tất" description="Lưu đề thi vào database">
            <div className="grid gap-3">
              <div className="text-sm text-zinc-600">
                Tổng câu hỏi: <span className="font-bold text-zinc-900">{questions.length}</span> • Đã có nội dung:{" "}
                <span className="font-bold text-zinc-900">{answeredCount}</span>
              </div>
              {saveError && <div className="rounded-xl border-2 border-red-500 bg-[#FFD6DD] px-3 py-2 text-sm font-semibold text-red-700">{saveError}</div>}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" onClick={handleSave} disabled={!canSave || saving}>
                  {saving ? "Đang lưu..." : "Lưu đề thi"}
                </Button>
                <ButtonLink href="/teacher/exams" variant="secondary">Quay lại danh sách</ButtonLink>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

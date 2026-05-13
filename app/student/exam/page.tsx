"use client";

import { Suspense, useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as faceapi from '@vladmandic/face-api';
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { mockExam, normalizeExamCode, serializeAnswers, type OptionId } from "../mock-exam";
import { addAttempt, addViolations, randomId, updateStudentProgress, type DemoViolation, type ViolationType } from "@/lib/demo-store";
import { calculateExamResult } from "../mock-exam";

const TOTAL_QUESTIONS = mockExam.questions.length;
const TOTAL_SECONDS = mockExam.durationMinutes * 60;

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function StudentExamRunnerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const queryCode = normalizeExamCode(searchParams.get("code") ?? "");
  const examCode = queryCode || "DEMO01";
  const hasProvidedCode = Boolean(queryCode);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(TOTAL_SECONDS);
  const [answers, setAnswers] = useState<Array<OptionId | null>>(() =>
    Array.from({ length: TOTAL_QUESTIONS }, () => null),
  );
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [violationCounts, setViolationCounts] = useState<Record<ViolationType, number>>({
    tab_switch: 0,
    keyboard_copy: 0,
    keyboard_paste: 0,
    camera_multiple_faces: 0,
    camera_gaze_away: 0,
    camera_missing: 0,
  });
  const [violationLog, setViolationLog] = useState<DemoViolation[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastCameraViolationTime = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeftSeconds((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const pushViolation = useCallback((type: ViolationType, description: string) => {
    const createdAt = new Date().toISOString();
    const attemptId = "pending";
    const item: DemoViolation = {
      id: randomId("vio"),
      attemptId,
      studentEmail: "student.demo@example.com",
      createdAt,
      type,
      description,
    };

    setViolationCounts((prev) => ({ ...prev, [type]: (prev[type] ?? 0) + 1 }));
    setViolationLog((prev) => [item, ...prev].slice(0, 50));

    const titleMap: Record<ViolationType, string> = {
      tab_switch: "Cảnh báo: Chuyển tab",
      keyboard_copy: "Cảnh báo: Copy",
      keyboard_paste: "Cảnh báo: Paste",
      camera_multiple_faces: "Cảnh báo: Nhiều khuôn mặt",
      camera_gaze_away: "Cảnh báo: Nhìn ra ngoài",
      camera_missing: "Cảnh báo: Thiếu camera",
    };

    setWarningMessage(description);
    toast.push({ title: titleMap[type], message: description, variant: "danger" });
    window.setTimeout(() => setWarningMessage(null), 4500);
  }, [toast]);

  // AI Camera Init
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
      } catch (err: any) {
        console.error("Failed to load AI models", err);
        setCameraError(`Lỗi tải AI: ${err.message || err}`);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!modelsLoaded) return;
    let stream: MediaStream | null = null;
    const startVideo = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setCameraError("Không thể truy cập camera. Vui lòng cấp quyền.");
        pushViolation("camera_missing", "Người dùng từ chối quyền truy cập camera.");
      }
    };
    startVideo();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [modelsLoaded, pushViolation]);

  useEffect(() => {
    if (!modelsLoaded || cameraError) return;
    
    const interval = window.setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160 })
        ).withFaceLandmarks();

        const now = Date.now();
        if (now - lastCameraViolationTime.current > 5000) {
          if (detections.length === 0) {
            pushViolation("camera_missing", "Không tìm thấy khuôn mặt trong khung hình.");
            lastCameraViolationTime.current = now;
          } else if (detections.length > 1) {
            pushViolation("camera_multiple_faces", `Phát hiện ${detections.length} khuôn mặt.`);
            lastCameraViolationTime.current = now;
          }
        }
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [modelsLoaded, cameraError, pushViolation]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        pushViolation("tab_switch", "Bạn vừa rời khỏi tab làm bài.");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushViolation]);

  // Anti-cheat: block copy/paste
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        pushViolation("keyboard_copy", "Hành vi copy (Ctrl+C) đã bị chặn và ghi nhận.");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        pushViolation("keyboard_paste", "Hành vi paste (Ctrl+V) đã bị chặn và ghi nhận.");
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushViolation]);

  // Anti-cheat: block right-click
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);


  const currentQuestion = mockExam.questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestionIndex];
  const answeredCount = answers.filter(Boolean).length;
  const isTimeUp = timeLeftSeconds === 0;
  const timerLabel = useMemo(() => formatTime(timeLeftSeconds), [timeLeftSeconds]);

  const optionEntries = Object.entries(currentQuestion.options) as Array<[OptionId, string]>;

  const handleSelectOption = (option: OptionId) => {
    if (isTimeUp) {
      return;
    }

    setAnswers((previous) => {
      const next = [...previous];
      next[currentQuestionIndex] = option;
      return next;
    });
  };

  // Broadcast live progress to localStorage (teacher room view polls this)
  useEffect(() => {
    const correctSoFar = answers.reduce((count, ans, idx) => {
      if (ans && ans === mockExam.questions[idx].answer) return count + 1;
      return count;
    }, 0);
    const totalViolationCount = Object.values(violationCounts).reduce((a, b) => a + b, 0);

    updateStudentProgress({
      studentEmail: "student.demo@example.com",
      roomPin: examCode,
      currentQuestion: currentQuestionIndex + 1,
      totalQuestions: TOTAL_QUESTIONS,
      answeredCount,
      correctCount: correctSoFar,
      violationCount: totalViolationCount,
      updatedAt: new Date().toISOString(),
    });
  }, [answers, currentQuestionIndex, answeredCount, violationCounts, examCode]);

  const handleSubmit = () => {
    const attemptId = randomId("att");
    const serializedAnswers = serializeAnswers(answers);
    const computed = calculateExamResult(mockExam, answers);

    const startedAt = new Date(Date.now() - Math.max(0, TOTAL_SECONDS - timeLeftSeconds) * 1000).toISOString();
    const submittedAt = new Date().toISOString();

    addAttempt({
      id: attemptId,
      examCode,
      examTitle: mockExam.title,
      studentEmail: "student.demo@example.com",
      startedAt,
      submittedAt,
      status: "completed",
      score: computed.score,
      totalCorrect: computed.correctCount,
      totalQuestions: computed.totalQuestions,
      violationCount: Object.values(violationCounts).reduce((a, b) => a + b, 0),
    });

    if (violationLog.length > 0) {
      addViolations(
        violationLog.map((v) => ({
          ...v,
          attemptId,
          studentEmail: "student.demo@example.com",
        })),
      );
    }

    router.push(`/student/result?code=${encodeURIComponent(examCode)}&answers=${serializedAnswers}`);
  };

  return (
    <AppShell
      title="Student Dashboard"
      subtitle="Đang làm bài"
      nav={[
        { href: "/student", label: "Tổng quan" },
        { href: "/student/join", label: "Nhập mã phòng thi", badge: "code" },
        { href: "/student/history", label: "Lịch sử bài thi" },
      ]}
    >
      <div className="page-stack">
        <div className="section-head flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">{mockExam.title}</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Mã phòng thi: <span className="font-bold">{examCode}</span> • {TOTAL_QUESTIONS} câu hỏi
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isTimeUp ? "danger" : timeLeftSeconds <= 300 ? "warning" : "success"}>
              Còn lại {timerLabel}
            </Badge>
            <Badge variant="default">
              Đã trả lời {answeredCount}/{TOTAL_QUESTIONS}
            </Badge>
          </div>
        </div>

        {!hasProvidedCode ? (
          <div className="rounded-2xl border-2 border-amber-500 bg-[#FFF3CD] px-4 py-3 text-sm font-semibold text-amber-900 shadow-[3px_3px_0_#1a1a1a]">
            Bạn vào trang thi mà chưa có mã từ trang Join. Hệ thống đang dùng mã demo <span className="font-bold">DEMO01</span>.
          </div>
        ) : null}

        {warningMessage ? (
          <div className="rounded-2xl border-2 border-red-500 bg-[#FFD6DD] px-4 py-3 text-sm font-bold text-red-900 shadow-[3px_3px_0_#1a1a1a]">
            {warningMessage}
          </div>
        ) : null}

        {isTimeUp ? (
          <div className="rounded-2xl border-2 border-red-500 bg-[#FFD6DD] px-4 py-3 text-sm font-bold text-red-800 shadow-[3px_3px_0_#1a1a1a]">
            Đã hết thời gian làm bài. Bạn không thể đổi đáp án nữa, vui lòng nộp bài.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <Card
            title={`Câu ${currentQuestionIndex + 1}/${TOTAL_QUESTIONS}`}
            description={currentAnswer ? `Đã chọn đáp án ${currentAnswer}` : "Chưa chọn đáp án"}
            right={<Badge variant={currentAnswer ? "success" : "warning"}>{currentAnswer ? "Đã trả lời" : "Chưa trả lời"}</Badge>}
          >
            <div className="grid gap-4">
              <div className="text-sm font-bold text-zinc-900">{currentQuestion.content}</div>

              <div className="grid gap-2">
                {optionEntries.map(([option, content]) => {
                  const isSelected = currentAnswer === option;

                  return (
                    <label
                      key={option}
                      className={[
                        "flex items-center gap-3 rounded-xl border-2 border-[color:var(--border)] px-4 py-3 text-sm transition-all",
                        isTimeUp ? "cursor-not-allowed opacity-85" : "cursor-pointer",
                        isSelected
                          ? "bg-[color:var(--surface-mint)] shadow-[2px_2px_0_#1a1a1a]"
                          : "bg-white shadow-[3px_3px_0_#1a1a1a] hover:shadow-[5px_5px_0_#1a1a1a]",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        checked={isSelected}
                        onChange={() => handleSelectOption(option)}
                        disabled={isTimeUp}
                      />
                      <span className="grid h-7 w-7 place-items-center rounded-lg border-2 border-[color:var(--border)] bg-[color:var(--surface-warm)] font-bold text-zinc-900 shadow-[2px_2px_0_#1a1a1a]">
                        {option}
                      </span>
                      <span className="text-zinc-700">{content}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="secondary"
                  className="justify-center"
                  onClick={() => setCurrentQuestionIndex((previous) => Math.max(0, previous - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  Trước
                </Button>
                <Button
                  variant="secondary"
                  className="justify-center"
                  onClick={() =>
                    setCurrentQuestionIndex((previous) => Math.min(TOTAL_QUESTIONS - 1, previous + 1))
                  }
                  disabled={currentQuestionIndex === TOTAL_QUESTIONS - 1}
                >
                  Sau
                </Button>
                <Button className="justify-center sm:ml-auto" onClick={handleSubmit}>
                  Nộp bài
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Điều hướng câu hỏi" description="Chọn nhanh câu cần làm">
            <div className="grid gap-4">
              <div className="hidden grid-cols-5 gap-2 lg:grid">
                {mockExam.questions.map((question, index) => {
                  const answered = Boolean(answers[index]);
                  const active = index === currentQuestionIndex;

                  return (
                    <button
                      key={question.id}
                      type="button"
                      className={[
                        "h-10 rounded-lg border-2 border-[color:var(--border)] text-sm font-bold transition-all",
                        active
                          ? "bg-[color:var(--primary)] text-white shadow-[2px_2px_0_#1a1a1a]"
                          : answered
                            ? "bg-[color:var(--surface-mint)] text-emerald-700 shadow-[3px_3px_0_#1a1a1a]"
                            : "bg-white text-zinc-700 shadow-[3px_3px_0_#1a1a1a] hover:shadow-[5px_5px_0_#1a1a1a]",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setCurrentQuestionIndex(index)}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-warm)] p-3 text-xs font-semibold text-zinc-600 shadow-[2px_2px_0_#1a1a1a]">
                Câu hiện tại: <span className="font-bold">{currentQuestionIndex + 1}</span> • Trạng thái:{" "}
                <span className="font-bold">{currentAnswer ? "Đã trả lời" : "Chưa trả lời"}</span>
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-bold text-zinc-700">Camera AI</div>
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 border-2 border-[color:var(--border)] shadow-[3px_3px_0_#1a1a1a]">
                  <video 
                    ref={videoRef}
                    autoPlay 
                    muted 
                    playsInline 
                    className="h-full w-full object-cover scale-x-[-1]"
                  />
                  {!modelsLoaded && (
                    <div className="absolute inset-0 grid place-items-center bg-black/60 text-xs font-bold text-white px-2 text-center leading-relaxed">
                      Đang khởi tạo AI...
                    </div>
                  )}
                  {cameraError && (
                    <div className="absolute inset-0 grid place-items-center bg-red-900/90 p-3 text-center text-xs font-bold text-white leading-relaxed">
                      {cameraError}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-bold text-zinc-700">Anti-cheat panel</div>
                <div className="grid gap-2 text-sm text-zinc-700">
                  <div className="flex items-center justify-between">
                    <span>Tab switch</span>
                    <Badge variant={violationCounts.tab_switch ? "warning" : "default"}>{violationCounts.tab_switch}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Copy</span>
                    <Badge variant={violationCounts.keyboard_copy ? "warning" : "default"}>{violationCounts.keyboard_copy}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Paste</span>
                    <Badge variant={violationCounts.keyboard_paste ? "warning" : "default"}>{violationCounts.keyboard_paste}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Camera</span>
                    <Badge
                      variant={
                        violationCounts.camera_multiple_faces ||
                        violationCounts.camera_gaze_away ||
                        violationCounts.camera_missing
                          ? "warning"
                          : "default"
                      }
                    >
                      {violationCounts.camera_multiple_faces +
                        violationCounts.camera_gaze_away +
                        violationCounts.camera_missing}
                    </Badge>
                  </div>
                </div>
              </div>

              <Card title="Demo controls" description="Bấm để mô phỏng vi phạm">
                <div className="grid gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => pushViolation("tab_switch", "Bạn vừa rời khỏi tab làm bài.")}
                  >
                    Simulate tab switch
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => pushViolation("keyboard_copy", "Hành vi copy đã bị ghi nhận.")}
                    >
                      Simulate copy
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => pushViolation("keyboard_paste", "Hành vi paste đã bị ghi nhận.")}
                    >
                      Simulate paste
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => pushViolation("camera_multiple_faces", "Phát hiện nhiều khuôn mặt trong khung hình.")}
                  >
                    Simulate multiple faces
                  </Button>
                </div>
              </Card>

              <ButtonLink href="/student/join" variant="ghost" className="justify-center">
                Đổi mã phòng thi
              </ButtonLink>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

export default function StudentExamRunnerPage() {
  return (
    <Suspense>
      <StudentExamRunnerContent />
    </Suspense>
  );
}

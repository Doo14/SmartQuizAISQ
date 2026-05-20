"use client";

import { Suspense, useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { getExamDetail, getRoomPublicInfo, type Question } from "@/lib/api";
import {
  connectSocket,
  disconnectSocket,
  roomIdentification,
  toBackendViolationType,
  type Socket,
} from "@/lib/socket";

// face-api must be loaded dynamically (browser-only, needs TextEncoder)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FaceApiModule = typeof import('@vladmandic/face-api');

type OptionId = "A" | "B" | "C" | "D";
type ViolationType = "tab_switch" | "keyboard_copy" | "keyboard_paste" | "camera_multiple_faces" | "camera_gaze_away" | "camera_missing";

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function StudentExamRunnerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push: toastPush } = useToast();
  const toast = useMemo(() => ({ push: toastPush }), [toastPush]);
  const { user, loading: authLoading } = useAuth();

  const roomId = Number(searchParams.get("roomId") ?? "0");
  const examCode = searchParams.get("code") ?? "";

  // Exam data from API
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examTitle, setExamTitle] = useState("Đang tải...");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [examId, setExamId] = useState<number | null>(null);
  const [loadingExam, setLoadingExam] = useState(true);
  const [attemptId, setAttemptId] = useState<number | null>(null);

  // Socket — ref tránh stale closure (room_time_up đăng ký trước khi có examId).
  const socketRef = useRef<Socket | null>(null);
  const handleAutoSubmitRef = useRef<() => void>(() => {});
  // B5 FIX: track examId in a ref so handleAutoSubmit always reads the latest value
  const examIdRef = useRef<number | null>(null);

  // Keep examIdRef in sync for closures that fire before React re-renders (e.g. auto-submit)
  useEffect(() => { examIdRef.current = examId; }, [examId]);

  /** Đang làm bài thật (đã có câu hỏi) — dùng cho force_submit / room_ended, tránh emit khi chờ GV. */
  const canAutoSubmitRef = useRef(false);
  // face-api loaded dynamically (browser only)
  const faceapiRef = useRef<FaceApiModule | null>(null);

  // Exam state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>([]); // optionId (number)
  const [submitted, setSubmitted] = useState(false);
  const submittingRef = useRef(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [violationCounts, setViolationCounts] = useState<Record<ViolationType, number>>({
    tab_switch: 0, keyboard_copy: 0, keyboard_paste: 0,
    camera_multiple_faces: 0, camera_gaze_away: 0, camera_missing: 0,
  });

  // Camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const hasSentCameraMissingRef = useRef(false);
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && cameraStreamRef.current) {
      node.srcObject = cameraStreamRef.current;
    }
  }, []);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraRetryCount, setCameraRetryCount] = useState(0);
  const lastCameraViolationTime = useRef(0);

  // Result state (shown after submit)
  const [result, setResult] = useState<{ correctCount: number; total: number; score: number } | null>(null);
  // Waiting for teacher to start the room
  const [waitingForStart, setWaitingForStart] = useState(false);

  /** Chỉ giám sát khi đang làm bài — không tính vi phạm lúc chờ GV hoặc đang tải đề. */
  const antiCheatActive = useMemo(
    () => !waitingForStart && !submitted && questions.length > 0,
    [waitingForStart, submitted, questions.length],
  );

  const cameraActive = useMemo(
    () => !submitted && !loadingExam,
    [submitted, loadingExam],
  );

  useEffect(() => {
    canAutoSubmitRef.current =
      !waitingForStart && !submitted && questions.length > 0 && !loadingExam;
  }, [waitingForStart, submitted, questions.length, loadingExam]);

  /* ── Auth guard ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "student") { router.push("/teacher"); return; }
  }, [user, authLoading, router]);

  /* ── Join socket & get room info ────────────────────────────────── */
  useEffect(() => {
    if (!roomId || authLoading || !user) return;

    const s = connectSocket();
    socketRef.current = s;

    if (examCode.length !== 8) {
      toast.push({
        title: "Mã PIN không hợp lệ",
        message: "Mã phòng thi phải đúng 8 ký tự.",
        variant: "danger",
      });
      setLoadingExam(false);
      return;
    }

    s.emit("join", roomIdentification(examCode), (res: any) => {
      console.log("[Student WS] join:", res);
      if (res?.error) {
        toast.push({ title: "Không thể vào phòng thi", message: res.error, variant: "danger" });
        setLoadingExam(false);
        return;
      }
      if (res?.attemptId) {
        setAttemptId(res.attemptId);
      }
      if (res?.status === "WAITING") {
        setWaitingForStart(true);
        setLoadingExam(false);
      } else if (res?.status === "ACTIVE") {
        setWaitingForStart(false);
        let secsLeft: number | undefined;
        if (res.endTime) {
          const now = Date.now();
          const end = new Date(res.endTime).getTime();
          secsLeft = Math.max(0, Math.floor((end - now) / 1000));
        }

        // B4 FIX: try sessionStorage first, then fall back to API lookup by code
        const storedExamId = sessionStorage.getItem(`room_${roomId}_examId`);
        if (storedExamId) {
          const eid = Number(storedExamId);
          setExamId(eid);
          loadExam(eid, res.previousAnswers, secsLeft);
        } else {
          // Student navigated directly (e.g. page refresh) — resolve examId via public API
          getRoomPublicInfo(examCode).then((info) => {
            if (info?.examId) {
              sessionStorage.setItem(`room_${roomId}_examId`, String(info.examId));
              setExamId(info.examId);
              loadExam(info.examId, res.previousAnswers, secsLeft);
            } else {
              toast.push({ title: "Lỗi tải đề thi", message: "Không tìm thấy thông tin phòng.", variant: "danger" });
              setLoadingExam(false);
            }
          }).catch(() => {
            toast.push({ title: "Lỗi tải đề thi", variant: "danger" });
            setLoadingExam(false);
          });
        }
      }
    });

    // Teacher started the exam — room is now ACTIVE
    s.on("room_start", (payload: { durationMinutes: number; endTime: string }) => {
      setWaitingForStart(false);
      const now = Date.now();
      const end = new Date(payload.endTime).getTime();
      const secsLeft = Math.max(0, Math.floor((end - now) / 1000));

      const storedExamId = sessionStorage.getItem(`room_${roomId}_examId`);
      if (storedExamId) {
        const eid = Number(storedExamId);
        setExamId(eid);
        loadExam(eid, undefined, secsLeft);
      } else {
        // B4 FIX: fall back to API if sessionStorage was cleared
        getRoomPublicInfo(examCode).then((info) => {
          if (info?.examId) {
            sessionStorage.setItem(`room_${roomId}_examId`, String(info.examId));
            setExamId(info.examId);
            loadExam(info.examId, undefined, secsLeft);
          }
        }).catch(() => {
          toast.push({ title: "Lỗi tải đề thi", variant: "danger" });
        });
      }
    });

    s.on("room_time_up", () => {
      toast.push({ title: "Hết giờ!", message: "Bài thi đã được nộp tự động.", variant: "warning" });
      handleAutoSubmitRef.current();
    });

    const onServerFinalize = () => {
      if (!canAutoSubmitRef.current) return;
      handleAutoSubmitRef.current();
    };
    s.on("force_submit", onServerFinalize);
    s.on("room_ended", onServerFinalize);

    return () => {
      s.off("room_start");
      s.off("room_time_up");
      s.off("force_submit", onServerFinalize);
      s.off("room_ended", onServerFinalize);
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, examCode, user, authLoading]);


  const loadExam = async (eid: number, prevAnswers?: { questionId: number, selectedOptionId: number }[], initialSecsLeft?: number) => {
    try {
      const detail = await getExamDetail(eid);
      setQuestions(detail.questions);
      setExamTitle(detail.title);
      setDurationMinutes(detail.durationMinutes);
      
      if (initialSecsLeft !== undefined) {
        setTimeLeftSeconds(initialSecsLeft);
      } else {
        setTimeLeftSeconds(detail.durationMinutes * 60);
      }

      const initialAnswers = Array(detail.questions.length).fill(null);
      if (prevAnswers && prevAnswers.length > 0) {
        detail.questions.forEach((q, idx) => {
          const pa = prevAnswers.find((a: any) => a.questionId === q.id);
          if (pa) {
            initialAnswers[idx] = pa.selectedOptionId;
          }
        });
      }
      setAnswers(initialAnswers);
    } catch {
      toast.push({ title: "Lỗi tải đề thi", variant: "danger" });
    } finally {
      setLoadingExam(false);
    }
  };

  /* ── Timer ────────────────────────────────────────────────────────────── */
  // B11 FIX: Use a ref for the timer ID to avoid multiple concurrent intervals.
  // The old dependency [timeLeftSeconds > 0, submitted] was a boolean expression
  // that only triggered on 0↔positive transition, causing duplicate timers on re-renders.
  const timerRef = useRef<any>(null);

  useEffect(() => {
    // Always clear any existing timer before (re-)starting
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (timeLeftSeconds <= 0 || submitted) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleAutoSubmitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftSeconds > 0 && !submitted]);

  /* ── Violation reporting ─────────────────────────────────────────── */
  const pushViolation = useCallback((type: ViolationType, description: string) => {
    setViolationCounts((prev) => ({ ...prev, [type]: (prev[type] ?? 0) + 1 }));
    setWarningMessage(description);

    const titleMap: Record<ViolationType, string> = {
      tab_switch: "Cảnh báo: Chuyển tab",
      keyboard_copy: "Cảnh báo: Copy",
      keyboard_paste: "Cảnh báo: Paste",
      camera_multiple_faces: "Cảnh báo: Nhiều khuôn mặt",
      camera_gaze_away: "Cảnh báo: Nhìn ra ngoài",
      camera_missing: "Cảnh báo: Thiếu camera",
    };
    toast.push({ title: titleMap[type], message: description, variant: "danger" });
    window.setTimeout(() => setWarningMessage(null), 4500);

    if (socketRef.current && roomId && attemptId) {
      socketRef.current.emit("violation", {
        roomId,
        attemptId,
        type: toBackendViolationType(type),
      });
    }
  }, [toast, roomId, attemptId]);

  // BUG FIX: Stable ref for pushViolation to avoid re-triggering camera
  // useEffect every time attemptId/toast changes (which recreates pushViolation).
  const pushViolationRef = useRef(pushViolation);
  useEffect(() => { pushViolationRef.current = pushViolation; }, [pushViolation]);

  /* ── Anti-cheat: camera (chỉ khi đang làm bài) ───────────────────── */
  useEffect(() => {
    if (!cameraActive) return;
    const loadModels = async () => {
      try {
        // Dynamic import to avoid SSR TextEncoder issue
        const fa = await import('@vladmandic/face-api');
        faceapiRef.current = fa;
        await Promise.all([
          fa.nets.tinyFaceDetector.loadFromUri('/models'),
          fa.nets.faceLandmark68Net.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
      } catch (err: any) {
        console.error("Failed to load AI models", err);
        setCameraError(`Lỗi tải AI: ${err.message || err}`);
      }
    };
    void loadModels();
  }, [cameraActive]);

  useEffect(() => {
    if (!cameraActive) return;
    let stream: MediaStream | null = null;
    const startVideo = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        cameraStreamRef.current = stream;
        hasSentCameraMissingRef.current = false;
        if (videoRef.current) videoRef.current.srcObject = stream;
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            setCameraError("Camera đã bị ngắt kết nối hoặc tắt.");
            if (!hasSentCameraMissingRef.current) {
              hasSentCameraMissingRef.current = true;
              pushViolationRef.current("camera_missing", "Camera bị tắt trong quá trình làm bài.");
            }
          };
        }
        setCameraError(null);
      } catch (err: any) {
        setCameraError(err.message || "Không thể truy cập camera. Vui lòng cấp quyền.");
        if (!hasSentCameraMissingRef.current) {
          hasSentCameraMissingRef.current = true;
          pushViolationRef.current("camera_missing", "Người dùng từ chối quyền truy cập camera.");
        }
      }
    };
    void startVideo();
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      cameraStreamRef.current = null;
    };
    // BUG FIX: removed pushViolation from deps — use pushViolationRef instead
    // to prevent re-running this effect (and re-calling getUserMedia) when
    // attemptId changes, which was causing duplicate violation reports.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive, cameraRetryCount]);

  useEffect(() => {
    if (!antiCheatActive || !modelsLoaded || cameraError) return;
    const fa = faceapiRef.current;
    if (!fa) return;
    const interval = window.setInterval(async () => {
      if (videoRef.current?.readyState === 4) {
        const detections = await fa
          .detectAllFaces(videoRef.current, new fa.TinyFaceDetectorOptions({ inputSize: 160 }))
          .withFaceLandmarks();
        const now = Date.now();
        // BUG FIX: increase throttle from 5s to 30s to prevent flooding server
        // with violations when camera is intermittent or face detection is flaky.
        if (now - lastCameraViolationTime.current > 30000) {
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
    return () => clearInterval(interval);
  }, [antiCheatActive, modelsLoaded, cameraError, pushViolation]);

  /* ── Anti-cheat: tab / keyboard / context (chỉ khi đang làm bài) ─── */
  useEffect(() => {
    if (!antiCheatActive) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden")
        pushViolation("tab_switch", "Bạn vừa rời khỏi tab làm bài.");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [antiCheatActive, pushViolation]);

  useEffect(() => {
    if (!antiCheatActive) return;
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
  }, [antiCheatActive, pushViolation]);

  useEffect(() => {
    if (!antiCheatActive) return;
    const onCtxMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", onCtxMenu);
    return () => document.removeEventListener("contextmenu", onCtxMenu);
  }, [antiCheatActive]);

  /* ── Select answer ──────────────────────────────────────────────── */
  const handleSelectOption = (optionId: number) => {
    if (submitted) return;
    const q = questions[currentQuestionIndex];
    if (!q) return;

    setAnswers((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = optionId;
      return next;
    });

    if (socketRef.current && roomId && examId) {
      socketRef.current.emit("answer", {
        roomId,
        examId,
        questionId: q.id,
        optionId,
      });
    }
  };

  /* ── Submit ─────────────────────────────────────────────────────── */
  const handleAutoSubmit = useCallback(() => {
    if (submitted || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitted(true);

    const currentExamId = examIdRef.current; // B5 FIX: read latest examId via ref
    const currentSocket = socketRef.current;

    if (currentSocket && roomId && currentExamId) {
      currentSocket.emit("submit", { roomId, examId: currentExamId }, (res: any) => {
        console.log("[Student WS] submit callback:", res);
        if (res?.error) {
          toast.push({
            title: "Lỗi nộp bài",
            message: String(res.error),
            variant: "danger",
          });
          setSubmitted(false);
          submittingRef.current = false;
          return;
        }
        const correctCount = res?.correctCount ?? 0;
        const total = res?.totalQuestions ?? questions.length;
        const score = total > 0 ? parseFloat(((correctCount / total) * 10).toFixed(1)) : 0;
        setResult({ correctCount, total, score });
      });
    } else {
      // B5 FIX: examId is null (e.g. page refreshed before exam loaded).
      // Server already force-submitted — show a submitted screen rather than blocking.
      setResult({ correctCount: 0, total: questions.length, score: 0 });
    }
  }, [submitted, roomId, questions.length, toast]);

  useEffect(() => {
    handleAutoSubmitRef.current = handleAutoSubmit;
  }, [handleAutoSubmit]);

  const handleSubmit = () => {
    const answeredCount = answers.filter((a) => a !== null).length;
    const unansweredCount = questions.length - answeredCount;
    if (unansweredCount > 0) {
      const confirmed = window.confirm(
        `Bạn còn ${unansweredCount} câu chưa trả lời. Xác nhận nộp bài?`,
      );
      if (!confirmed) return;
    }
    handleAutoSubmit();
  };

  /* ── Derived ─────────────────────────────────────────────────────── */
  const answeredCount = useMemo(() => answers.filter((a) => a !== null).length, [answers]);
  const currentQuestion = questions[currentQuestionIndex];
  const OPTION_LABELS: OptionId[] = ["A", "B", "C", "D"];

  const totalViolations = Object.values(violationCounts).reduce((a, b) => a + b, 0);

  /* ── Camera check blocking screen ───────────────────────────────── */
  if (cameraError) {
    return (
      <AppShell title="Student Dashboard" subtitle="Yêu cầu kết nối Camera" nav={[]}>
        <div className="flex flex-col items-center justify-center gap-6 py-20 max-w-md mx-auto text-center">
          <div className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-[color:var(--border)] bg-[#FFD6DD] text-4xl shadow-[6px_6px_0_#1a1a1a]">
            📷
          </div>
          <div>
            <h2 className="text-2xl font-black text-red-600">Yêu cầu quyền truy cập Camera</h2>
            <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
              Hệ thống giám sát thi cử yêu cầu kết nối camera hoạt động để xác minh danh tính và chống gian lận. Bạn không thể làm bài nếu không bật camera.
            </p>
            <p className="mt-2 text-xs font-bold text-red-500 bg-[#FFD6DD] border-2 border-red-300 rounded-xl p-2.5">
              Chi tiết lỗi: {cameraError}
            </p>
          </div>
          <button
            onClick={() => {
              setCameraError(null);
              setCameraRetryCount((prev) => prev + 1);
            }}
            className="w-full rounded-2xl border-2 border-[color:var(--border)] bg-[color:var(--primary)] px-6 py-3 text-sm font-bold text-white shadow-[4px_4px_0_#1a1a1a] transition hover:shadow-[6px_6px_0_#1a1a1a] active:translate-y-0.5"
          >
            Thử lại
          </button>
        </div>
      </AppShell>
    );
  }

  /* ── Waiting for teacher to start ───────────────────────────────── */
  if (waitingForStart) {
    return (
      <AppShell title="Student Dashboard" subtitle="Chờ phòng thi bắt đầu" nav={[]}>
        <div className="flex flex-col items-center justify-center gap-6 py-20">
          <div className="grid h-20 w-20 animate-pulse place-items-center rounded-2xl border-4 border-[color:var(--border)] bg-[color:var(--surface-mint)] text-4xl shadow-[6px_6px_0_#1a1a1a]">
            ⏳
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-zinc-900">Chờ giáo viên bắt đầu</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Bạn đã vào phòng thi thành công. Bài thi sẽ bắt đầu khi giáo viên bấm{" "}
              <span className="font-bold text-zinc-700">"Bắt đầu thi"</span>.
            </p>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-3 w-3 animate-bounce rounded-full border-2 border-[color:var(--border)] bg-[color:var(--primary)]"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── Loading exam ─────────────────────────────────────────────────── */
  if (loadingExam || !questions.length) {
    return (
      <AppShell title="Student Dashboard" subtitle="Đang tải đề thi..." nav={[]}>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="text-lg font-bold text-zinc-700">Đang tải đề thi...</div>
          <p className="text-sm text-zinc-500">Vui lòng chờ trong giây lát.</p>
        </div>
      </AppShell>
    );
  }

  /* ── Result screen ───────────────────────────────────────────────── */
  if (submitted && result) {
    return (
      <AppShell title="Student Dashboard" subtitle="Kết quả bài thi" nav={[]}>
        <div className="page-stack">
          <div className="section-head text-center">
            <h1 className="text-3xl font-black text-zinc-900">🎉 Nộp bài thành công!</h1>
            <p className="mt-2 text-zinc-600">{examTitle}</p>
          </div>
          <div className="bento-grid">
            <Card title="Điểm" description="Thang điểm 10" shadow="green">
              <div className="text-4xl font-black text-zinc-900">{result.score.toFixed(1)}</div>
            </Card>
            <Card title="Câu đúng" shadow="orange">
              <div className="text-4xl font-black text-zinc-900">{result.correctCount}/{result.total}</div>
            </Card>
            <Card title="Vi phạm" shadow="red">
              <div className="text-4xl font-black text-zinc-900">{totalViolations}</div>
            </Card>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => router.push("/student")}
              className="rounded-2xl border-2 border-[color:var(--border)] bg-white px-5 py-2.5 text-sm font-bold text-zinc-900 shadow-[4px_4px_0_#1a1a1a] transition hover:shadow-[6px_6px_0_#1a1a1a]"
            >
              Về dashboard
            </button>
            <button
              onClick={() => router.push("/student/history")}
              className="rounded-2xl border-2 border-[color:var(--border)] bg-[color:var(--primary)] px-5 py-2.5 text-sm font-bold text-white shadow-[4px_4px_0_#1a1a1a] transition hover:shadow-[6px_6px_0_#1a1a1a]"
            >
              Xem lịch sử
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (submitted) {
    return (
      <AppShell title="Student Dashboard" subtitle="Kết quả bài thi" nav={[]}>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="text-lg font-bold text-zinc-700">Đang xử lý kết quả...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Student Dashboard" subtitle={examTitle} nav={[]}>
      <div className="grid gap-4">
        {/* Warning banner */}
        {warningMessage && (
          <div className="rounded-2xl border-4 border-red-500 bg-[#FFD6DD] px-4 py-3 text-sm font-bold text-red-800 shadow-[5px_5px_0_#991B1B]">
            ⚠️ {warningMessage}
          </div>
        )}

        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={timeLeftSeconds < 120 ? "danger" : timeLeftSeconds < 300 ? "warning" : "success"}>
              ⏱ {formatTime(timeLeftSeconds)}
            </Badge>
            <Badge>
              {answeredCount}/{questions.length} đã trả lời
            </Badge>
            {totalViolations > 0 && (
              <Badge variant="danger">{totalViolations} vi phạm</Badge>
            )}
          </div>
          <Button onClick={handleSubmit} variant="danger">Nộp bài</Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* Question navigator */}
          <div className="grid gap-3">
            {/* Camera */}
            <Card title="Camera giám sát">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-[color:var(--border)] bg-zinc-900">
                <video ref={setVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 p-3 text-center text-xs text-red-400">
                    {cameraError}
                  </div>
                )}
                {!modelsLoaded && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60 text-xs text-white">
                    Đang tải AI...
                  </div>
                )}
              </div>
            </Card>

            {/* Navigator grid */}
            <Card title="Điều hướng câu hỏi">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, idx) => {
                  const isAnswered = answers[idx] !== null;
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={[
                        "grid h-9 w-9 place-items-center rounded-lg border-2 border-[color:var(--border)] text-xs font-bold transition-all",
                        isCurrent
                          ? "bg-[color:var(--primary)] text-white shadow-[3px_3px_0_#1a1a1a]"
                          : isAnswered
                            ? "bg-[color:var(--surface-mint)] text-emerald-700 shadow-[2px_2px_0_#166534]"
                            : "bg-white text-zinc-600 shadow-[2px_2px_0_#1a1a1a] hover:shadow-[3px_3px_0_#1a1a1a]",
                      ].join(" ")}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Question panel */}
          {currentQuestion && (
            <Card
              title={`Câu ${currentQuestionIndex + 1} / ${questions.length}`}
              shadow="green"
            >
              <div className="grid gap-4">
                <div className="rounded-xl bg-[color:var(--surface-warm)] px-4 py-3 text-sm font-bold text-zinc-900 leading-relaxed border-2 border-[color:var(--border)]">
                  {currentQuestion.content}
                </div>

                <div className="grid gap-3">
                  {currentQuestion.options.map((opt, idx) => {
                    const label = OPTION_LABELS[idx];
                    const isSelected = answers[currentQuestionIndex] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(opt.id)}
                        className={[
                          "flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all",
                          isSelected
                            ? "border-[color:var(--primary)] bg-[color:var(--primary-surface)] text-emerald-800 shadow-[4px_4px_0_#166534]"
                            : "border-[color:var(--border)] bg-white text-zinc-700 shadow-[3px_3px_0_#1a1a1a] hover:shadow-[5px_5px_0_#1a1a1a]",
                        ].join(" ")}
                      >
                        <span className={[
                          "grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-[color:var(--border)] text-xs font-black",
                          isSelected
                            ? "bg-[color:var(--primary)] text-white"
                            : "bg-[color:var(--surface-warm)] text-zinc-800",
                        ].join(" ")}>
                          {label}
                        </span>
                        <span>{opt.content}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    ← Trước
                  </Button>
                  {currentQuestionIndex < questions.length - 1 ? (
                    <Button onClick={() => setCurrentQuestionIndex((i) => i + 1)}>
                      Tiếp theo →
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} variant="danger">
                      Nộp bài
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function StudentExamPage() {
  return (
    <Suspense>
      <StudentExamRunnerContent />
    </Suspense>
  );
}

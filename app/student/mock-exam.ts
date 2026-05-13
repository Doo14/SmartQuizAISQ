export type OptionId = "A" | "B" | "C" | "D";

export type ExamQuestion = {
  id: number;
  content: string;
  options: Record<OptionId, string>;
  answer: OptionId;
};

export type MockExam = {
  title: string;
  durationMinutes: number;
  questions: ExamQuestion[];
};

export const mockExam: MockExam = {
  title: "Frontend Fundamentals Mock Test",
  durationMinutes: 15,
  questions: [
    {
      id: 1,
      content: "HTML viết tắt của cụm từ nào?",
      options: {
        A: "Hyper Text Markup Language",
        B: "High Transfer Machine Language",
        C: "Home Tool Markup Library",
        D: "Hyperlink and Text Management Language",
      },
      answer: "A",
    },
    {
      id: 2,
      content: "Thẻ nào được dùng để liên kết file CSS ngoài?",
      options: {
        A: "<script>",
        B: "<link>",
        C: "<style>",
        D: "<css>",
      },
      answer: "B",
    },
    {
      id: 3,
      content: "Trong JavaScript, giá trị nào là falsy?",
      options: {
        A: "'0'",
        B: "[]",
        C: "0",
        D: "{}",
      },
      answer: "C",
    },
    {
      id: 4,
      content: "Hook nào dùng để quản lý state trong React function component?",
      options: {
        A: "useRef",
        B: "useMemo",
        C: "useState",
        D: "useCallback",
      },
      answer: "C",
    },
    {
      id: 5,
      content: "Tailwind utility nào đặt display thành flex?",
      options: {
        A: "grid",
        B: "inline",
        C: "flex",
        D: "block-flex",
      },
      answer: "C",
    },
    {
      id: 6,
      content: "Phương thức Array nào trả về mảng mới sau khi transform từng phần tử?",
      options: {
        A: "forEach",
        B: "map",
        C: "filter",
        D: "reduceRight",
      },
      answer: "B",
    },
    {
      id: 7,
      content: "HTTP status nào biểu thị Not Found?",
      options: {
        A: "200",
        B: "301",
        C: "404",
        D: "500",
      },
      answer: "C",
    },
    {
      id: 8,
      content: "Trong Next.js App Router, file nào định nghĩa route segment?",
      options: {
        A: "component.tsx",
        B: "route.ts",
        C: "screen.tsx",
        D: "page.tsx",
      },
      answer: "D",
    },
    {
      id: 9,
      content: "CSS property nào dùng để đổi màu chữ?",
      options: {
        A: "font-color",
        B: "text-style",
        C: "color",
        D: "foreground",
      },
      answer: "C",
    },
    {
      id: 10,
      content: "Phương thức nào chuyển chuỗi JSON thành object JavaScript?",
      options: {
        A: "JSON.parse",
        B: "JSON.stringify",
        C: "Object.fromJSON",
        D: "String.toObject",
      },
      answer: "A",
    },
  ],
};

const EXAM_CODE_PATTERN = /^[A-Z0-9]{4,10}$/;

export function normalizeExamCode(rawCode: string): string {
  return rawCode.trim().toUpperCase();
}

export function validateExamCode(rawCode: string): string | null {
  const code = normalizeExamCode(rawCode);

  if (!code) {
    return "Vui lòng nhập mã phòng thi.";
  }

  if (!EXAM_CODE_PATTERN.test(code)) {
    return "Mã không hợp lệ. Dùng 4-10 ký tự chữ hoặc số.";
  }

  return null;
}

export function serializeAnswers(answers: Array<OptionId | null>): string {
  return answers.map((answer) => answer ?? "X").join("");
}

function isOptionId(value: string): value is OptionId {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

export function parseSerializedAnswers(serializedAnswers: string, questionCount: number): Array<OptionId | null> {
  const normalized = serializedAnswers.trim().toUpperCase();

  return Array.from({ length: questionCount }, (_, index) => {
    const value = normalized[index] ?? "";
    return isOptionId(value) ? value : null;
  });
}

export function calculateExamResult(exam: MockExam, answers: Array<OptionId | null>) {
  const totalQuestions = exam.questions.length;

  let correctCount = 0;
  let answeredCount = 0;

  exam.questions.forEach((question, index) => {
    const selected = answers[index];

    if (selected) {
      answeredCount += 1;
    }

    if (selected === question.answer) {
      correctCount += 1;
    }
  });

  const rawScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 10 : 0;
  const score = Math.round(rawScore * 10) / 10;

  return {
    totalQuestions,
    correctCount,
    answeredCount,
    score,
  };
}

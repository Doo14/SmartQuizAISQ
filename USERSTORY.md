# USERSTORY — SmartQuiz AI (Frontend)

Mục tiêu của file này: lưu lại **bối cảnh + tiến độ UI** để lần sau mở dự án, tiếp tục làm mà không cần hỏi lại nhiệm vụ.

---

## 1) Dự án là gì?

**SmartQuiz AI**: hệ thống thi trắc nghiệm có giám sát chống gian lận:
- Teacher tạo đề bằng **Excel/Manual/AI Generate**
- Student vào thi bằng **mã code**
- Trong khi thi có **anti-cheat** (tab switch / keyboard / camera) và log vi phạm realtime
- Nộp bài → xem điểm + xem lại đáp án + xem vi phạm

Backend do thành viên khác trong team phụ trách. Frontend hiện đang làm dạng **demo chạy thật bằng mock + localStorage**, để trình bày flow và UI.

---

## 2) Trạng thái hiện tại (đã làm xong)

### UI nền tảng
- Có bộ UI tối thiểu:
  - `components/ui/button.tsx`
  - `components/ui/input.tsx`
  - `components/ui/card.tsx`
  - `components/ui/badge.tsx`
- Có layout shell dashboard: `components/layout/app-shell.tsx`
- Có toast system (không thêm dependency):
  - `components/ui/toast.tsx`
  - `components/providers.tsx`
  - Đã mount ở `app/layout.tsx`

### Các route chính (demo)
- Landing: `/`
- Auth: `/login`, `/register`, `/verify`
- Teacher:
  - `/teacher`
  - `/teacher/exams`
  - `/teacher/exams/new`
  - `/teacher/results`
- Student:
  - `/student`
  - `/student/join`
  - `/student/exam`
  - `/student/result`
  - `/student/history`

### Student flow “chạy thật” (mock)
- `/student/join`: validate mã phòng thi → điều hướng `/student/exam?code=...`
- `/student/exam`:
  - Timer countdown
  - Điều hướng câu (prev/next + question pills desktop)
  - Lưu đáp án theo câu
  - Anti-cheat UI:
    - warning banner + toast
    - counters
    - Demo controls simulate vi phạm
    - tab-switch detection bằng `visibilitychange`
  - Submit: lưu attempt + violations vào localStorage (demo-store) + điều hướng sang result
- `/student/result`: tính điểm từ mock answer key + review từng câu

### Teacher create exam “chạy thật” (demo)
- `/teacher/exams/new`:
  - Form metadata đề thi (title/description/start/end/duration)
  - Tabs tạo câu hỏi:
    - Manual editor (add/edit/delete/reorder, chọn đáp án đúng)
    - “Excel import” (demo bằng CSV): upload `.csv` → validate → preview → import vào editor
    - AI generate (mock): topic/count/difficulty → preview → apply vào editor
  - Save: sinh code + lưu vào localStorage
- `/teacher/exams`: đọc danh sách đề từ localStorage, show stats attempt/violations

### Teacher results drill-down
- `/teacher/results`:
  - List attempts (được tạo khi student submit)
  - Drill-down attempt → show violation logs table
  - Filter theo exam code và violation type

---

## 3) Demo data storage (localStorage)

File: `lib/demo-store.ts`

Keys:
- `smartquiz.demo.exams.v1`: danh sách exams (metadata + questionCount)
- `smartquiz.demo.examQuestions.v1.<examId>`: câu hỏi chi tiết của exam (editor)
- `smartquiz.demo.attempts.v1`: attempts khi student nộp bài
- `smartquiz.demo.violations.v1`: violation logs khi student simulate/trigger vi phạm

Ghi chú:
- Đây là storage phục vụ demo UI, backend team sẽ thay bằng API sau.

---

## 4) Cách chạy và test nhanh

Chạy dev:
```bash
cd d:\MOCKFPT\fpt_mock_frontend
npm run dev
```

Test flow demo:
1) Teacher tạo đề: `/teacher/exams/new` → Save → xem list `/teacher/exams`
2) Student vào thi: `/student/join` → vào `/student/exam` → simulate violations → Submit
3) Teacher xem kết quả/vi phạm: `/teacher/results` → chọn attempt → xem logs

---

## 5) Việc cần làm tiếp (gợi ý backlog)

- Teacher create exam:
  - Preview full questions trước khi save (table + edit inline nhanh)
  - Download template CSV/Excel mẫu
  - Edit exam đã tạo (load questions theo examId)
- Results/violations:
  - Group theo exam → master-detail tốt hơn
  - Export CSV
  - Evidence preview (mock link) trong bảng log
- Anti-cheat:
  - Timeline vi phạm theo thời gian
  - Banner severity levels + auto-hide logic tinh hơn
- Refactor:
  - Tách components lớn của `teacher/exams/new` thành component con để dễ maintain


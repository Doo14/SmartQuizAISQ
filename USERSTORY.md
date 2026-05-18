# USERSTORY — SmartQuiz AI (Frontend)

Mục tiêu của file này: lưu lại **bối cảnh + tiến độ UI** để lần sau mở dự án, tiếp tục làm mà không cần hỏi lại nhiệm vụ.

---

## 1) Dự án là gì?

**SmartQuiz AI**: hệ thống thi trắc nghiệm có giám sát chống gian lận:
- Teacher tạo đề bằng **Excel/Manual/AI Generate**
- Student vào thi bằng **mã code**
- Trong khi thi có **anti-cheat** (tab switch / keyboard / camera) và log vi phạm realtime
- Nộp bài → xem điểm + xem lại đáp án + xem vi phạm

Backend do thành viên khác trong team phụ trách. Frontend hiện đã được tích hợp với API thật và Real-time WebSocket thay vì dùng mock/localStorage như lúc trước.

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
  - Submit: gọi API lưu attempt + violations + điều hướng sang result
- `/student/result`: tính điểm từ API trả về + review từng câu

### Teacher create exam “chạy thật” (demo)
- `/teacher/exams/new`:
  - Form metadata đề thi (title/description/start/end/duration)
  - Tabs tạo câu hỏi:
    - Manual editor (add/edit/delete/reorder, chọn đáp án đúng)
    - “Excel import” (demo bằng CSV): upload `.csv` → validate → preview → import vào editor
    - AI generate (mock): topic/count/difficulty → preview → apply vào editor
  - Save: gọi API tạo đề thi
- `/teacher/exams`: gọi API lấy danh sách đề, show stats attempt/violations

### Teacher results drill-down
- `/teacher/results`:
  - List attempts (được tạo khi student submit)
  - Drill-down attempt → show violation logs table
  - Filter theo exam code và violation type

---

## 3) API & WebSocket (Đã tích hợp)

Dự án hiện đã kết nối với Backend NestJS thông qua `lib/api.ts` và `lib/socket.ts`. Toàn bộ dữ liệu trước đây dùng `demo-store.ts` (localStorage) đã bị xóa bỏ. Mọi thao tác như tạo phòng, làm bài, theo dõi hành vi đều thông qua API.

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


# agent.md — Breakdown triển khai cho Claude Opus

## 1) Đánh giá nhanh kế hoạch hiện tại

Kế hoạch trong `AGENTS.md` / `CLAUDE.md` **ổn về scope sản phẩm và roadmap 4 sprint**.  
Tuy nhiên để Claude Opus code liên tục, cần bổ sung các điểm sau:

- Thiếu cấu trúc repo rõ ràng (frontend-only hiện tại, chưa có backend workspace).
- Thiếu thứ tự phụ thuộc kỹ thuật (DB/Auth phải xong trước exam flow, exam flow trước anti-cheat).
- Thiếu Definition of Done cho từng ticket nhỏ (endpoint, test, UI state, migration).
- Thiếu checklist tích hợp (FE-BE contract, env, seed data, e2e smoke test).
- Chưa có khung `skills` và `mcp-server` để hỗ trợ vận hành agent.

## 2) Mục tiêu thực thi

Chuyển plan lớn thành các ticket nhỏ, mỗi ticket:

1. Làm trong 1 PR nhỏ.
2. Có đầu ra đo được (file/endpoint/page cụ thể).
3. Có checklist verify.
4. Có prompt sẵn cho Claude Opus.

---

## 3) Thứ tự triển khai tối ưu (khuyến nghị)

### Phase 0 — Repo Foundation (bắt buộc)

#### Task P0-1: Chuẩn hóa cấu trúc monorepo
- Tạo:
  - `apps/frontend` (Next.js hiện tại)
  - `apps/backend` (NestJS)
  - `packages/shared-types`
  - `infra/docker`
- Di chuyển code frontend hiện có vào `apps/frontend`.
- Cập nhật scripts root `package.json` cho dev/build/lint.
- **Done khi:** chạy được `npm run dev:frontend` và `npm run dev:backend`.

#### Task P0-2: Thiết lập biến môi trường và config mẫu
- Tạo `.env.example` cho frontend/backend.
- Khai báo rõ `DATABASE_URL`, `JWT_SECRET`, `MAIL_*`, `AI_PROVIDER`, `AI_API_KEY`.
- **Done khi:** onboarding dev mới dưới 10 phút.

#### Task P0-3: Docker local stack
- Viết `docker-compose.yml` cho postgres + backend + frontend.
- Có healthcheck postgres và backend.
- **Done khi:** `docker compose up` chạy full stack.

---

### Phase 1 — Backend Core (Sprint 1 trọng tâm)

#### Task P1-1: Bootstrap NestJS + Prisma
- Khởi tạo module `auth`, `users`, `exams`, `attempts`, `violations`.
- Tạo `prisma/schema.prisma` bám đúng ERD.
- **Done khi:** migrate chạy thành công + prisma studio xem được bảng.

#### Task P1-2: Auth register + verify email + login + refresh
- Endpoint:
  - `POST /auth/register`
  - `GET /auth/verify/:token`
  - `POST /auth/login`
  - `POST /auth/refresh`
- Hash bcrypt, access + refresh JWT, token verify hết hạn 24h.
- **Done khi:** Postman collection pass toàn bộ auth flow.

#### Task P1-3: RBAC guard + Swagger contract lock
- `TeacherGuard`, `StudentGuard`.
- Mô tả DTO + response trong Swagger.
- **Done khi:** FE có thể code theo OpenAPI không phải đoán field.

---

### Phase 2 — Frontend Auth + Dashboard Skeleton

#### Task P2-1: Auth pages
- `/register`, `/login`, verify-email callback page.
- Lưu token an toàn (khuyến nghị HttpOnly cookie qua backend BFF, nếu chưa thì tạm localStorage + cảnh báo).
- **Done khi:** user đăng ký/verify/login end-to-end.

#### Task P2-2: Route protection + role redirect
- Teacher vào `/teacher/*`, Student vào `/student/*`.
- Tạo dashboard skeleton cho 2 role.
- **Done khi:** unauthorized route bị redirect đúng.

---

### Phase 3 — Exam Core Flow (Sprint 2)

#### Task P3-1: CRUD exam + generate code
- Teacher tạo/sửa/xóa đề, code phòng thi unique.
- **Done khi:** teacher thấy list đề theo chính mình.

#### Task P3-2: Question management (manual)
- Tạo câu hỏi + 4 options + 1 đáp án đúng.
- **Done khi:** lưu/đọc lại đúng thứ tự và đáp án.

#### Task P3-3: Join exam + attempt lifecycle + scoring
- Student nhập code để join.
- Start attempt, submit, auto-submit timeout, tính điểm.
- **Done khi:** có result đúng cho attempt mẫu.

#### Task P3-4: Result pages
- Student xem điểm và đáp án đúng/sai.
- Teacher xem kết quả tổng hợp.
- **Done khi:** UI render được dữ liệu thực từ API.

---

### Phase 4 — Excel + AI Generation

#### Task P4-1: Excel import pipeline
- Upload `.xlsx` + validate format + preview + confirm save.
- Tạo file template mẫu.
- **Done khi:** import thành công 20 câu mẫu không lỗi schema.

#### Task P4-2: AI generation service
- Adapter `Gemini/OpenAI` + prompt builder + Zod validation.
- Endpoint preview trước khi save.
- **Done khi:** reject output sai format, pass output hợp lệ.

---

### Phase 5 — Anti-cheat (Sprint 3)

#### Task P5-1: Client anti-cheat sensors
- Tab visibility, keyboard Ctrl+C/V, right-click block.
- Emit violation event qua Socket.IO.
- **Done khi:** server nhận đủ event type.

#### Task P5-2: Camera pipeline
- Xin quyền camera, detect face/gaze, periodic snapshot.
- Fallback `camera_missing` nếu deny.
- **Done khi:** log được evidence + violation type chính xác.

#### Task P5-3: Violation backend + warning loop
- Save `violation_logs`, tăng `violation_count`, emit `violation:warning`.
- API teacher xem thống kê vi phạm.
- **Done khi:** teacher dashboard thấy log theo attempt.

---

### Phase 6 — Harden + Deploy (Sprint 4)

#### Task P6-1: Security hardening
- Helmet, CORS, rate limit, input validation/sanitization.
- **Done khi:** không còn endpoint thiếu validation guard.

#### Task P6-2: CI/CD + production Docker
- GitHub Actions: lint, test, build image.
- **Done khi:** merge vào main tự build xanh.

#### Task P6-3: Load test + demo script
- Kịch bản 10+ concurrent users.
- **Done khi:** demo flow ổn định 5 phút không crash.

---

## 4) Khung folder hỗ trợ agent

- `skills/`: nơi đặt playbook/prompt template để Claude Opus chạy task nhất quán.
- `mcp-server/`: nơi đặt MCP server nội bộ (ví dụ tool truy vấn tiến độ, seed data, trạng thái môi trường).

## 5) Prompt template giao việc cho Claude Opus

Dùng mẫu này cho từng ticket:

```md
Bạn đang làm task: <TASK_ID>
Mục tiêu: <1 câu>
Phạm vi file: <liệt kê folder/file>
Yêu cầu bắt buộc:
1) Không phá vỡ API contract hiện tại.
2) Viết code + cập nhật test liên quan.
3) Chạy lint/test cho phần đã sửa.
4) Trả về:
   - Danh sách file đã đổi
   - Lý do thay đổi
   - Cách verify thủ công
Definition of Done:
- <check 1>
- <check 2>
- <check 3>
```

## 6) Danh sách task có thể giao ngay cho Claude Opus (theo thứ tự)

1. `P0-1` Monorepo restructure.
2. `P1-1` Backend bootstrap + Prisma schema.
3. `P1-2` Full auth flow.
4. `P1-3` Guards + Swagger.
5. `P2-1` Frontend auth pages.
6. `P2-2` Role-based routing.
7. `P3-1` Exam CRUD + code.
8. `P3-2` Manual question editor.
9. `P3-3` Attempt lifecycle + scoring.
10. `P4-1` Excel import + preview.
11. `P4-2` AI generate + Zod validate.
12. `P5-1` Tab/keyboard/right-click anti-cheat.
13. `P5-2` Camera anti-cheat.
14. `P5-3` Violation APIs + teacher logs.
15. `P6-1` Security hardening.
16. `P6-2` CI/CD + Docker production.
17. `P6-3` Load test + demo script.

> Khuyến nghị: chạy tuần tự từ 1→17, chỉ mở task tiếp theo khi task trước đạt Definition of Done.

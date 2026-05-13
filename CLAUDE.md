# CLAUDE.md — SmartQuiz AI

> **Hệ thống thi trắc nghiệm có giám sát chống gian lận:** AI tự động sinh câu hỏi, hỗ trợ import Excel & tạo thủ công, hệ thống anti-cheat tích hợp camera + keyboard log + tab detection.

---

## 📋 Tổng quan dự án

| Hạng mục | Chi tiết |
|---|---|
| **Mô hình** | Online Exam + AI Question Generation + Excel Import + Manual Creation + Anti-cheat (Camera + Log) |
| **AI Engine** | Gemini Flash / Pro (hoặc OpenAI GPT-4o) |
| **Thời gian** | 4 tuần (4 sprints) |
| **Rủi ro chính** | Scope creep — ưu tiên core flow trước |
| **Target demo** | 10+ người dùng đồng thời |
| **Deploy** | Docker + Docker Compose |

---

## 🔄 Main Flow — Tổng quan luồng chính

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TEACHER FLOW                                │
│                                                                     │
│  1. Đăng ký (email + password + role=Teacher)                      │
│  2. Xác thực email qua link (nodemailer)                           │
│  3. Đăng nhập → Teacher Dashboard                                  │
│  4. Tạo bài thi bằng 1 trong 3 cách:                              │
│     ┌────────────────┐ ┌────────────────┐ ┌──────────────────────┐ │
│     │ Cách 1: Excel  │ │ Cách 2: Manual │ │ Cách 3: AI Generate  │ │
│     │ Upload .xlsx   │ │ Nhập từng câu  │ │ Nhập chủ đề + số    │ │
│     │ → Parse + Preview│ │ kiểu Kahoot  │ │ câu + độ khó → AI   │ │
│     │ → Confirm lưu  │ │ → Lưu trực tiếp│ │ → Preview → Lưu    │ │
│     └────────────────┘ └────────────────┘ └──────────────────────┘ │
│  5. Cấu hình: thời gian mở (start/end), duration                  │
│  6. Hệ thống sinh mã code phòng thi (6-8 ký tự)                   │
│  7. Xem kết quả + thống kê vi phạm                                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        STUDENT FLOW                                │
│                                                                     │
│  1. Đăng ký + xác thực email                                      │
│  2. Đăng nhập → Student Dashboard                                  │
│     - Grid ô vuông: bài thi đã làm/sắp làm (tên, ngày, điểm)    │
│  3. Nhập mã code phòng thi → Vào bài                              │
│  4. Làm bài thi:                                                   │
│     - Câu hỏi + radio options + countdown timer                   │
│     - ⚠️ HỆ THỐNG CHỐNG GIAN LẬN hoạt động:                      │
│       • Camera: face-api.js phát hiện nhiều mặt / nhìn ngoài      │
│       • Tab-switch detection (Page Visibility API)                 │
│       • Keyboard: chặn Ctrl+C/V, log mọi phím                    │
│       • Right-click: chặn contextmenu                              │
│       • Socket.IO: gửi vi phạm real-time về server                │
│  5. Nộp bài (thủ công hoặc tự động khi hết giờ)                   │
│  6. Xem kết quả: điểm, số câu đúng, vi phạm, xem lại từng câu   │
└─────────────────────────────────────────────────────────────────────┘
```

### Luồng chi tiết:

1. **Đăng ký** → Điền email, password, chọn role → Nhận email xác thực → Click link kích hoạt
2. **Đăng nhập** → JWT phân quyền → Redirect theo role
3. **Teacher tạo đề:** Excel upload / Nhập tay / AI sinh → Preview → Cấu hình thời gian → Lưu → Sinh code
4. **Student vào thi:** Nhập code → Validate (mã đúng, trong thời gian) → Bắt đầu làm bài
5. **Trong khi thi:** Anti-cheat giám sát liên tục → Log vi phạm → Cảnh báo trên màn hình
6. **Nộp bài** → Server tính điểm → Lưu kết quả + vi phạm
7. **Xem kết quả:** Điểm, đáp án đúng/sai (xanh/đỏ), số vi phạm

---

## 🏗️ Tech Stack

### Backend (Member 2)
- **Framework:** NestJS + TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Realtime:** Socket.IO
- **AI:** Gemini API (hoặc OpenAI GPT-4o)
- **Auth:** JWT access + refresh token
- **Email:** Nodemailer (xác thực email)
- **File Processing:** Multer + exceljs (Excel import)
- **Deploy:** Docker

### Frontend (Member 1)
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS / Ant Design
- **State:** Zustand
- **Animation:** Framer Motion
- **Realtime:** Socket.IO client
- **Camera AI:** face-api.js (TensorFlow.js)

### AI/DevOps (Member 3)
- **AI Integration:** Gemini/OpenAI API pipeline
- **Container:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Face Detection:** face-api.js tuning

---

## 🔑 Nguyên tắc kỹ thuật cốt lõi

**Anti-Cheat Pipeline (Client → Server):**
```
face-api.js detect → multiple faces? gaze away? ──┐
Page Visibility API → tab blur? ──────────────────┤
Keyboard listener → Ctrl+C/V? ───────────────────┤
Context menu → right-click? ──────────────────────┤
                                                   ▼
                                          Socket.IO emit
                                          "violation:report"
                                                   │
                                          Server receives
                                          → Save ViolationLog
                                          → Update violation_count
                                          → Emit "violation:warning"
```

**AI Question Generation Pipeline:**
```
Teacher input (topic, count, difficulty)
  → Server builds prompt
  → Call Gemini/OpenAI API
  → Parse JSON response
  → Validate with Zod
  → Return questions to FE for preview
  → Teacher review/edit → Confirm save
```

**Gemini Output Contract (validate bằng Zod):**
```typescript
{
  questions: [
    {
      content: string,
      options: [
        { label: "A", content: string, is_correct: boolean },
        { label: "B", content: string, is_correct: boolean },
        { label: "C", content: string, is_correct: boolean },
        { label: "D", content: string, is_correct: boolean }
      ]
    }
  ]
}
```

---

## 🗄️ Database Schema

### ERD Relationships
```
User (1) ──── (n) Exam          [Teacher tạo]
User (1) ──── (n) ExamAttempt   [Student tham gia]
Exam (1) ──── (n) Question
Question (1) ── (n) Option
Exam (1) ──── (n) ExamAttempt
ExamAttempt (1) ── (n) Answer
ExamAttempt (1) ── (n) ViolationLog
Answer (n) ──── (1) Option      [selected]
Answer (n) ──── (1) Question    [for]
```

### Tables

**users**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | auto gen |
| email | VARCHAR(255) UNIQUE | |
| password_hash | VARCHAR(255) | bcrypt |
| role | ENUM('teacher','student') | |
| is_verified | BOOLEAN | default FALSE |
| verification_token | VARCHAR(255) | nullable, 24h expiry |
| created_at, updated_at | TIMESTAMPTZ | |

**exams**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| teacher_id | FK → users.id | |
| title | VARCHAR(255) | |
| description | TEXT | nullable |
| start_time | TIMESTAMPTZ | thời điểm mở |
| end_time | TIMESTAMPTZ | thời điểm đóng |
| duration_minutes | INTEGER | 0 = không giới hạn |
| code | VARCHAR(10) UNIQUE | auto gen 6-8 chars |
| is_active | BOOLEAN | xóa mềm |
| created_at, updated_at | TIMESTAMPTZ | |

**questions**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| exam_id | FK → exams.id | CASCADE |
| content | TEXT | nội dung câu hỏi |
| image_url | VARCHAR(255) | nullable |
| order_index | INTEGER | thứ tự |
| created_at | TIMESTAMPTZ | |

**options**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| question_id | FK → questions.id | CASCADE |
| label | CHAR(1) | A, B, C, D |
| content | TEXT | |
| is_correct | BOOLEAN | 1 đáp án đúng/câu |
| created_at | TIMESTAMPTZ | |

**exam_attempts**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| exam_id | FK → exams.id | |
| student_id | FK → users.id | |
| started_at | TIMESTAMPTZ | |
| submitted_at | TIMESTAMPTZ | nullable |
| total_correct | INTEGER | default 0 |
| score | DECIMAL(5,2) | |
| violation_count | INTEGER | default 0 |
| status | ENUM | in_progress / completed / terminated |
| created_at | TIMESTAMPTZ | |

**answers**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| attempt_id | FK → exam_attempts.id | |
| question_id | FK → questions.id | |
| selected_option_id | FK → options.id | nullable |
| is_correct | BOOLEAN | auto calculated |
| answered_at | TIMESTAMPTZ | |

**violation_logs**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| attempt_id | FK → exam_attempts.id | |
| student_id | FK → users.id | |
| violation_type | ENUM | tab_switch, keyboard_copy, keyboard_paste, camera_multiple_faces, camera_gaze_away, camera_missing |
| description | TEXT | chi tiết |
| evidence_url | VARCHAR(255) | ảnh camera, nullable |
| created_at | TIMESTAMPTZ | |

---

## 👥 Phân công nhân sự

### Member 1 — Frontend Engineer
- Landing page, Đăng ký/Đăng nhập UI
- Teacher Dashboard: quản lý bài thi, popup cập nhật/xóa, import đề (Excel, Manual, AI)
- Student Dashboard: grid bài thi, input code, trang làm bài, kết quả
- Camera integration (face-api.js): phát hiện khuôn mặt, hướng nhìn
- Anti-cheat client: tab detection, keyboard log, right-click block
- Socket.IO client: emit violations, receive warnings
- Responsive design

### Member 2 — Backend Engineer
- Database schema design + Prisma migrate
- Auth module: register, verify email (nodemailer), login, JWT + refresh token, phân quyền
- CRUD: Exam, Question, Option, ExamAttempt, Answer, ViolationLog
- Excel import: Multer upload + exceljs parse
- Luồng thi: bắt đầu, kết thúc tự động, tính điểm, lưu kết quả
- Socket.IO server: time sync, violation events
- REST API + Swagger

### Member 3 — AI/DevOps Engineer
- Tích hợp API AI (Gemini/OpenAI): sinh câu hỏi theo chủ đề
- Pipeline: request → prompt → AI → parse JSON → validate Zod → return
- Docker + Docker Compose configuration
- CI/CD (GitHub Actions)
- face-api.js optimization
- Production deployment support

---

## 📅 Sprint Roadmap

### 🗓️ SPRINT 1 — Foundation + Auth + DB (Tuần 1)
**Milestone:** Auth hoàn chỉnh (email verify), DB migrate, landing page

#### Backend (Member 2)
- [ ] **[BE-1.1]** Khởi tạo NestJS + Prisma + PostgreSQL
- [ ] **[BE-1.2]** Migrate schema: 7 bảng (users, exams, questions, options, exam_attempts, answers, violation_logs)
- [ ] **[BE-1.3]** Auth: Register (email, password, role) + bcrypt hash
- [ ] **[BE-1.4]** Email verification: nodemailer gửi link (token 24h)
- [ ] **[BE-1.5]** Login: validate → JWT access + refresh token
- [ ] **[BE-1.6]** Guards: TeacherGuard, StudentGuard (role-based)
- [ ] **[BE-1.7]** Swagger/OpenAPI setup — lock API contract

#### Frontend (Member 1)
- [ ] **[FE-1.1]** Khởi tạo Next.js (App Router) + Tailwind CSS
- [ ] **[FE-1.2]** Landing page: hero section, features, CTA đăng ký/đăng nhập
- [ ] **[FE-1.3]** Trang đăng ký: email, password, confirm, chọn role (Teacher/Student)
- [ ] **[FE-1.4]** Trang đăng nhập: email + password → lưu JWT
- [ ] **[FE-1.5]** Protected routes: redirect theo role
- [ ] **[FE-1.6]** Layout dashboard Teacher + Student (skeleton)

#### AI/DevOps (Member 3)
- [ ] **[AI-1.1]** Docker + Docker Compose: NestJS + PostgreSQL
- [ ] **[AI-1.2]** Nghiên cứu face-api.js, download model weights
- [ ] **[AI-1.3]** Thiết kế AI prompt template cho sinh câu hỏi
- [ ] **[AI-1.4]** Setup GitHub repo + branching strategy

---

### 🗓️ SPRINT 2 — Core Exam Flow (Tuần 2)
**Milestone:** Teacher tạo đề (3 cách) → Student vào thi → Làm bài → Xem điểm

#### Backend (Member 2)
- [ ] **[BE-2.1]** CRUD Exam: create, read, update, delete (teacher only)
- [ ] **[BE-2.2]** Auto-generate exam code (6-8 chars unique)
- [ ] **[BE-2.3]** CRUD Question + Option
- [ ] **[BE-2.4]** Excel import: Multer upload → exceljs parse → create questions
- [ ] **[BE-2.5]** AI generate endpoint: (topic, count, difficulty) → call AI → return preview
- [ ] **[BE-2.6]** Join exam by code: validate code + time window
- [ ] **[BE-2.7]** ExamAttempt: start, submit, auto-submit on timeout
- [ ] **[BE-2.8]** Scoring engine: compare answers → calculate score
- [ ] **[BE-2.9]** Socket.IO gateway: time sync, exam events

#### Frontend (Member 1)
- [ ] **[FE-2.1]** Teacher Dashboard: list exams, popup edit/delete
- [ ] **[FE-2.2]** Tạo đề - Excel: upload .xlsx → preview → confirm
- [ ] **[FE-2.3]** Tạo đề - Manual: form nhập câu hỏi + 4 options + chọn đáp án đúng
- [ ] **[FE-2.4]** Tạo đề - AI: input topic/count/difficulty → preview → edit → save
- [ ] **[FE-2.5]** Cấu hình thời gian (start/end/duration)
- [ ] **[FE-2.6]** Student Dashboard: grid ô vuông, input code
- [ ] **[FE-2.7]** Trang làm bài: câu hỏi, radio, timer, prev/next
- [ ] **[FE-2.8]** Trang kết quả: điểm, đáp án xanh/đỏ

#### AI/DevOps (Member 3)
- [ ] **[AI-2.1]** Gemini API integration: prompt → parse JSON → validate Zod
- [ ] **[AI-2.2]** CI/CD pipeline (GitHub Actions → Docker build)
- [ ] **[AI-2.3]** Test AI output quality, tune prompts

---

### 🗓️ SPRINT 3 — Anti-Cheat System (Tuần 3)
**Milestone:** Hệ thống chống gian lận hoạt động end-to-end

#### Backend (Member 2)
- [ ] **[BE-3.1]** ViolationLog: receive + save violations from client
- [ ] **[BE-3.2]** Socket.IO: receive violation → save → broadcast warning
- [ ] **[BE-3.3]** Camera evidence: receive base64 image → save file → return URL
- [ ] **[BE-3.4]** Violation aggregation API: stats per attempt/student
- [ ] **[BE-3.5]** Teacher view: list violations per exam attempt

#### Frontend (Member 1)
- [ ] **[FE-3.1]** Tab-switch detection (Page Visibility API) → emit violation
- [ ] **[FE-3.2]** Keyboard logger: chặn Ctrl+C/V, log keydown → emit violation
- [ ] **[FE-3.3]** Right-click blocker (contextmenu) → emit violation
- [ ] **[FE-3.4]** Camera: request permission → face-api.js init
- [ ] **[FE-3.5]** Camera: detect multiple faces (>1) → emit violation
- [ ] **[FE-3.6]** Camera: estimate gaze direction → emit violation
- [ ] **[FE-3.7]** Camera: periodic capture (30s) → send to server
- [ ] **[FE-3.8]** Warning UI: hiển thị cảnh báo, đếm vi phạm
- [ ] **[FE-3.9]** Socket.IO client: emit/receive violation events

#### AI/DevOps (Member 3)
- [ ] **[AI-3.1]** face-api.js tuning: model selection, threshold config
- [ ] **[AI-3.2]** Test Docker deployment end-to-end
- [ ] **[AI-3.3]** Cross-browser camera testing

---

### 🗓️ SPRINT 4 — Polish + Deploy (Tuần 4)
**Milestone:** Deploy production, demo 10+ người

#### Backend (Member 2)
- [ ] **[BE-4.1]** Security: CORS, Helmet, rate limiting, input sanitization
- [ ] **[BE-4.2]** Teacher results API: detailed stats + violation summary
- [ ] **[BE-4.3]** Health check endpoint
- [ ] **[BE-4.4]** Fixture data: 3-5 đề thi mẫu
- [ ] **[BE-4.5]** Production Docker optimization

#### Frontend (Member 1)
- [ ] **[FE-4.1]** Kết quả chi tiết: điểm, đáp án, vi phạm, thời gian
- [ ] **[FE-4.2]** Teacher: xem violation logs từng student
- [ ] **[FE-4.3]** Responsive (tablet + mobile)
- [ ] **[FE-4.4]** Error boundaries + empty states + loading skeletons
- [ ] **[FE-4.5]** Polish UI: animations, transitions

#### AI/DevOps (Member 3)
- [ ] **[AI-4.1]** Docker production build + compose
- [ ] **[AI-4.2]** Deploy lên server
- [ ] **[AI-4.3]** Load test 10+ users
- [ ] **[AI-4.4]** Demo script (5 phút)

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/auth/register` | Đăng ký (email, password, role) |
| GET | `/auth/verify/:token` | Xác thực email |
| POST | `/auth/login` | Đăng nhập → JWT |
| POST | `/auth/refresh` | Refresh token |

### Exams (Teacher)
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/exams` | Tạo exam |
| GET | `/exams` | List exams (teacher) |
| GET | `/exams/:id` | Chi tiết exam |
| PUT | `/exams/:id` | Cập nhật |
| DELETE | `/exams/:id` | Xóa |
| POST | `/exams/:id/import-excel` | Import Excel |
| POST | `/exams/:id/generate-ai` | AI sinh câu hỏi |
| GET | `/exams/:id/results` | Kết quả thi |

### Questions
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/exams/:examId/questions` | Thêm câu hỏi |
| PUT | `/questions/:id` | Sửa |
| DELETE | `/questions/:id` | Xóa |

### Student
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/exams/join` | Vào phòng thi (code) |
| POST | `/attempts/:id/answers` | Gửi câu trả lời |
| POST | `/attempts/:id/submit` | Nộp bài |
| GET | `/attempts/my` | Lịch sử bài thi |
| GET | `/attempts/:id/result` | Kết quả chi tiết |

### Violations
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/violations` | Ghi nhận vi phạm |
| POST | `/violations/evidence` | Upload ảnh camera |
| GET | `/attempts/:id/violations` | List vi phạm |

### Socket.IO Events
| Event | Direction | Mô tả |
|---|---|---|
| `exam:join` | Client → Server | Join exam room |
| `exam:time-sync` | Server → Client | Đồng bộ thời gian |
| `violation:report` | Client → Server | Báo vi phạm |
| `violation:warning` | Server → Client | Cảnh báo |
| `exam:auto-submit` | Server → Client | Tự động nộp bài |

---

## ⚠️ Risk Management

| Rủi ro | Mức độ | Giải pháp |
|---|---|---|
| Scope quá lớn | 🔴 Cao | Lock features sau Sprint 1 |
| Camera permission bị từ chối | 🔴 Cao | Fallback: log vi phạm "camera_missing", vẫn cho thi |
| face-api.js chậm trên máy yếu | 🟡 TB | Giảm tần suất detect, chọn model nhẹ (tinyFaceDetector) |
| Gemini rate limit | 🟡 TB | Cache kết quả, fixture data, error UI thân thiện |
| FE-BE API không đồng bộ | 🔴 Cao | Lock Swagger contract cuối Sprint 1 |
| HTTPS cần cho camera | 🟡 TB | Dev: localhost OK, Prod: cần SSL cert |
| Excel format không chuẩn | 🟡 TB | Cung cấp template mẫu, validate chặt |

---

## 🚫 Scope Freeze Rules

Sau Sprint 1, **KHÔNG thêm**:
- OAuth login (Google, Facebook)
- Fullscreen API enforcement
- Gamification (badges, streaks)
- Ngân hàng câu hỏi đa cấp độ
- Tích hợp thanh toán
- Mobile native app
- AI sinh câu hỏi nâng cao (training riêng)

---

## ✅ Definition of Done

1. Code review bởi ≥1 thành viên
2. Không console error / TypeScript error
3. Test trên Chrome + mobile Safari
4. API test bằng Postman
5. Loading + error states handled
6. Anti-cheat features tested (tab switch, keyboard, camera)

---

## 📝 Notes

- **Email verification:** Token 24h, gửi lại nếu thất bại
- **Exam code:** 6-8 ký tự alphanumeric, unique
- **Camera:** face-api.js models ~6MB, host trong public folder
- **Tab-switch threshold:** Cảnh báo từ 3 lần, flag từ 5 lần
- **Excel template:** Cung cấp file .xlsx mẫu (câu hỏi, A, B, C, D, đáp án đúng)
- **Violation types:** tab_switch, keyboard_copy, keyboard_paste, camera_multiple_faces, camera_gaze_away, camera_missing

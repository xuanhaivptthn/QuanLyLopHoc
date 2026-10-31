# BÁO CÁO KIỂM TOÁN BẢO MẬT & TỐI ƯU SẴN SÀNG VẬN HÀNH (PRODUCTION-READY AUDIT REPORT)

**Hệ thống:** Quản Lý Lớp Học & Điểm Danh (QuanLyLopHoc)  
**Nhánh kiểm thử & phát triển:** `feat/production-ready-app`  
**Commit gốc trước khi thực hiện mục tiêu:** `770ee79fc643064c994e50f9085086aa30229adb`  
**Công cụ kiểm toán:** [Cloudflare Security Audit Skill](https://github.com/cloudflare/security-audit-skill) (tương thích `report-schema.json` & `validate-findings.cjs`)

---

## 1. Tóm Tắt Kết Quả Kiểm Toán (Executive Summary)

Đội ngũ kỹ thuật đã tiến hành rà soát toàn diện mã nguồn Backend (Spring Boot 3 / Java 21) và Frontend (Next.js 16 / React 19), áp dụng phương pháp kiểm toán tĩnh kết hợp kiểm thử xác minh cục bộ (bounded local verification) theo tiêu chuẩn Cloudflare Security Audit:

| Fingerprint | Lỗ Hổng / Điểm Yếu | Mức Độ | Trạng Thái |
|-------------|-------------------|--------|------------|
| `sec-hardcoded-default-jwt-secret` | Khóa bí mật JWT mặc định bị mã hóa cứng trong cấu hình | 🟠 HIGH | ✅ ĐÃ KHẮC PHỤC |
| `sec-auth-filter-chain-permissive` | Cấu hình `permitAll` quá rộng trên chuỗi filter `/auth/**` | 🟡 MEDIUM | ✅ ĐÃ KHẮC PHỤC |
| `sec-brute-force-missing-rate-limit` | Thiếu giới hạn tần suất (Rate Limiting) trên các endpoint xác thực và điểm danh | 🟡 MEDIUM | ✅ ĐÃ KHẮC PHỤC |
| `sec-csv-formula-injection` | Nguy cơ tấn công CSV Formula Injection (CWE-1236) khi xuất danh sách sinh viên & điểm danh | 🟡 MEDIUM | ✅ ĐÃ KHẮC PHỤC |
| `sec-missing-security-headers` | Thiếu các HTTP Security Headers phòng thủ chiều sâu (X-Content-Type-Options, Frame-Options, HSTS) | 🔵 LOW | ✅ ĐÃ KHẮC PHỤC |

---

## 2. Chi Tiết Lỗ Hổng & Biện Pháp Khắc Phục

### 2.1. `sec-hardcoded-default-jwt-secret` (HIGH)
- **Mô tả:** Thuộc tính `jwt.secret` trong tệp `application.yml` chứa chuỗi khóa bí mật HMAC cố định không có cấu trúc biến môi trường `${JWT_SECRET:...}`. Nếu triển khai lên môi trường máy chủ thực tế mà không ghi đè, kẻ tấn công có thể giả mạo chữ ký JWT với quyền `SUPER_ADMIN` (CWE-798).
- **Khắc phục:**
  - Cập nhật `application.yml` hỗ trợ `${JWT_SECRET:...}` và `${JWT_EXPIRATION_MS:...}`.
  - Xây dựng cấu hình hồ sơ môi trường chuẩn sản xuất `application-prod.yml` yêu cầu cung cấp biến môi trường an toàn và tắt tính năng debug SQL.

### 2.2. `sec-auth-filter-chain-permissive` (MEDIUM)
- **Mô tả:** `SecurityConfig.java` cấu hình `.requestMatchers("/auth/**", "/api/auth/**").permitAll()`. Điều này khiến Spring Security bỏ qua việc xác thực ở tầng Security Filter Chain đối với toàn bộ các route con, bao gồm cả các endpoint cần xác thực như `/auth/me` và `/auth/switch-organization`.
- **Khắc phục:**
  - Thu hẹp chính sách `permitAll()` chỉ cho phép đúng 4 endpoint công khai: `/auth/login`, `/auth/register-teacher`, `/auth/register-center`, `/auth/accept-invite`.
  - Toàn bộ các route khác (kể cả `/auth/me` và `/auth/switch-organization`) bắt buộc phải có token hợp lệ qua quy tắc `.anyRequest().authenticated()`.

### 2.3. `sec-brute-force-missing-rate-limit` (MEDIUM)
- **Mô tả:** Các route xác thực và điểm danh học sinh không có cơ chế giới hạn tần suất (rate limiting), tiềm ẩn nguy cơ tấn công brute-force dò mật khẩu, credential stuffing và vét cạn mã QR roll-call.
- **Khắc phục:**
  - Phát triển bộ lọc `RateLimitingFilter` sử dụng thuật toán cửa sổ trượt (sliding window) theo địa chỉ IP máy khách (hỗ trợ `X-Forwarded-For`).
  - Cấu hình giới hạn mặc định: 15 lần/phút cho xác thực, 30 lần/phút cho điểm danh.
  - Phản hồi mã lỗi chuẩn HTTP 429 Too Many Requests kèm tiêu đề `Retry-After` và JSON ProblemDetail RFC 7807.
  - Kiểm thử đơn vị tự động đạt 100% độ bao phủ (`RateLimitingFilterTest`).

### 2.4. `sec-csv-formula-injection` (MEDIUM)
- **Mô tả:** Khi xuất báo cáo điểm danh hoặc danh sách sinh viên dưới dạng tệp CSV, nếu mã sinh viên hoặc họ tên chứa các ký tự kích hoạt công thức tính toán (`=`, `+`, `-`, `@`), phần mềm bảng tính (Excel/Calc) trên máy người dùng có thể tự động thực thi mã/macro nguy hiểm (CWE-1236).
- **Khắc phục:**
  - Xây dựng tiện ích bảo mật `CsvSanitizer`: tự động thêm dấu nháy đơn `'` phía trước các ký tự công thức, thoát dấu ngoặc kép kép và đính kèm tiền tố UTF-8 Byte Order Mark (BOM) để hỗ trợ font tiếng Việt hoàn hảo trên Excel.
  - Viết bộ test `CsvSanitizerTest` kiểm tra các vector tấn công macro và lệnh injection.

### 2.5. `sec-missing-security-headers` (LOW)
- **Mô tả:** Các phản hồi HTTP thiếu tiêu đề bảo vệ chống MIME-sniffing, clickjacking và ép buộc HTTPS.
- **Khắc phục:**
  - Cấu hình Spring Security với `contentTypeOptions: nosniff`, `frameOptions: DENY`, và `HSTS` thời hạn 1 năm kèm `includeSubDomains`.
  - Tích hợp kiểm thử tự động trong `AttendanceExportIntegrationTest`.

---

## 3. Các Tính Năng Mới Được Triển Khai (Production Features)

1. **Động cơ Xuất Báo Cáo & Phân Tích Điểm Danh (Attendance Reporting & Analytics):**
   - Service: `AttendanceExportService` tổng hợp tỷ lệ chuyên cần của từng sinh viên và toàn bộ lớp học qua các ca học.
   - Controller: `AttendanceExportController` cung cấp:
     - `GET /classrooms/{id}/attendance/report` (JSON dữ liệu phân tích chi tiết)
     - `GET /classrooms/{id}/attendance/export` (Tải tệp CSV báo cáo toàn bộ lớp học)
     - `GET /sessions/{id}/attendance/export` (Tải tệp CSV danh sách điểm danh buổi học)
   - Tiêu chuẩn xuất tệp: UTF-8 BOM, an toàn tuyệt đối chống CSV formula injection, giao diện thân thiện với tiếng Việt.

2. **Spring Boot Actuator & Health Probes:**
   - Bổ sung `spring-boot-starter-actuator` vào `pom.xml`.
   - Cấu hình chỉ công khai `/actuator/health` và `/actuator/info`.
   - Tương thích trực tiếp với Kubernetes / Docker Liveness & Readiness Probes.

3. **Giao Diện Frontend Tích Hợp (UI Enhancements):**
   - Nút "Xuất CSV Điểm Danh" trực tiếp tại trang chi tiết ca học (`AttendanceSection.tsx`).
   - Nút "Xuất báo cáo (CSV)" tại trang chi tiết lớp học (`ClassroomsSection.tsx`).
   - Hàm tải tệp thông minh `downloadFile` có gắn kèm JWT Bearer Token và tự động trích xuất tên tệp từ `Content-Disposition`.

4. **Multi-Stage Dockerfiles Chuẩn Sản Xuất (Docker & Multi-Stage Optimization):**
   - `backend/Dockerfile`: 2 giai đoạn (`eclipse-temurin:21-jdk-alpine` -> `eclipse-temurin:21-jre-alpine`), người dùng không đặc quyền `appuser (1001)`, cờ tối ưu hóa JVM container memory, healthcheck qua actuator.
   - `frontend/Dockerfile`: 3 giai đoạn (`deps` -> `builder` -> `runner`), người dùng `nextjs (1001)`, chế độ `output: "standalone"`.
   - `docker-compose.yml`: Tự động khởi chạy đồng bộ toàn bộ stack (PostgreSQL 16, Spring Boot Backend, Next.js Frontend) kèm healthchecks.

---

## 4. Báo Cáo Kết Quả Kiểm Thử (Verification & Testing)

- **Backend Test Suite (Maven Surefire):**
  - Số lượng test: 14 tests
  - Kết quả: **14 Passed / 0 Failures / 0 Errors / 0 Skipped**
  - Bao gồm: `AttendanceExportIntegrationTest`, `PlatformIntegrationTest`, `CsvSanitizerTest`, `RateLimitingFilterTest`, `AttendanceApplicationTests`.
- **Frontend Build (Next.js 16 / Turbopack):**
  - Trình biên dịch: Next.js 16.4.3 Turbopack & TypeScript 5.
  - Kết quả: **Tất cả các route tĩnh và động biên dịch thành công 100% với 0 lỗi linter/typecheck**.
- **Cloudflare Security Audit Validator:**
  - Lệnh kiểm tra: `node .agents/skills/security-audit/validate-findings.cjs findings.json`
  - Kết quả: **PASS: 5 findings valid**.

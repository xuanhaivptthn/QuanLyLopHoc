# Hệ Thống Quản Lý Lớp Học & Điểm Danh (QuanLyLopHoc)

---

## Cấu Trúc Dự Án (Project Structure)

```text
QuanLyLopHoc/
├── .agents/
│   └── skills/                   # Các kỹ năng chuẩn hóa chuyên sâu (JPA, testing, React 19, v.v.)
│       ├── java-springboot/
│       ├── java-hibernate-jpa/
│       ├── spring-boot-testing/
│       ├── postgresql-code-review/
│       ├── react19-concurrent-patterns/
│       ├── premium-frontend-ui/
│       ├── security-review/
│       └── multi-stage-dockerfile/
├── backend/                      # Spring Boot Backend REST API
│   ├── mvnw                      # Maven wrapper script
│   ├── pom.xml                   # Cấu hình phụ thuộc Spring Boot
│   └── src/
│       ├── main/
│       │   ├── java/com/attendance/
│       │   │   ├── AttendanceApplication.java
│       │   │   ├── common/       # Cấu hình bảo mật, CORS, OpenAPI & xử lý ngoại lệ
│       │   │   ├── auth/         # Xác thực JWT & phân quyền
│       │   │   ├── classroom/    # Nghiệp vụ quản lý lớp học
│       │   │   ├── student/      # Nghiệp vụ quản lý sinh viên
│       │   │   └── attendance/   # Nghiệp vụ điểm danh & ca học
│       │   └── resources/
│       │       ├── application.yml
│       │       ├── application-dev.yml
│       │       └── db/migration/ # Flyway SQL migrations
│       │           └── V1__init_schema.sql
│       └── test/                 # Kiểm thử tự động (Unit & Integration tests)
├── frontend/                     # Next.js 15+ (App Router, Tailwind CSS, TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts            # Tự động proxy /api sang backend :8080
│   └── src/
│       ├── app/                  # App Router pages & layouts
│       ├── components/           # UI components tái sử dụng
│       ├── lib/                  # Tiện ích gọi API & React Query client
│       └── types/                # TypeScript interface định nghĩa dữ liệu
├── docker-compose.yml             # Khởi chạy PostgreSQL & pgAdmin nội bộ
├── .gitignore                    # Bỏ qua các file tạm, target build, node_modules
└── README.md
```

---

## Chạy ứng dụng

### 1. Khởi động Cơ sở dữ liệu (PostgreSQL)
```bash
docker compose up -d postgres
```
*(Nếu muốn dùng giao diện quản lý DB qua trình duyệt, mở pgAdmin tại: http://localhost:5050)*

### 2. Khởi động Backend (Spring Boot)
```bash
cd backend
./mvnw spring-boot:run
```
* **API Root**: `http://localhost:8080/api`
* **Swagger UI / OpenAPI Documentation**: `http://localhost:8080/api/swagger-ui.html`

### 3. Khởi động Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
* Mở trình duyệt tại: `http://localhost:3000`

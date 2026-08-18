# ☠️ One Piece Quiz Web Application

Website trắc nghiệm One Piece hoàn chỉnh nhưng tối giản, xây dựng với **Node.js, Express.js và MySQL**.

---

## 🌟 Tính Năng Chính

### 1. Dành cho Người Chơi (Quiz Page)
- 🎯 **Trắc nghiệm trực tuyến**: Làm bài trắc nghiệm với các câu hỏi chuẩn cốt truyện One Piece (từ East Blue đến Wano).
- 📊 **Tiến độ trực quan**: Thanh tiến độ (Progress Bar), bộ đếm câu, hiển thị độ khó (Level 1 - 6) và chủ đề.
- 🧭 **Bảng điều hướng câu hỏi**: Dễ dàng chuyển qua lại giữa các câu hỏi, hiển thị rõ câu nào đã làm/chưa làm.
- 🔒 **Chấm điểm bảo mật trên Server**: API Public **tuyệt đối không trả về đáp án đúng** (`correct_answer`), ngăn chặn gian lận qua Inspect/F12.
- 🏆 **Xếp hạng Hải Tặc & Lời giải chi tiết**: Sau khi nộp bài, hiển thị điểm số, tỷ lệ %, danh hiệu One Piece (Joy Boy, Yonko, Pirate, Rookie...) cùng bảng đối chiếu đáp án và giải thích chi tiết.

### 2. Dành cho Quản Trị Viên (Admin Dashboard)
- 🔐 **Đăng nhập quản trị**: Xác thực bảo mật qua JWT Token, cấu hình tài khoản qua `.env`.
- 📋 **Quản lý câu hỏi (CRUD)**:
  - Xem danh sách câu hỏi kèm đáp án đúng.
  - Tìm kiếm câu hỏi nhanh theo từ khóa hoặc chủ đề.
  - Thêm câu hỏi mới với form phân loại chủ đề, độ khó, giải thích.
  - Chỉnh sửa câu hỏi linh hoạt.
  - Xóa câu hỏi với hộp thoại xác nhận an toàn.

---

## 🏗️ Cấu Trúc Dự Án

```text
Onepiece/
├── public/                  # Frontend tĩnh (HTML/CSS/JS thuần)
│   ├── index.html           # Giao diện làm Quiz cho người chơi
│   ├── admin.html           # Giao diện quản trị Admin Dashboard
│   ├── login.html           # Giao diện đăng nhập Admin
│   ├── css/
│   │   └── style.css        # CSS giao diện hiện đại, responsive
│   └── js/
│       ├── quiz.js          # Logic làm quiz, nộp bài, xem kết quả
│       ├── admin.js         # Logic CRUD câu hỏi, bảo mật token
│       └── login.js         # Logic đăng nhập admin
│
├── server/                  # Backend Express.js
│   ├── server.js            # Entry point của ứng dụng
│   ├── db.js                # Kết nối MySQL Pool (mysql2/promise)
│   ├── middleware/
│   │   └── auth.js          # Middleware xác thực JWT Admin
│   └── routes/
│       ├── questions.js     # Public API (Lấy câu hỏi, Nộp bài)
│       └── admin.js         # Admin API (Đăng nhập, CRUD câu hỏi)
│
├── database/
│   └── schema.sql           # Khởi tạo bảng & nạp 12 câu hỏi gốc
│
├── .env.example             # File mẫu biến môi trường
├── .env                     # File biến môi trường (không commit)
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Local

### Yêu Cầu Hệ Thống:
- [Node.js](https://nodejs.org/) (phiên bản 18 trở lên)
- [MySQL Server](https://dev.mysql.com/downloads/installer/) hoặc XAMPP / Laragon / Docker MySQL

### Các Bước Thực Hiện:

#### Bước 1: Cài đặt Dependencies
Mở Terminal tại thư mục dự án và chạy:
```bash
npm install
```

#### Bước 2: Tạo Cơ Sở Dữ Liệu & Import Dữ Liệu Mẫu

**Cách 1: Tự động qua Node.js (Khuyên dùng - nhanh nhất):**
```bash
npm run db:init
```

**Cách 2: Sử dụng PowerShell trên Windows:**
```powershell
Get-Content database/schema.sql -Raw | mysql -u root -p
```
*(Hoặc trong Command Prompt `cmd`)*:
```cmd
mysql -u root -p < database/schema.sql
```

**Cách 3: Chạy trực tiếp trong MySQL Workbench / phpMyAdmin / Navicat:**
- Mở file `database/schema.sql` và nhấn **Execute (Chạy toàn bộ script)**.

#### Bước 3: Cấu hình Biến Môi Trường (`.env`)
Tạo file `.env` trong thư mục gốc (hoặc sao chép từ `.env.example`):
```env
PORT=3000

# Cấu hình MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=quiz_db

# Tài khoản Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Khóa bảo mật JWT
JWT_SECRET=super_secret_quiz_jwt_key_2026_onepiece
```

#### Bước 4: Khởi Chạy Ứng Dụng
```bash
# Chạy ở chế độ Production:
npm start

# Hoặc chạy ở chế độ Development (tự động reload khi sửa code):
npm run dev
```

#### Bước 5: Trải Nghiệm Website
- **Trang làm bài Quiz**: Mở trình duyệt truy cập: [http://localhost:3000](http://localhost:3000)
- **Trang Quản trị Admin**: Truy cập: [http://localhost:3000/admin](http://localhost:3000/admin) (hoặc [http://localhost:3000/login](http://localhost:3000/login))
  - *Tài khoản mặc định*: `admin` / `admin123` (hoặc cấu hình trong `.env`)

---

## 🌐 Hướng Dẫn Deployment (Triển Khai Lên Internet)

Hệ thống được thiết kế hoàn toàn không phụ thuộc vào đường dẫn local hay `localhost`, sẵn sàng deploy lên các nền tảng đám mây:

### Cách 1: Deploy lên Railway (Khuyên dùng - Có sẵn MySQL)
1. Đăng ký tài khoản tại [Railway.app](https://railway.app/).
2. Nhấn **New Project** -> **Provision MySQL** để tạo một MySQL Database trên mây.
3. Import file `database/schema.sql` vào MySQL vừa tạo qua tab *Data* hoặc kết nối client.
4. Nhấn **New Service** -> **GitHub Repo** (hoặc upload source code).
5. Trong phần **Variables** của Web Service, thêm các biến môi trường:
   - `PORT=3000`
   - `DB_HOST=${{MySQL.MYSQLHOST}}`
   - `DB_PORT=${{MySQL.MYSQLPORT}}`
   - `DB_USER=${{MySQL.MYSQLUSER}}`
   - `DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}`
   - `DB_NAME=${{MySQL.MYSQLDATABASE}}`
   - `ADMIN_USERNAME=admin`
   - `ADMIN_PASSWORD=mat_khau_bao_mat_cua_ban`
   - `JWT_SECRET=mot_chuoi_ngau_nhien_dai`
6. Nhấn **Generate Domain** để nhận đường dẫn website trực tuyến.

### Cách 2: Deploy lên Render + TiDB / Aiven MySQL
1. Tạo MySQL database miễn phí trên [Aiven.io](https://aiven.io/) hoặc [TiDB Cloud](https://tidbcloud.com/), import `database/schema.sql`.
2. Tạo Web Service mới trên [Render.com](https://render.com/), chọn repository của bạn.
3. Cấu hình:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Cài đặt các **Environment Variables** tương ứng với database credentials.

### Cách 3: Deploy lên VPS (Ubuntu / Debian + Nginx + PM2)
```bash
# 1. Cài đặt Node.js, PM2, MySQL Server, Nginx
sudo apt update && sudo apt install -y nodejs npm mysql-server nginx
sudo npm install -g pm2

# 2. Tạo database & import schema
sudo mysql < database/schema.sql

# 3. Clone source code, cài dependencies & cấu hình .env
cd /var/www/onepiece-quiz
npm install
nano .env

# 4. Khởi chạy với PM2
pm2 start server/server.js --name "onepiece-quiz"
pm2 startup
pm2 save

# 5. Cấu hình Nginx Reverse Proxy trỏ domain về http://localhost:3000
```

---

## 📡 Tài Liệu REST API

### 1. API Người Chơi (Public)
| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/questions` | Lấy danh sách câu hỏi (không có `correct_answer`) |
| `POST` | `/api/quiz/submit` | Nộp bài làm `{ answers: { "1": "C", "2": "A" } }` và nhận kết quả chấm điểm |

### 2. API Quản Trị (Admin)
*Yêu cầu header `Authorization: Bearer <TOKEN>` (trừ endpoint login).*

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `POST` | `/api/admin/login` | Đăng nhập `{ username, password }` nhận JWT Token |
| `GET` | `/api/admin/me` | Kiểm tra token hợp lệ |
| `GET` | `/api/admin/questions` | Lấy toàn bộ câu hỏi (kèm đáp án đúng) |
| `POST` | `/api/admin/questions` | Thêm một câu hỏi mới |
| `PUT` | `/api/admin/questions/:id` | Cập nhật câu hỏi theo ID |
| `DELETE` | `/api/admin/questions/:id` | Xóa câu hỏi theo ID |

---

## 🛡️ Tiêu Chuẩn Bảo Mật Đã Áp Dụng
- ✅ **Chống rò rỉ đáp án**: Frontend và người chơi không thể xem trước đáp án đúng từ API public.
- ✅ **Chống SQL Injection**: Sử dụng Parameterized Queries (`?` placeholders) của `mysql2` cho toàn bộ truy vấn.
- ✅ **Bảo vệ API Admin**: Xác thực qua JWT có thời hạn, middleware chặn mọi request trái phép (401/403).
- ✅ **Bảo mật cấu hình**: Mọi thông tin nhạy cảm (DB password, admin credentials, JWT secret) đều đọc từ `.env`, có sẵn `.gitignore`.
- ✅ **Chống XSS**: Toàn bộ dữ liệu hiển thị trên frontend đều được escape HTML an toàn.

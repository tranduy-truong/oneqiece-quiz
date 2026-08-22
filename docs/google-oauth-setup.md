# HƯỚNG DẪN CẤU HÌNH GOOGLE OAUTH 2.0 CHO ONE PIECE QUIZ

Tài liệu này hướng dẫn chi tiết từng bước để tạo và tích hợp Google OAuth 2.0 Client ID vào hệ thống **ONE PIECE QUIZ**, cho phép người chơi đăng nhập bằng 1 chạm thông qua tài khoản Google.

---

## 1. TẠO GOOGLE CLOUD PROJECT

1. Truy cập vào **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Đăng nhập bằng tài khoản Google của bạn.
3. Ở thanh tiêu đề trên cùng, bấm chọn **Select a project** -> Bấm **New Project** (Dự án mới).
4. Đặt tên dự án: `OnePiece-Quiz-Platform` -> Bấm **Create**.

---

## 2. CẤU HÌNH OAUTH CONSENT SCREEN (MÀN HÌNH XÁC NHẬN)

1. Ở menu bên trái, vào **APIs & Services** -> Chọn **OAuth consent screen** (Màn hình đồng ý OAuth).
2. Chọn **User Type**:
   - Chọn **External** (Người dùng ngoài) -> Bấm **Create**.
3. Điền thông tin ứng dụng:
   - **App name**: `ONE PIECE QUIZ`
   - **User support email**: Chọn email của bạn.
   - **Developer contact information**: Nhập email của bạn.
4. Bấm **Save and Continue** qua các bước Scopes (chọn mặc định `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`).
5. Ở mục **Test users**, bạn có thể thêm các email Gmail muốn dùng để test khi ứng dụng đang ở chế độ Testing.
6. Bấm **Save and Continue** để hoàn tất.

---

## 3. TẠO OAUTH 2.0 CLIENT CREDENTIALS

1. Ở menu bên trái, vào **APIs & Services** -> Chọn **Credentials** (Thông tin xác thực).
2. Bấm **+ CREATE CREDENTIALS** ở trên cùng -> Chọn **OAuth client ID**.
3. **Application type**: Chọn **Web application**.
4. **Name**: `One Piece Web Client`.
5. **Authorized JavaScript origins (Nguồn gốc JavaScript được phép)**:
   - Thêm URL môi trường chạy cục bộ (Local):
     `http://localhost:3000`
   - Thêm URL môi trường Production (Render):
     `https://oneqiece-quiz.onrender.com`
6. **Authorized redirect URIs (URI chuyển hướng được phép)**:
   - Thêm URL Local:
     `http://localhost:3000/api/auth/google/callback`
   - Thêm URL Production:
     `https://oneqiece-quiz.onrender.com/api/auth/google/callback`
7. Bấm **CREATE**.
8. Một bảng thông báo sẽ hiện ra chứa:
   - **Client ID** (dạng: `xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com`)
   - **Client Secret** (dạng: `GOCSPX-xxxxxxxxxxxxxxxxxxxx`)

---

## 4. CẤU HÌNH VÀO BIẾN MÔI TRƯỜNG DỰ ÁN

### Trên môi trường Local (.env):
Mở file `.env` và điền:
```env
APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxx
```

### Trên môi trường Render (Production):
1. Đăng nhập vào [Dashboard Render](https://dashboard.render.com/).
2. Chọn Web Service `oneqiece-quiz`.
3. Vào mục **Environment** -> Thêm các biến môi trường:
   - `APP_URL` = `https://oneqiece-quiz.onrender.com`
   - `GOOGLE_CLIENT_ID` = `xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   - `GOOGLE_CLIENT_SECRET` = `GOCSPX-xxxxxxxxxxxxxxxxxxxx`
   - `SMTP_USER` = `your_email@gmail.com`
   - `SMTP_PASSWORD` = `your_16_digit_app_password`
4. Bấm **Save Changes** để Render tự động redeploy phiên bản mới.

---

## 5. CẤU HÌNH GMAIL APP PASSWORD ĐỂ GỬI EMAIL XÁC THỰC

1. Truy cập [Google Account Security](https://myaccount.google.com/security).
2. Bật **Xác thực 2 bước (2-Step Verification)** nếu chưa bật.
3. Truy cập vào [Mật khẩu ứng dụng (App Passwords)](https://myaccount.google.com/apppasswords).
4. Đặt tên: `OnePieceQuizEmail` -> Bấm **Tạo**.
5. Copy mật khẩu 16 chữ cái (dạng `abcd efgh ijkl mnop`) và dán vào biến `SMTP_PASSWORD` trong file `.env`.

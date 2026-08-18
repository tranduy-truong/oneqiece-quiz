const express = require('express');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./db');
const questionRoutes = require('./routes/questions');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware phân tích JSON và Form body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ file tĩnh từ thư mục public
app.use(express.static(path.join(__dirname, '../public')));

// Đăng ký API Routes
app.use('/api/questions', questionRoutes);
app.use('/api/quiz', questionRoutes); // Cho phép gọi cả /api/quiz/submit
app.use('/api/admin', adminRoutes);

// Đăng ký Route điều hướng trang HTML thân thiện
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Xử lý 404 cho API
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint không tồn tại.'
    });
});

// Route mặc định về index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        success: false,
        error: 'Đã xảy ra lỗi trên máy chủ.'
    });
});

// Khởi động server
app.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(`🚀 ONE PIECE QUIZ APP ĐANG CHẠY TẠI: http://localhost:${PORT}`);
    console.log(`📌 Trang chủ Quiz : http://localhost:${PORT}`);
    console.log(`📌 Quản trị Admin: http://localhost:${PORT}/admin`);
    console.log(`====================================================`);
    
    // Kiểm tra kết nối MySQL
    await testConnection();
});

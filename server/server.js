const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./db');
const setupSocketIO = require('./socket');

const topicRoutes = require('./routes/topics');
const quizRoutes = require('./routes/quizzes');
const questionRoutes = require('./routes/questions');
const soloRoutes = require('./routes/solo');
const leaderboardRoutes = require('./routes/leaderboard');
const musicRoutes = require('./routes/music');
const avatarRoutes = require('./routes/avatars');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3000;

// Setup Socket.IO Event Gateway
setupSocketIO(io);

// Middleware phân tích JSON và Form body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Phục vụ file tĩnh từ thư mục public và uploads
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Đăng ký API Routes
app.use('/api/topics', topicRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/quiz', questionRoutes);
app.use('/api/solo', soloRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/player', leaderboardRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/avatars', avatarRoutes);
app.use('/api/admin', adminRoutes);

// Đăng ký Route điều hướng trang HTML thân thiện
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/solo', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/solo.html'));
});

app.get('/join', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/join.html'));
});

app.get('/host', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/host.html'));
});

app.get('/leaderboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/leaderboard.html'));
});

// Xử lý 404 cho API
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint không tồn tại.'
    });
});

// Route mặc định về index.html (SPA Hub)
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
server.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(`🚀 REALTIME QUIZ PLATFORM ĐANG CHẠY TẠI: http://localhost:${PORT}`);
    console.log(`📌 Trang chủ Quiz      : http://localhost:${PORT}`);
    console.log(`📌 Solo / Luyện tập    : http://localhost:${PORT}/solo`);
    console.log(`📌 Tham gia phòng (Join): http://localhost:${PORT}/join`);
    console.log(`📌 Host tạo phòng      : http://localhost:${PORT}/host`);
    console.log(`📌 Bảng xếp hạng Global: http://localhost:${PORT}/leaderboard`);
    console.log(`📌 Quản trị Admin      : http://localhost:${PORT}/admin`);
    console.log(`====================================================`);
    
    // Kiểm tra kết nối MySQL & Khởi tạo schema
    await testConnection();
});

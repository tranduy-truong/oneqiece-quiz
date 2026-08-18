const mysql = require('mysql2/promise');
require('dotenv').config();

// Tạo connection pool tới MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quiz_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

// Hàm kiểm tra kết nối khi khởi động
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Đã kết nối thành công tới MySQL Database:', process.env.DB_NAME || 'quiz_db');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Không thể kết nối tới MySQL Database:');
        console.error('   Lỗi:', error.message);
        console.error('   👉 Hãy kiểm tra lại file .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) và đảm bảo MySQL đang chạy.');
        return false;
    }
}

module.exports = {
    pool,
    testConnection
};

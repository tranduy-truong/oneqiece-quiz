const mysql = require('mysql2/promise');
require('dotenv').config();

// Hỗ trợ cả tên biến có tiền tố DB_ và không có tiền tố để tránh nhầm lẫn
const dbHost = process.env.DB_HOST || process.env.HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || process.env.PORT_DB, 10) || 4000;
const dbUser = process.env.DB_USER || process.env.DB_USERNAME || process.env.USERNAME || 'root';
const dbPassword = process.env.DB_PASSWORD || process.env.PASSWORD || '';
const dbName = process.env.DB_NAME || process.env.DATABASE || 'quiz_db';

// Cấu hình SSL cho Cloud MySQL (như TiDB Cloud, Aiven, Clever Cloud)
const isCloudDB = Boolean(
    process.env.DB_SSL === 'true' || 
    (dbHost && dbHost.includes('tidbcloud.com')) ||
    (dbHost && dbHost.includes('aivencloud.com'))
);

// Tạo connection pool tới MySQL
const pool = mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    ssl: isCloudDB ? { rejectUnauthorized: false } : undefined
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

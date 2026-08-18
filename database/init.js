const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function initDatabase() {
    console.log('🚀 Bắt đầu khởi tạo cơ sở dữ liệu Quiz từ schema.sql...');

    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT, 10) || 3306;
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'quiz_db';

    let connection;
    try {
        // 1. Kết nối tới MySQL Server (chưa chỉ định database)
        connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            multipleStatements: true
        });

        console.log(`✅ Kết nối thành công tới MySQL Server (${host}:${port})`);

        // 2. Đọc file schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        // 3. Thực thi toàn bộ lệnh SQL trong schema.sql
        console.log('⏳ Đang tạo Database, Bảng và nạp dữ liệu câu hỏi...');
        await connection.query(sql);

        console.log(`🎉 Khởi tạo Database [${database}] thành công! Đã nạp đầy đủ 12 câu hỏi One Piece.`);
        console.log('👉 Bây giờ bạn có thể chạy: npm start');
    } catch (error) {
        console.error('❌ Lỗi khi khởi tạo Database:');
        console.error('   Chi tiết:', error.message);
        console.error('\n👉 Gợi ý: Hãy kiểm tra file .env xem mật khẩu (DB_PASSWORD) và user (DB_USER) của MySQL đã đúng chưa.');
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

initDatabase();

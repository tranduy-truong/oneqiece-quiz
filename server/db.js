const mysql = require('mysql2/promise');
require('dotenv').config();

// 12 câu hỏi gốc chuẩn One Piece để tự động nạp (Auto-Seed) nếu bảng trống
const defaultQuestions = [
    {
        id: 1,
        question_text: 'Ai là thành viên đầu tiên gia nhập băng hải tặc Mũ Rơm?',
        option_a: 'Nami', option_b: 'Usopp', option_c: 'Roronoa Zoro', option_d: 'Sanji',
        correct_answer: 'C',
        explanation: 'Zoro là thành viên đầu tiên Luffy chiêu mộ tại Shells Town sau khi cứu anh khỏi Đại tá Morgan.',
        category: 'Nhân vật', difficulty: 1
    },
    {
        id: 2,
        question_text: 'Trái ác quỷ Gomu Gomu no Mi thực chất có tên thật là gì?',
        option_a: 'Hito Hito no Mi, Model: Nika', option_b: 'Mera Mera no Mi', option_c: 'Yomi Yomi no Mi', option_d: 'Bari Bari no Mi',
        correct_answer: 'A',
        explanation: 'Ngũ Lão Tinh đã tiết lộ trái Gomu Gomu thực chất là trái Zoan Thần Thoại Hito Hito no Mi, Model: Nika.',
        category: 'Trái Ác Quỷ', difficulty: 1
    },
    {
        id: 3,
        question_text: 'Vương quốc Alabasta được bảo vệ bởi vị thần hộ mệnh mang năng lực Trái Ác Quỷ gì?',
        option_a: 'Chó sói', option_b: 'Chim ưng (Falcon)', option_c: 'Báo đốm', option_d: 'Sư tử',
        correct_answer: 'B',
        explanation: 'Pell sở hữu trái Tori Tori no Mi, Model: Falcon. Anh cùng với Chaka (Jackal) là hai thần hộ mệnh của Alabasta.',
        category: 'Arc', difficulty: 2
    },
    {
        id: 4,
        question_text: 'Trụ sở chính của Hải Quân (Marineford) ban đầu nằm ở đâu?',
        option_a: 'Tân Thế Giới', option_b: 'Biển Đông (East Blue)', option_c: 'Nửa đầu Grand Line (Paradise)', option_d: 'Calm Belt',
        correct_answer: 'C',
        explanation: 'Marineford ban đầu nằm ở Paradise. Sau timeskip, Akainu đã đổi vị trí Marineford với chi nhánh G-1 ở Tân Thế Giới.',
        category: 'Hải quân', difficulty: 2
    },
    {
        id: 5,
        question_text: 'Rayleigh đã hướng dẫn Luffy học Haki trên hòn đảo nào?',
        option_a: 'Sabaody Archipelago', option_b: 'Amazon Lily', option_c: 'Rusukaina', option_d: 'Punk Hazard',
        correct_answer: 'C',
        explanation: 'Rusukaina là hòn đảo có thời tiết thay đổi 48 mùa một năm, nằm gần Amazon Lily, nơi Rayleigh huấn luyện Luffy trong 1.5 năm.',
        category: 'Haki', difficulty: 3
    },
    {
        id: 6,
        question_text: 'Vũ khí cổ đại Pluton được miêu tả là gì?',
        option_a: 'Một nàng tiên cá', option_b: 'Một trái ác quỷ', option_c: 'Một hòn đảo', option_d: 'Một chiến hạm khổng lồ',
        correct_answer: 'D',
        explanation: 'Pluton là một chiến hạm khổng lồ có sức mạnh hủy diệt một hòn đảo trong một phát bắn. Bản vẽ của nó từng được Franky giữ.',
        category: 'Vũ Khí Cổ Đại', difficulty: 3
    },
    {
        id: 7,
        question_text: 'Trên Skypiea, Gol D. Roger đã để lại một thông điệp trên khối Poneglyph bằng ngôn ngữ cổ đại. Ai là người đã khắc thông điệp đó cho Roger?',
        option_a: 'Silvers Rayleigh', option_b: 'Kozuki Oden', option_c: 'Clover', option_d: 'Nico Robin',
        correct_answer: 'B',
        explanation: 'Trong đoạn flashback, chính Kozuki Oden, người có khả năng đọc và khắc văn tự cổ của gia tộc Kozuki, đã khắc dòng chữ đó cho Roger.',
        category: 'Lore', difficulty: 4
    },
    {
        id: 8,
        question_text: 'Tên thật của \'Râu Đen\' (Blackbeard) là gì?',
        option_a: 'Marshall D. Teach', option_b: 'Rocks D. Xebec', option_c: 'Gol D. Teach', option_d: 'Jaguar D. Saul',
        correct_answer: 'A',
        explanation: 'Tên đầy đủ của Râu Đen là Marshall D. Teach, một người mang ý chí của D.',
        category: 'Nhân vật', difficulty: 4
    },
    {
        id: 9,
        question_text: 'Ai là người ĐẦU TIÊN đề cập đến cái tên \'Sun God Nika\' trong mạch truyện chính của Manga?',
        option_a: 'Gorosei (Ngũ Lão Tinh)', option_b: 'Who\'s-Who', option_c: 'Vegapunk', option_d: 'Jinbe',
        correct_answer: 'B',
        explanation: 'Who\'s-Who đã hỏi Jinbe về truyền thuyết Sun God Nika mà hắn nghe được từ một lính canh khi bị giam ở Impel Down.',
        category: 'Lore', difficulty: 5
    },
    {
        id: 10,
        question_text: 'Có tổng cộng bao nhiêu khối Road Poneglyph (Poneglyph Đỏ) trên thế giới dùng để chỉ đường đến Laugh Tale?',
        option_a: '3', option_b: '4', option_c: '7', option_d: '9',
        correct_answer: 'B',
        explanation: 'Có đúng 4 khối Road Poneglyph. Khi xác định được vị trí giao nhau của 4 tọa độ từ 4 khối này, đó chính là Laugh Tale.',
        category: 'Poneglyph', difficulty: 5
    },
    {
        id: 11,
        question_text: 'Mức truy nã chính xác của Vua Hải Tặc Gol D. Roger là bao nhiêu?',
        option_a: '5,046,000,000 Berries', option_b: '5,564,800,000 Berries', option_c: '4,388,000,000 Berries', option_d: '5,600,000,000 Berries',
        correct_answer: 'B',
        explanation: 'Tiền truy nã của Roger là 5,564,800,000. Của Râu Trắng là 5,046,000,000 (đáp án A).',
        category: 'Lịch sử', difficulty: 6
    },
    {
        id: 12,
        question_text: 'Số hiệu tù nhân của Luffy tại mỏ đá Udon (Wano) là bao nhiêu?',
        option_a: '312', option_b: '5592', option_c: '9412', option_d: '1520',
        correct_answer: 'B',
        explanation: 'Số hiệu tù nhân của Luffy ở Udon là 5592, Kid là 3150.',
        category: 'Chi tiết nhỏ', difficulty: 6
    }
];

// Hỗ trợ cả tên biến có tiền tố DB_ và không có tiền tố để tránh nhầm lẫn
const dbHost = process.env.DB_HOST || process.env.HOST || 'localhost';
const defaultPort = dbHost.includes('tidbcloud.com') ? 4000 : 3306;
const dbPort = parseInt(process.env.DB_PORT || process.env.PORT_DB, 10) || defaultPort;
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

// Tự động khởi tạo bảng questions và seed dữ liệu nếu bảng chưa tồn tại
async function ensureTablesExist(connection) {
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`questions\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`question_text\` TEXT NOT NULL,
                \`option_a\` TEXT NOT NULL,
                \`option_b\` TEXT NOT NULL,
                \`option_c\` TEXT NOT NULL,
                \`option_d\` TEXT NOT NULL,
                \`correct_answer\` ENUM('A', 'B', 'C', 'D') NOT NULL,
                \`explanation\` TEXT NULL,
                \`category\` VARCHAR(100) DEFAULT 'Chung',
                \`difficulty\` INT DEFAULT 1,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        const [rows] = await connection.query('SELECT COUNT(*) as count FROM `questions`');
        if (rows[0].count === 0) {
            console.log('🌱 Database đang trống, tiến hành nạp tự động 12 câu hỏi One Piece...');
            for (const q of defaultQuestions) {
                await connection.query(
                    `INSERT INTO \`questions\` 
                    (\`id\`, \`question_text\`, \`option_a\`, \`option_b\`, \`option_c\`, \`option_d\`, \`correct_answer\`, \`explanation\`, \`category\`, \`difficulty\`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE \`question_text\` = VALUES(\`question_text\`)`,
                    [q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.explanation, q.category, q.difficulty]
                );
            }
            console.log('🎉 Đã nạp thành công 12 câu hỏi vào database!');
        }
    } catch (err) {
        console.error('Lỗi khi tự động khởi tạo bảng/seed dữ liệu:', err.message);
    }
}

// Hàm kiểm tra kết nối khi khởi động
async function testConnection() {
    console.log(`📡 Đang kết nối tới MySQL: Host=[${dbHost}], Port=[${dbPort}], User=[${dbUser}], DB=[${dbName}], SSL=[${isCloudDB}]`);
    try {
        const connection = await pool.getConnection();
        console.log(`✅ ĐÃ KẾT NỐI THÀNH CÔNG TỚI DATABASE: [${dbName}]!`);
        await ensureTablesExist(connection);
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ KHÔNG THỂ KẾT NỐI DATABASE:');
        console.error('   Chi tiết lỗi:', error.message);
        return false;
    }
}

module.exports = {
    pool,
    testConnection
};

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

// Hỗ trợ cấu hình DB
const dbHost = process.env.DB_HOST || process.env.HOST || 'localhost';
const defaultPort = dbHost.includes('tidbcloud.com') ? 4000 : 3306;
const dbPort = parseInt(process.env.DB_PORT || process.env.PORT_DB, 10) || defaultPort;
const dbUser = process.env.DB_USER || process.env.DB_USERNAME || process.env.USERNAME || 'root';
const dbPassword = process.env.DB_PASSWORD || process.env.PASSWORD || '';
const dbName = process.env.DB_NAME || process.env.DATABASE || 'quiz_db';

const isCloudDB = Boolean(
    process.env.DB_SSL === 'true' || 
    (dbHost && dbHost.includes('tidbcloud.com')) ||
    (dbHost && dbHost.includes('aivencloud.com'))
);

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

// Tự động khởi tạo & migrate các bảng đầy đủ
async function ensureTablesExist(connection) {
    try {
        // 1. Topics Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`topics\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`name\` VARCHAR(255) NOT NULL,
                \`slug\` VARCHAR(255) NOT NULL UNIQUE,
                \`description\` TEXT,
                \`icon\` VARCHAR(255) DEFAULT '⚓',
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 2. Quizzes Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`quizzes\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`topic_id\` INT NOT NULL,
                \`title\` VARCHAR(255) NOT NULL,
                \`slug\` VARCHAR(255) NOT NULL,
                \`description\` TEXT,
                \`time_per_question\` INT DEFAULT 15,
                \`total_questions\` INT DEFAULT 20,
                \`is_random\` BOOLEAN DEFAULT TRUE,
                \`random_answers\` BOOLEAN DEFAULT FALSE,
                \`status\` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'PUBLISHED',
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. Questions Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`questions\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`quiz_id\` INT NULL,
                \`topic_id\` INT NULL,
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

        // Auto-migrate missing columns on existing questions table
        try {
            await connection.query('ALTER TABLE `questions` ADD COLUMN `quiz_id` INT NULL AFTER `id`');
        } catch (e) {}
        try {
            await connection.query('ALTER TABLE `questions` ADD COLUMN `topic_id` INT NULL AFTER `quiz_id`');
        } catch (e) {}

        // 4. Players Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`players\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`username\` VARCHAR(100) NOT NULL,
                \`session_token\` VARCHAR(255) NOT NULL UNIQUE,
                \`avatar\` VARCHAR(255) DEFAULT '/images/A.jpg',
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`last_active\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 5. Rooms Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`rooms\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`room_code\` VARCHAR(16) NOT NULL UNIQUE,
                \`host_session_token\` VARCHAR(255) NOT NULL,
                \`quiz_id\` INT NOT NULL,
                \`status\` ENUM('WAITING', 'STARTING', 'IN_GAME', 'FINISHED', 'CANCELLED') DEFAULT 'WAITING',
                \`max_players\` INT DEFAULT 50,
                \`is_public\` BOOLEAN DEFAULT TRUE,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 6. Game Sessions Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`game_sessions\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`room_id\` INT NULL,
                \`quiz_id\` INT NOT NULL,
                \`mode\` ENUM('MULTIPLAYER', 'SOLO', 'PRACTICE') DEFAULT 'MULTIPLAYER',
                \`total_questions_count\` INT DEFAULT 20,
                \`started_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`finished_at\` TIMESTAMP NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 7. Game Session Questions (Immutable Snapshot)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`game_session_questions\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`game_session_id\` INT NOT NULL,
                \`question_order\` INT NOT NULL,
                \`original_question_id\` INT NULL,
                \`question_text\` TEXT NOT NULL,
                \`option_a\` TEXT NOT NULL,
                \`option_b\` TEXT NOT NULL,
                \`option_c\` TEXT NOT NULL,
                \`option_d\` TEXT NOT NULL,
                \`correct_answer\` ENUM('A', 'B', 'C', 'D') NOT NULL,
                \`explanation\` TEXT,
                \`category\` VARCHAR(100) DEFAULT 'Chung',
                \`difficulty\` INT DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 8. Game Player Answers Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`game_player_answers\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`game_session_id\` INT NOT NULL,
                \`player_id\` INT NOT NULL,
                \`question_order\` INT NOT NULL,
                \`selected_answer\` ENUM('A', 'B', 'C', 'D') NULL,
                \`is_correct\` BOOLEAN DEFAULT FALSE,
                \`response_time_ms\` INT DEFAULT 0,
                \`score_awarded\` INT DEFAULT 0,
                \`answered_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 9. Game Player Results Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`game_player_results\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`game_session_id\` INT NOT NULL,
                \`player_id\` INT NOT NULL,
                \`total_score\` INT DEFAULT 0,
                \`correct_count\` INT DEFAULT 0,
                \`wrong_count\` INT DEFAULT 0,
                \`accuracy\` FLOAT DEFAULT 0,
                \`avg_response_time_ms\` INT DEFAULT 0,
                \`final_rank\` INT DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 10. Music Tracks Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`music_tracks\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`title\` VARCHAR(255) NOT NULL,
                \`youtube_video_id\` VARCHAR(32) NOT NULL,
                \`youtube_url\` VARCHAR(500) NOT NULL,
                \`category\` VARCHAR(100) DEFAULT 'Gaming',
                \`thumbnail_url\` VARCHAR(500) NULL,
                \`status\` ENUM('PUBLISHED', 'DRAFT') DEFAULT 'PUBLISHED',
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 11. Warrior Avatars Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`avatars\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`name\` VARCHAR(100) NOT NULL,
                \`image_url\` VARCHAR(500) NOT NULL,
                \`is_default\` BOOLEAN DEFAULT FALSE,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Seed Default Avatars if empty
        const [avatarRows] = await connection.query('SELECT COUNT(*) as count FROM `avatars`');
        if (avatarRows[0].count === 0) {
            await connection.query(`
                INSERT INTO \`avatars\` (\`name\`, \`image_url\`, \`is_default\`)
                VALUES 
                ('Luffy', '/images/A.jpg', TRUE),
                ('Zoro', '/images/B.jpg', TRUE),
                ('Nami', '/images/C.jpg', TRUE),
                ('Sanji', '/images/D.jpg', TRUE)
            `);
        }

        // Seed Default Music Tracks if empty
        const [musicRows] = await connection.query('SELECT COUNT(*) as count FROM `music_tracks`');
        if (musicRows[0].count === 0) {
            await connection.query(`
                INSERT INTO \`music_tracks\` (\`title\`, \`youtube_video_id\`, \`youtube_url\`, \`category\`, \`thumbnail_url\`, \`status\`)
                VALUES 
                ('One Piece - Overtaken (Epic Battle OST)', '8A_h_OQ3Kk8', 'https://www.youtube.com/watch?v=8A_h_OQ3Kk8', 'Epic', 'https://img.youtube.com/vi/8A_h_OQ3Kk8/hqdefault.jpg', 'PUBLISHED'),
                ('One Piece - We Are! (Acoustic / Lofi Remix)', 'da3W4h4xK6E', 'https://www.youtube.com/watch?v=da3W4h4xK6E', 'Lo-fi', 'https://img.youtube.com/vi/da3W4h4xK6E/hqdefault.jpg', 'PUBLISHED'),
                ('Gaming Chill / Study Beats (Instrumental)', 'jfKfPfyJRdk', 'https://www.youtube.com/watch?v=jfKfPfyJRdk', 'Chill', 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg', 'PUBLISHED'),
                ('One Piece - The Very, Very Strongest (Battle Theme)', '4J7K3yacig4', 'https://www.youtube.com/watch?v=4J7K3yacig4', 'Gaming', 'https://img.youtube.com/vi/4J7K3yacig4/hqdefault.jpg', 'PUBLISHED')
            `);
        }

        // 12. Site Settings Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`site_settings\` (
                \`key_name\` VARCHAR(100) PRIMARY KEY,
                \`value_content\` TEXT NOT NULL,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Seed Default Site Settings if empty
        const [settingsRows] = await connection.query('SELECT COUNT(*) as count FROM `site_settings`');
        if (settingsRows[0].count === 0) {
            await connection.query(`
                INSERT INTO \`site_settings\` (\`key_name\`, \`value_content\`)
                VALUES 
                ('banner_image', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop'),
                ('hero_title', 'HÃY CHỨNG MINH BẠN KHÔNG PHẢI LÀ LARPER!'),
                ('hero_subtitle', 'Đấu trường trắc nghiệm One Piece & Công Nghệ trực tuyến. Thử thách kiến thức thực chiến, tốc độ phản xạ và vươn lên đỉnh bảng vàng danh dự!'),
                ('site_name', 'ONE PIECE QUIZ'),
                ('primary_color', '#38bdf8')
                ON DUPLICATE KEY UPDATE \`value_content\` = VALUES(\`value_content\`)
            `);
        }

        // Nạp Default Topics nếu chưa có
        await connection.query(`
            INSERT INTO \`topics\` (\`id\`, \`name\`, \`slug\`, \`description\`, \`icon\`)
            VALUES 
            (1, 'One Piece Universe', 'one-piece-universe', 'Vũ trụ thế giới One Piece, Hải tặc, Hải quân và Trái Ác Quỷ', '⚓'),
            (2, 'Lập Trình & Công Nghệ', 'lap-trinh-cong-nghe', 'Thử thách kiến thức Lập trình Web, JavaScript, Database và Network', '💻')
            ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);
        `);

        // Nạp Default Quizzes nếu chưa có
        await connection.query(`
            INSERT INTO \`quizzes\` (\`id\`, \`topic_id\`, \`title\`, \`slug\`, \`description\`, \`time_per_question\`, \`total_questions\`, \`is_random\`, \`status\`)
            VALUES 
            (1, 1, 'Đại Thử Thách One Piece - Chống Larper', 'one-piece-grand-test', 'Thử thách kiến thức One Piece từ cơ bản đến cực khó (20 câu hỏi).', 15, 20, TRUE, 'PUBLISHED'),
            (2, 2, 'Kiến Thức Lập Trình Cơ Bản', 'lap-trinh-co-ban', 'Các câu hỏi thú vị về JavaScript, Web và Công nghệ.', 15, 20, TRUE, 'PUBLISHED')
            ON DUPLICATE KEY UPDATE \`title\` = VALUES(\`title\`);
        `);

        // Gán topic_id = 1, quiz_id = 1 cho tất cả các câu hỏi hiện có mà chưa có quiz_id
        await connection.query(`
            UPDATE \`questions\` SET \`topic_id\` = 1, \`quiz_id\` = 1 WHERE \`quiz_id\` IS NULL OR \`quiz_id\` = 0;
        `);

        // Kiểm tra nếu bảng questions trống thì nạp 12 câu mẫu
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM `questions`');
        if (rows[0].count === 0) {
            console.log('🌱 Database đang trống, tiến hành nạp tự động 12 câu hỏi One Piece...');
            for (const q of defaultQuestions) {
                await connection.query(
                    `INSERT INTO \`questions\` 
                    (\`id\`, \`quiz_id\`, \`topic_id\`, \`question_text\`, \`option_a\`, \`option_b\`, \`option_c\`, \`option_d\`, \`correct_answer\`, \`explanation\`, \`category\`, \`difficulty\`)
                    VALUES (?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE \`question_text\` = VALUES(\`question_text\`)`,
                    [q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.explanation, q.category, q.difficulty]
                );
            }
            console.log('🎉 Đã nạp thành công 12 câu hỏi vào database!');
        }
        console.log('✅ Hoàn tất khởi tạo & đồng bộ database!');
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
        console.error('❌ KHÔNG THỂ KẾT NỐI DATABASE:', error.message);
        return false;
    }
}

module.exports = {
    pool,
    testConnection
};

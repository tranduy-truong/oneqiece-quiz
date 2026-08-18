-- ===================================================
-- DATABASE SCHEMA CHO HỆ THỐNG QUIZ ONE PIECE
-- ===================================================

-- 1. Tạo database nếu chưa tồn tại
CREATE DATABASE IF NOT EXISTS `quiz_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `quiz_db`;

-- 2. Tạo bảng questions
CREATE TABLE IF NOT EXISTS `questions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `question_text` TEXT NOT NULL,
    `option_a` TEXT NOT NULL,
    `option_b` TEXT NOT NULL,
    `option_c` TEXT NOT NULL,
    `option_d` TEXT NOT NULL,
    `correct_answer` ENUM('A', 'B', 'C', 'D') NOT NULL,
    `explanation` TEXT NULL,
    `category` VARCHAR(100) DEFAULT 'Chung',
    `difficulty` INT DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Xóa dữ liệu cũ nếu muốn reset (tùy chọn)
-- TRUNCATE TABLE `questions`;

-- 4. Chèn dữ liệu 12 câu hỏi gốc từ file onepiece.html
INSERT INTO `questions` 
(`id`, `question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_answer`, `explanation`, `category`, `difficulty`) 
VALUES
(1, 'Ai là thành viên đầu tiên gia nhập băng hải tặc Mũ Rơm?', 'Nami', 'Usopp', 'Roronoa Zoro', 'Sanji', 'C', 'Zoro là thành viên đầu tiên Luffy chiêu mộ tại Shells Town sau khi cứu anh khỏi Đại tá Morgan.', 'Nhân vật', 1),
(2, 'Trái ác quỷ Gomu Gomu no Mi thực chất có tên thật là gì?', 'Hito Hito no Mi, Model: Nika', 'Mera Mera no Mi', 'Yomi Yomi no Mi', 'Bari Bari no Mi', 'A', 'Ngũ Lão Tinh đã tiết lộ trái Gomu Gomu thực chất là trái Zoan Thần Thoại Hito Hito no Mi, Model: Nika.', 'Trái Ác Quỷ', 1),
(3, 'Vương quốc Alabasta được bảo vệ bởi vị thần hộ mệnh mang năng lực Trái Ác Quỷ gì?', 'Chó sói', 'Chim ưng (Falcon)', 'Báo đốm', 'Sư tử', 'B', 'Pell sở hữu trái Tori Tori no Mi, Model: Falcon. Anh cùng với Chaka (Jackal) là hai thần hộ mệnh của Alabasta.', 'Arc', 2),
(4, 'Trụ sở chính của Hải Quân (Marineford) ban đầu nằm ở đâu?', 'Tân Thế Giới', 'Biển Đông (East Blue)', 'Nửa đầu Grand Line (Paradise)', 'Calm Belt', 'C', 'Marineford ban đầu nằm ở Paradise. Sau timeskip, Akainu đã đổi vị trí Marineford với chi nhánh G-1 ở Tân Thế Giới.', 'Hải quân', 2),
(5, 'Rayleigh đã hướng dẫn Luffy học Haki trên hòn đảo nào?', 'Sabaody Archipelago', 'Amazon Lily', 'Rusukaina', 'Punk Hazard', 'C', 'Rusukaina là hòn đảo có thời tiết thay đổi 48 mùa một năm, nằm gần Amazon Lily, nơi Rayleigh huấn luyện Luffy trong 1.5 năm.', 'Haki', 3),
(6, 'Vũ khí cổ đại Pluton được miêu tả là gì?', 'Một nàng tiên cá', 'Một trái ác quỷ', 'Một hòn đảo', 'Một chiến hạm khổng lồ', 'D', 'Pluton là một chiến hạm khổng lồ có sức mạnh hủy diệt một hòn đảo trong một phát bắn. Bản vẽ của nó từng được Franky giữ.', 'Vũ Khí Cổ Đại', 3),
(7, 'Trên Skypiea, Gol D. Roger đã để lại một thông điệp trên khối Poneglyph bằng ngôn ngữ cổ đại. Ai là người đã khắc thông điệp đó cho Roger?', 'Silvers Rayleigh', 'Kozuki Oden', 'Clover', 'Nico Robin', 'B', 'Trong đoạn flashback, chính Kozuki Oden, người có khả năng đọc và khắc văn tự cổ của gia tộc Kozuki, đã khắc dòng chữ đó cho Roger.', 'Lore', 4),
(8, 'Tên thật của ''Râu Đen'' (Blackbeard) là gì?', 'Marshall D. Teach', 'Rocks D. Xebec', 'Gol D. Teach', 'Jaguar D. Saul', 'A', 'Tên đầy đủ của Râu Đen là Marshall D. Teach, một người mang ý chí của D.', 'Nhân vật', 4),
(9, 'Ai là người ĐẦU TIÊN đề cập đến cái tên ''Sun God Nika'' trong mạch truyện chính của Manga?', 'Gorosei (Ngũ Lão Tinh)', 'Who''s-Who', 'Vegapunk', 'Jinbe', 'B', 'Who''s-Who đã hỏi Jinbe về truyền thuyết Sun God Nika mà hắn nghe được từ một lính canh khi bị giam ở Impel Down.', 'Lore', 5),
(10, 'Có tổng cộng bao nhiêu khối Road Poneglyph (Poneglyph Đỏ) trên thế giới dùng để chỉ đường đến Laugh Tale?', '3', '4', '7', '9', 'B', 'Có đúng 4 khối Road Poneglyph. Khi xác định được vị trí giao nhau của 4 tọa độ từ 4 khối này, đó chính là Laugh Tale.', 'Poneglyph', 5),
(11, 'Mức truy nã chính xác của Vua Hải Tặc Gol D. Roger là bao nhiêu?', '5,046,000,000 Berries', '5,564,800,000 Berries', '4,388,000,000 Berries', '5,600,000,000 Berries', 'B', 'Tiền truy nã của Roger là 5,564,800,000. Của Râu Trắng là 5,046,000,000 (đáp án A).', 'Lịch sử', 6),
(12, 'Số hiệu tù nhân của Luffy tại mỏ đá Udon (Wano) là bao nhiêu?', '312', '5592', '9412', '1520', 'B', 'Số hiệu tù nhân của Luffy ở Udon là 5592, Kid là 3150.', 'Chi tiết nhỏ', 6)
ON DUPLICATE KEY UPDATE 
`question_text` = VALUES(`question_text`),
`option_a` = VALUES(`option_a`),
`option_b` = VALUES(`option_b`),
`option_c` = VALUES(`option_c`),
`option_d` = VALUES(`option_d`),
`correct_answer` = VALUES(`correct_answer`),
`explanation` = VALUES(`explanation`),
`category` = VALUES(`category`),
`difficulty` = VALUES(`difficulty`);

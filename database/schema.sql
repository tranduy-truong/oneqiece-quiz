-- ===================================================
-- REALTIME QUIZ PLATFORM - COMPLETE DATABASE SCHEMA
-- ===================================================

CREATE DATABASE IF NOT EXISTS `quiz_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `quiz_db`;

-- 1. Topics Table
CREATE TABLE IF NOT EXISTS `topics` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL UNIQUE,
    `description` TEXT,
    `icon` VARCHAR(255) DEFAULT '⚓',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Quizzes Table
CREATE TABLE IF NOT EXISTS `quizzes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `topic_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `time_per_question` INT DEFAULT 15,
    `total_questions` INT DEFAULT 20,
    `is_random` BOOLEAN DEFAULT TRUE,
    `random_answers` BOOLEAN DEFAULT FALSE,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'PUBLISHED',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Questions Table
CREATE TABLE IF NOT EXISTS `questions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `quiz_id` INT NULL,
    `topic_id` INT NULL,
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
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_quiz_id` (`quiz_id`),
    INDEX `idx_topic_id` (`topic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Players Table
CREATE TABLE IF NOT EXISTS `players` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(100) NOT NULL,
    `session_token` VARCHAR(255) NOT NULL UNIQUE,
    `avatar` VARCHAR(255) DEFAULT '/images/A.jpg',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `last_active` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_session_token` (`session_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Rooms Table
CREATE TABLE IF NOT EXISTS `rooms` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `room_code` VARCHAR(16) NOT NULL UNIQUE,
    `host_session_token` VARCHAR(255) NOT NULL,
    `quiz_id` INT NOT NULL,
    `status` ENUM('WAITING', 'STARTING', 'IN_GAME', 'FINISHED', 'CANCELLED') DEFAULT 'WAITING',
    `max_players` INT DEFAULT 50,
    `is_public` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON DELETE CASCADE,
    INDEX `idx_room_code` (`room_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Game Sessions Table
CREATE TABLE IF NOT EXISTS `game_sessions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `room_id` INT NULL,
    `quiz_id` INT NOT NULL,
    `mode` ENUM('MULTIPLAYER', 'SOLO', 'PRACTICE') DEFAULT 'MULTIPLAYER',
    `total_questions_count` INT DEFAULT 20,
    `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `finished_at` TIMESTAMP NULL,
    FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Game Session Questions (Immutable Snapshot)
CREATE TABLE IF NOT EXISTS `game_session_questions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `game_session_id` INT NOT NULL,
    `question_order` INT NOT NULL,
    `original_question_id` INT NULL,
    `question_text` TEXT NOT NULL,
    `option_a` TEXT NOT NULL,
    `option_b` TEXT NOT NULL,
    `option_c` TEXT NOT NULL,
    `option_d` TEXT NOT NULL,
    `correct_answer` ENUM('A', 'B', 'C', 'D') NOT NULL,
    `explanation` TEXT,
    `category` VARCHAR(100) DEFAULT 'Chung',
    `difficulty` INT DEFAULT 1,
    FOREIGN KEY (`game_session_id`) REFERENCES `game_sessions`(`id`) ON DELETE CASCADE,
    INDEX `idx_session_order` (`game_session_id`, `question_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Game Player Answers
CREATE TABLE IF NOT EXISTS `game_player_answers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `game_session_id` INT NOT NULL,
    `player_id` INT NOT NULL,
    `question_order` INT NOT NULL,
    `selected_answer` ENUM('A', 'B', 'C', 'D') NULL,
    `is_correct` BOOLEAN DEFAULT FALSE,
    `response_time_ms` INT DEFAULT 0,
    `score_awarded` INT DEFAULT 0,
    `answered_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`game_session_id`) REFERENCES `game_sessions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE CASCADE,
    INDEX `idx_player_session` (`game_session_id`, `player_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Game Player Results
CREATE TABLE IF NOT EXISTS `game_player_results` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `game_session_id` INT NOT NULL,
    `player_id` INT NOT NULL,
    `total_score` INT DEFAULT 0,
    `correct_count` INT DEFAULT 0,
    `wrong_count` INT DEFAULT 0,
    `accuracy` FLOAT DEFAULT 0,
    `avg_response_time_ms` INT DEFAULT 0,
    `final_rank` INT DEFAULT 1,
    FOREIGN KEY (`game_session_id`) REFERENCES `game_sessions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE CASCADE,
    INDEX `idx_session_results` (`game_session_id`, `final_rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Default Topics and Quizzes if not exists
INSERT INTO `topics` (`id`, `name`, `slug`, `description`, `icon`)
VALUES 
(1, 'One Piece Universe', 'one-piece-universe', 'Vũ trụ thế giới One Piece, Hải tặc, Hải quân và Trái Ác Quỷ', '⚓'),
(2, 'Lập Trình & Công Nghệ', 'lap-trinh-cong-nghe', 'Thử thách kiến thức Lập trình Web, JavaScript, Database và Network', '💻')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `quizzes` (`id`, `topic_id`, `title`, `slug`, `description`, `time_per_question`, `total_questions`, `is_random`, `status`)
VALUES 
(1, 1, 'Đại Thử Thách One Piece - Chống Larper', 'one-piece-grand-test', 'Thử thách kiến thức One Piece từ cơ bản đến cực khó (20 câu hỏi).', 15, 20, TRUE, 'PUBLISHED'),
(2, 2, 'Kiến Thức Lập Trình Cơ Bản', 'lap-trinh-co-ban', 'Các câu hỏi thú vị về JavaScript, Web và Công nghệ.', 15, 20, TRUE, 'PUBLISHED')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

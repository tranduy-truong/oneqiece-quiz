const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAdminAuth, JWT_SECRET } = require('../middleware/auth');
require('dotenv').config();

/**
 * POST /api/admin/login
 * Đăng nhập quản trị viên
 */
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const envUser = process.env.ADMIN_USERNAME || 'admin';
    const envPass = process.env.ADMIN_PASSWORD || 'admin123';

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'
        });
    }

    if (username === envUser && password === envPass) {
        const token = jwt.sign(
            { username: envUser, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            token: token,
            user: { username: envUser }
        });
    } else {
        return res.status(401).json({
            success: false,
            error: 'Tên đăng nhập hoặc mật khẩu không chính xác.'
        });
    }
});

/**
 * GET /api/admin/me
 */
router.get('/me', requireAdminAuth, (req, res) => {
    res.json({
        success: true,
        user: req.admin
    });
});

/**
 * GET /api/admin/stats
 * Thống kê tổng quan cho Dashboard
 */
router.get('/stats', requireAdminAuth, async (req, res) => {
    try {
        const [qCount] = await pool.query('SELECT COUNT(*) as count FROM questions');
        const [quizCount] = await pool.query('SELECT COUNT(*) as count FROM quizzes');
        const [topicCount] = await pool.query('SELECT COUNT(*) as count FROM topics');
        const [gameCount] = await pool.query('SELECT COUNT(*) as count FROM game_sessions');
        const [playerCount] = await pool.query('SELECT COUNT(*) as count FROM players');
        const [todayGames] = await pool.query('SELECT COUNT(*) as count FROM game_sessions WHERE DATE(started_at) = CURRENT_DATE()');

        res.json({
            success: true,
            data: {
                total_questions: qCount[0].count,
                total_quizzes: quizCount[0].count,
                total_topics: topicCount[0].count,
                games_played: gameCount[0].count,
                total_players: playerCount[0].count,
                games_today: todayGames[0].count
            }
        });
    } catch (err) {
        console.error('Lỗi lấy admin stats:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy thống kê.' });
    }
});

// ==========================================
// 1. QUẢN LÝ CÂU HỎI (QUESTIONS CRUD)
// ==========================================

/**
 * GET /api/admin/questions
 * Lấy toàn bộ danh sách câu hỏi kèm thông tin Bộ đề (Quiz) và Chủ đề (Topic)
 */
router.get('/questions', requireAdminAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT q.*, 
                   z.title as quiz_title, 
                   t.name as topic_name,
                   t.icon as topic_icon
            FROM questions q
            LEFT JOIN quizzes z ON q.quiz_id = z.id
            LEFT JOIN topics t ON q.topic_id = t.id
            ORDER BY q.id DESC
        `);
        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        console.error('Admin: Lỗi lấy danh sách câu hỏi:', error);
        res.status(500).json({ success: false, error: 'Không thể truy vấn cơ sở dữ liệu.' });
    }
});

/**
 * POST /api/admin/questions
 * Thêm câu hỏi mới (chọn Bộ đề & Chủ đề)
 */
router.post('/questions', requireAdminAuth, async (req, res) => {
    try {
        const {
            quiz_id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer,
            explanation,
            category,
            difficulty
        } = req.body;

        if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng điền đầy đủ câu hỏi, 4 đáp án và đáp án đúng.'
            });
        }

        const validAnswer = String(correct_answer).toUpperCase().trim();
        if (!['A', 'B', 'C', 'D'].includes(validAnswer)) {
            return res.status(400).json({
                success: false,
                error: 'Đáp án đúng phải là một trong 4 ký tự: A, B, C, D.'
            });
        }

        const cleanCategory = category ? String(category).trim() : 'Chung';
        const cleanDifficulty = difficulty ? parseInt(difficulty, 10) || 1 : 1;
        const qId = quiz_id ? parseInt(quiz_id, 10) : 1;

        // Tự động tìm topic_id theo quiz_id
        let tId = 1;
        const [qRows] = await pool.query('SELECT topic_id FROM quizzes WHERE id = ?', [qId]);
        if (qRows.length > 0) {
            tId = qRows[0].topic_id;
        }

        const [result] = await pool.query(
            `INSERT INTO questions 
            (quiz_id, topic_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, category, difficulty) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                qId,
                tId,
                question_text.trim(),
                option_a.trim(),
                option_b.trim(),
                option_c.trim(),
                option_d.trim(),
                validAnswer,
                explanation ? explanation.trim() : '',
                cleanCategory,
                cleanDifficulty
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Thêm câu hỏi thành công!',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Admin: Lỗi thêm câu hỏi:', error);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi thêm câu hỏi mới.' });
    }
});

/**
 * PUT /api/admin/questions/:id
 * Chỉnh sửa câu hỏi & chuyển bộ đề
 */
router.put('/questions/:id', requireAdminAuth, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id, 10);
        if (!questionId) {
            return res.status(400).json({ success: false, error: 'ID câu hỏi không hợp lệ.' });
        }

        const {
            quiz_id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer,
            explanation,
            category,
            difficulty
        } = req.body;

        if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
            return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ thông tin.' });
        }

        const validAnswer = String(correct_answer).toUpperCase().trim();
        if (!['A', 'B', 'C', 'D'].includes(validAnswer)) {
            return res.status(400).json({ success: false, error: 'Đáp án đúng phải là A, B, C hoặc D.' });
        }

        const cleanCategory = category ? String(category).trim() : 'Chung';
        const cleanDifficulty = difficulty ? parseInt(difficulty, 10) || 1 : 1;
        const qId = quiz_id ? parseInt(quiz_id, 10) : 1;

        let tId = 1;
        const [qRows] = await pool.query('SELECT topic_id FROM quizzes WHERE id = ?', [qId]);
        if (qRows.length > 0) tId = qRows[0].topic_id;

        const [result] = await pool.query(
            `UPDATE questions 
            SET quiz_id = ?, topic_id = ?, question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_answer = ?, explanation = ?, category = ?, difficulty = ?
            WHERE id = ?`,
            [
                qId,
                tId,
                question_text.trim(),
                option_a.trim(),
                option_b.trim(),
                option_c.trim(),
                option_d.trim(),
                validAnswer,
                explanation ? explanation.trim() : '',
                cleanCategory,
                cleanDifficulty,
                questionId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy câu hỏi để cập nhật.' });
        }

        res.json({ success: true, message: 'Cập nhật câu hỏi thành công!' });
    } catch (error) {
        console.error('Admin: Lỗi cập nhật câu hỏi:', error);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi cập nhật câu hỏi.' });
    }
});

/**
 * POST /api/admin/questions/bulk
 * Nhập hàng loạt câu hỏi vào bộ đề đã chọn
 */
router.post('/questions/bulk', requireAdminAuth, async (req, res) => {
    try {
        const { questions, quiz_id } = req.body;

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ success: false, error: 'Danh sách câu hỏi không hợp lệ hoặc đang trống.' });
        }

        const qId = quiz_id ? parseInt(quiz_id, 10) : 1;
        let tId = 1;
        const [qRows] = await pool.query('SELECT topic_id FROM quizzes WHERE id = ?', [qId]);
        if (qRows.length > 0) tId = qRows[0].topic_id;

        let insertedCount = 0;
        for (const q of questions) {
            if (q.question_text && q.option_a && q.option_b && q.option_c && q.option_d && q.correct_answer) {
                const validAnswer = String(q.correct_answer).toUpperCase().trim();
                if (['A', 'B', 'C', 'D'].includes(validAnswer)) {
                    await pool.query(
                        `INSERT INTO questions 
                        (quiz_id, topic_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, category, difficulty) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            qId,
                            tId,
                            String(q.question_text).trim(),
                            String(q.option_a).trim(),
                            String(q.option_b).trim(),
                            String(q.option_c).trim(),
                            String(q.option_d).trim(),
                            validAnswer,
                            q.explanation ? String(q.explanation).trim() : '',
                            q.category ? String(q.category).trim() : 'Chung',
                            q.difficulty ? parseInt(q.difficulty, 10) || 1 : 1
                        ]
                    );
                    insertedCount++;
                }
            }
        }

        res.status(201).json({
            success: true,
            message: `Đã thêm thành công ${insertedCount} câu hỏi mới vào bộ đề!`,
            inserted_count: insertedCount
        });
    } catch (error) {
        console.error('Admin: Lỗi thêm hàng loạt câu hỏi:', error);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi thêm hàng loạt câu hỏi.' });
    }
});

/**
 * DELETE /api/admin/questions/:id
 */
router.delete('/questions/:id', requireAdminAuth, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id, 10);
        const [result] = await pool.query('DELETE FROM questions WHERE id = ?', [questionId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy câu hỏi để xóa.' });
        }
        res.json({ success: true, message: 'Đã xóa câu hỏi thành công!' });
    } catch (error) {
        console.error('Admin: Lỗi xóa câu hỏi:', error);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi xóa câu hỏi.' });
    }
});

// ==========================================
// 2. QUẢN LÝ BỘ ĐỀ (QUIZZES CRUD)
// ==========================================

/**
 * GET /api/admin/quizzes
 * Lấy danh sách tất cả các bộ đề (bao gồm cả DRAFT)
 */
router.get('/quizzes', requireAdminAuth, async (req, res) => {
    try {
        const [quizzes] = await pool.query(`
            SELECT q.*, t.name as topic_name, t.icon as topic_icon,
                   (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count
            FROM quizzes q
            LEFT JOIN topics t ON q.topic_id = t.id
            ORDER BY q.id ASC
        `);
        res.json({ success: true, data: quizzes });
    } catch (err) {
        console.error('Admin: Lỗi lấy danh sách quizzes:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy danh sách đề thi.' });
    }
});

/**
 * POST /api/admin/quizzes
 * Tạo một bộ đề thi mới
 */
router.post('/quizzes', requireAdminAuth, async (req, res) => {
    try {
        const { topic_id, title, slug, description, time_per_question, total_questions, is_random, status } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, error: 'Vui lòng nhập tên bộ đề thi.' });
        }

        const cleanTopicId = parseInt(topic_id, 10) || 1;
        const cleanTitle = String(title).trim();
        const cleanSlug = slug ? String(slug).trim() : cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const cleanTime = parseInt(time_per_question, 10) || 15;
        const cleanTotal = parseInt(total_questions, 10) || 20;
        const cleanStatus = ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status) ? status : 'PUBLISHED';
        const cleanRandom = is_random !== false;

        const [result] = await pool.query(
            `INSERT INTO quizzes (topic_id, title, slug, description, time_per_question, total_questions, is_random, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [cleanTopicId, cleanTitle, cleanSlug, description || '', cleanTime, cleanTotal, cleanRandom, cleanStatus]
        );

        res.status(201).json({
            success: true,
            message: 'Tạo bộ đề mới thành công!',
            data: { id: result.insertId, title: cleanTitle }
        });
    } catch (err) {
        console.error('Admin: Lỗi tạo quiz:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi tạo bộ đề mới.' });
    }
});

/**
 * PUT /api/admin/quizzes/:id
 * Chỉnh sửa bộ đề thi
 */
router.put('/quizzes/:id', requireAdminAuth, async (req, res) => {
    try {
        const quizId = parseInt(req.params.id, 10);
        const { topic_id, title, slug, description, time_per_question, total_questions, is_random, status } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, error: 'Vui lòng nhập tên bộ đề thi.' });
        }

        const cleanTopicId = parseInt(topic_id, 10) || 1;
        const cleanTitle = String(title).trim();
        const cleanSlug = slug ? String(slug).trim() : cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const cleanTime = parseInt(time_per_question, 10) || 15;
        const cleanTotal = parseInt(total_questions, 10) || 20;
        const cleanStatus = ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status) ? status : 'PUBLISHED';
        const cleanRandom = is_random !== false;

        const [result] = await pool.query(
            `UPDATE quizzes 
             SET topic_id = ?, title = ?, slug = ?, description = ?, time_per_question = ?, total_questions = ?, is_random = ?, status = ?
             WHERE id = ?`,
            [cleanTopicId, cleanTitle, cleanSlug, description || '', cleanTime, cleanTotal, cleanRandom, cleanStatus, quizId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy bộ đề để cập nhật.' });
        }

        res.json({ success: true, message: 'Cập nhật bộ đề thành công!' });
    } catch (err) {
        console.error('Admin: Lỗi cập nhật quiz:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi cập nhật bộ đề.' });
    }
});

/**
 * DELETE /api/admin/quizzes/:id
 * Xóa bộ đề thi
 */
router.delete('/quizzes/:id', requireAdminAuth, async (req, res) => {
    try {
        const quizId = parseInt(req.params.id, 10);
        // Chuyển các câu hỏi thuộc bộ đề này sang bộ đề mặc định 1
        await pool.query('UPDATE questions SET quiz_id = 1 WHERE quiz_id = ?', [quizId]);

        const [result] = await pool.query('DELETE FROM quizzes WHERE id = ?', [quizId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy bộ đề để xóa.' });
        }
        res.json({ success: true, message: 'Đã xóa bộ đề thành công!' });
    } catch (err) {
        console.error('Admin: Lỗi xóa quiz:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi xóa bộ đề.' });
    }
});

// ==========================================
// 3. QUẢN LÝ CHỦ ĐỀ (TOPICS CRUD)
// ==========================================

/**
 * GET /api/admin/topics
 */
router.get('/topics', requireAdminAuth, async (req, res) => {
    try {
        const [topics] = await pool.query(`
            SELECT t.*, COUNT(q.id) as total_quizzes 
            FROM topics t 
            LEFT JOIN quizzes q ON t.id = q.topic_id 
            GROUP BY t.id 
            ORDER BY t.id ASC
        `);
        res.json({ success: true, data: topics });
    } catch (err) {
        console.error('Admin: Lỗi lấy topics:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy danh sách chủ đề.' });
    }
});

/**
 * POST /api/admin/topics
 */
router.post('/topics', requireAdminAuth, async (req, res) => {
    try {
        const { name, slug, description, icon } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Vui lòng nhập tên chủ đề.' });
        }
        const cleanName = String(name).trim();
        const cleanSlug = slug ? String(slug).trim() : cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const [result] = await pool.query(
            'INSERT INTO topics (name, slug, description, icon) VALUES (?, ?, ?, ?)',
            [cleanName, cleanSlug, description || '', icon || '⚓']
        );

        res.status(201).json({
            success: true,
            message: 'Tạo chủ đề mới thành công!',
            data: { id: result.insertId, name: cleanName }
        });
    } catch (err) {
        console.error('Admin: Lỗi tạo topic:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi tạo chủ đề mới.' });
    }
});

/**
 * PUT /api/admin/topics/:id
 */
router.put('/topics/:id', requireAdminAuth, async (req, res) => {
    try {
        const topicId = parseInt(req.params.id, 10);
        const { name, slug, description, icon } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Vui lòng nhập tên chủ đề.' });
        }

        const cleanName = String(name).trim();
        const cleanSlug = slug ? String(slug).trim() : cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const [result] = await pool.query(
            'UPDATE topics SET name = ?, slug = ?, description = ?, icon = ? WHERE id = ?',
            [cleanName, cleanSlug, description || '', icon || '⚓', topicId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy chủ đề để cập nhật.' });
        }

        res.json({ success: true, message: 'Cập nhật chủ đề thành công!' });
    } catch (err) {
        console.error('Admin: Lỗi cập nhật topic:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi cập nhật chủ đề.' });
    }
});

/**
 * DELETE /api/admin/topics/:id
 */
router.delete('/topics/:id', requireAdminAuth, async (req, res) => {
    try {
        const topicId = parseInt(req.params.id, 10);
        if (topicId === 1) {
            return res.status(400).json({ success: false, error: 'Không thể xóa chủ đề mặc định #1.' });
        }

        await pool.query('UPDATE quizzes SET topic_id = 1 WHERE topic_id = ?', [topicId]);
        const [result] = await pool.query('DELETE FROM topics WHERE id = ?', [topicId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy chủ đề để xóa.' });
        }

        res.json({ success: true, message: 'Đã xóa chủ đề thành công!' });
    } catch (err) {
        console.error('Admin: Lỗi xóa topic:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi xóa chủ đề.' });
    }
});

// ==========================================
// 4. LỊCH SỬ THI ĐẤU (GAME HISTORY)
// ==========================================

/**
 * GET /api/admin/games
 */
router.get('/games', requireAdminAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT s.*, q.title as quiz_title,
                   (SELECT COUNT(*) FROM game_player_results WHERE game_session_id = s.id) as player_count,
                   (SELECT p.username FROM game_player_results r JOIN players p ON r.player_id = p.id WHERE r.game_session_id = s.id AND r.final_rank = 1 LIMIT 1) as winner
            FROM game_sessions s
            JOIN quizzes q ON s.quiz_id = q.id
            ORDER BY s.started_at DESC
            LIMIT 50
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Admin: Lỗi lấy danh sách games:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy lịch sử trận đấu.' });
    }
});

/**
 * GET /api/admin/games/:id
 */
router.get('/games/:id', requireAdminAuth, async (req, res) => {
    try {
        const sessionId = parseInt(req.params.id, 10);
        const [sessRows] = await pool.query(`
            SELECT s.*, q.title as quiz_title, q.time_per_question 
            FROM game_sessions s 
            JOIN quizzes q ON s.quiz_id = q.id 
            WHERE s.id = ?
        `, [sessionId]);

        if (sessRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy trận đấu.' });
        }

        const [players] = await pool.query(`
            SELECT r.*, p.username, p.avatar 
            FROM game_player_results r 
            JOIN players p ON r.player_id = p.id 
            WHERE r.game_session_id = ? 
            ORDER BY r.final_rank ASC
        `, [sessionId]);

        const [questions] = await pool.query(`
            SELECT * FROM game_session_questions 
            WHERE game_session_id = ? 
            ORDER BY question_order ASC
        `, [sessionId]);

        res.json({
            success: true,
            session: sessRows[0],
            players,
            questions
        });
    } catch (err) {
        console.error('Admin: Lỗi lấy chi tiết game:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy chi tiết trận đấu.' });
    }
});

// ==========================================
// 5. QUẢN LÝ AVATAR CHIẾN BINH (AVATARS CRUD & UPLOAD)
// ==========================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../public/uploads/avatars');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function (req, file, cb) {
        const allowed = /jpeg|jpg|png|webp|gif/;
        const mime = allowed.test(file.mimetype);
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        if (mime && ext) {
            return cb(null, true);
        }
        cb(new Error('Chỉ cho phép tải lên file hình ảnh (PNG, JPG, WEBP, GIF).'));
    }
});

/**
 * GET /api/admin/avatars
 */
router.get('/avatars', requireAdminAuth, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM avatars ORDER BY is_default DESC, id DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Admin: Lỗi lấy danh sách avatars:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy danh sách avatar.' });
    }
});

/**
 * POST /api/admin/avatars/upload
 * Tải file ảnh avatar từ máy tính
 */
router.post('/avatars/upload', requireAdminAuth, upload.single('avatar_file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Vui lòng chọn file hình ảnh để tải lên.' });
        }

        const name = req.body.avatar_name ? String(req.body.avatar_name).trim() : path.parse(req.file.originalname).name;
        const imageUrl = `/uploads/avatars/${req.file.filename}`;

        const [result] = await pool.query(
            'INSERT INTO avatars (name, image_url, is_default) VALUES (?, ?, FALSE)',
            [name || 'Warrior', imageUrl]
        );

        res.status(201).json({
            success: true,
            message: 'Tải lên avatar thành công!',
            data: {
                id: result.insertId,
                name: name,
                image_url: imageUrl
            }
        });
    } catch (err) {
        console.error('Admin: Lỗi upload avatar:', err);
        res.status(500).json({ success: false, error: err.message || 'Lỗi khi upload avatar.' });
    }
});

/**
 * DELETE /api/admin/avatars/:id
 */
router.delete('/avatars/:id', requireAdminAuth, async (req, res) => {
    try {
        const avatarId = parseInt(req.params.id, 10);
        const [rows] = await pool.query('SELECT * FROM avatars WHERE id = ?', [avatarId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy avatar để xóa.' });
        }

        const avatar = rows[0];
        if (avatar.is_default) {
            return res.status(400).json({ success: false, error: 'Không thể xóa avatar mặc định của hệ thống.' });
        }

        // Xóa file trên đĩa nếu nằm trong /uploads/avatars/
        if (avatar.image_url.startsWith('/uploads/avatars/')) {
            const filePath = path.join(__dirname, '../../public', avatar.image_url);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) {}
            }
        }

        await pool.query('DELETE FROM avatars WHERE id = ?', [avatarId]);

        res.json({ success: true, message: 'Đã xóa avatar thành công!' });
    } catch (err) {
        console.error('Admin: Lỗi xóa avatar:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi xóa avatar.' });
    }
});

// ==========================================
// 6. QUẢN LÝ KHO NHẠC NỀN (MUSIC TRACKS CRUD)
// ==========================================

function extractYouTubeVideoId(url) {
    if (!url) return null;
    const cleanUrl = url.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = cleanUrl.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * GET /api/admin/music
 */
router.get('/music', requireAdminAuth, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM music_tracks ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Admin: Lỗi lấy danh sách nhạc:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy danh sách nhạc.' });
    }
});

/**
 * POST /api/admin/music
 * Thêm bài hát YouTube mới
 */
router.post('/music', requireAdminAuth, async (req, res) => {
    try {
        const { title, youtube_url, category, status } = req.body;

        if (!title || !youtube_url) {
            return res.status(400).json({ success: false, error: 'Vui lòng nhập tiêu đề bài hát và link YouTube.' });
        }

        const videoId = extractYouTubeVideoId(youtube_url);
        if (!videoId) {
            return res.status(400).json({
                success: false,
                error: 'Link YouTube không hợp lệ. Vui lòng dán link dạng https://www.youtube.com/watch?v=... hoặc https://youtu.be/...'
            });
        }

        const cleanTitle = String(title).trim();
        const cleanCategory = category ? String(category).trim() : 'Gaming';
        const cleanStatus = status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        const [result] = await pool.query(
            'INSERT INTO music_tracks (title, youtube_video_id, youtube_url, category, thumbnail_url, status) VALUES (?, ?, ?, ?, ?, ?)',
            [cleanTitle, videoId, String(youtube_url).trim(), cleanCategory, thumbnailUrl, cleanStatus]
        );

        res.status(201).json({
            success: true,
            message: 'Thêm bài hát thành công!',
            data: { id: result.insertId, title: cleanTitle, youtube_video_id: videoId }
        });
    } catch (err) {
        console.error('Admin: Lỗi thêm bài hát:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi thêm bài hát mới.' });
    }
});

/**
 * PUT /api/admin/music/:id
 */
router.put('/music/:id', requireAdminAuth, async (req, res) => {
    try {
        const trackId = parseInt(req.params.id, 10);
        const { title, youtube_url, category, status } = req.body;

        if (!title || !youtube_url) {
            return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ tiêu đề và link YouTube.' });
        }

        const videoId = extractYouTubeVideoId(youtube_url);
        if (!videoId) {
            return res.status(400).json({ success: false, error: 'Link YouTube không hợp lệ.' });
        }

        const cleanTitle = String(title).trim();
        const cleanCategory = category ? String(category).trim() : 'Gaming';
        const cleanStatus = status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        const [result] = await pool.query(
            'UPDATE music_tracks SET title = ?, youtube_video_id = ?, youtube_url = ?, category = ?, thumbnail_url = ?, status = ? WHERE id = ?',
            [cleanTitle, videoId, String(youtube_url).trim(), cleanCategory, thumbnailUrl, cleanStatus, trackId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy bài hát để cập nhật.' });
        }

        res.json({ success: true, message: 'Cập nhật bài hát thành công!' });
    } catch (err) {
        console.error('Admin: Lỗi cập nhật bài hát:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi cập nhật bài hát.' });
    }
});

/**
 * DELETE /api/admin/music/:id
 */
router.delete('/music/:id', requireAdminAuth, async (req, res) => {
    try {
        const trackId = parseInt(req.params.id, 10);
        const [result] = await pool.query('DELETE FROM music_tracks WHERE id = ?', [trackId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy bài hát để xóa.' });
        }

        res.json({ success: true, message: 'Đã xóa bài hát thành công!' });
    } catch (err) {
        console.error('Admin: Lỗi xóa bài hát:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi xóa bài hát.' });
    }
});

module.exports = router;


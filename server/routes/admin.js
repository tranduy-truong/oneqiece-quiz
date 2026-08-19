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

/**
 * GET /api/admin/questions
 */
router.get('/questions', requireAdminAuth, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM questions ORDER BY id DESC');
        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        console.error('Admin: Lỗi lấy danh sách câu hỏi:', error);
        res.status(500).json({ success: false, error: 'Không thể truy vấn cơ sở dữ liệu.' });
    }
});

/**
 * POST /api/admin/questions
 */
router.post('/questions', requireAdminAuth, async (req, res) => {
    try {
        const {
            quiz_id,
            topic_id,
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
        const tId = topic_id ? parseInt(topic_id, 10) : 1;

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
 */
router.put('/questions/:id', requireAdminAuth, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id, 10);
        if (!questionId) {
            return res.status(400).json({ success: false, error: 'ID câu hỏi không hợp lệ.' });
        }

        const {
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

        const [result] = await pool.query(
            `UPDATE questions 
            SET question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_answer = ?, explanation = ?, category = ?, difficulty = ?
            WHERE id = ?`,
            [
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
 */
router.post('/questions/bulk', requireAdminAuth, async (req, res) => {
    try {
        const { questions, quiz_id, topic_id } = req.body;

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ success: false, error: 'Danh sách câu hỏi không hợp lệ hoặc đang trống.' });
        }

        const qId = quiz_id ? parseInt(quiz_id, 10) : 1;
        const tId = topic_id ? parseInt(topic_id, 10) : 1;

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
            message: `Đã thêm thành công ${insertedCount} câu hỏi mới!`,
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

/**
 * GET /api/admin/games
 * Lịch sử các trận đấu
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
 * Chi tiết một trận đấu
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

module.exports = router;

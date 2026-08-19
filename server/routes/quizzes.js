const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAdminAuth } = require('../middleware/auth');

/**
 * GET /api/quizzes
 * Lấy danh sách tất cả các bộ đề thi (Public)
 */
router.get('/', async (req, res) => {
    try {
        const [quizzes] = await pool.query(`
            SELECT q.*, t.name as topic_name, t.icon as topic_icon,
                   (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id OR topic_id = q.topic_id) as total_available_questions
            FROM quizzes q
            LEFT JOIN topics t ON q.topic_id = t.id
            WHERE q.status = 'PUBLISHED'
            ORDER BY q.id ASC
        `);
        res.json({ success: true, data: quizzes });
    } catch (err) {
        console.error('Lỗi lấy danh sách quizzes:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy danh sách đề thi.' });
    }
});

/**
 * GET /api/quizzes/:id
 * Lấy thông tin chi tiết một bộ đề
 */
router.get('/:id', async (req, res) => {
    try {
        const quizId = parseInt(req.params.id, 10);
        const [quizzes] = await pool.query(`
            SELECT q.*, t.name as topic_name, t.icon as topic_icon,
                   (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id OR topic_id = q.topic_id) as total_available_questions
            FROM quizzes q
            LEFT JOIN topics t ON q.topic_id = t.id
            WHERE q.id = ? AND q.status = 'PUBLISHED'
        `, [quizId]);

        if (quizzes.length === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy bộ đề thi.' });
        }

        res.json({ success: true, data: quizzes[0] });
    } catch (err) {
        console.error('Lỗi lấy chi tiết quiz:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy chi tiết đề thi.' });
    }
});

/**
 * GET /api/quizzes/:id/questions
 * Lấy danh sách câu hỏi của một bộ đề (BẢO MẬT: Ẩn đáp án đúng và giải thích)
 */
router.get('/:id/questions', async (req, res) => {
    try {
        const quizId = parseInt(req.params.id, 10);
        const [quizRows] = await pool.query('SELECT * FROM quizzes WHERE id = ?', [quizId]);
        if (quizRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Bộ đề không tồn tại.' });
        }
        const quiz = quizRows[0];

        let query = `
            SELECT id, question_text, option_a, option_b, option_c, option_d, category, difficulty 
            FROM questions 
            WHERE quiz_id = ? OR topic_id = ?
        `;
        if (quiz.is_random) {
            query += ' ORDER BY RAND()';
        } else {
            query += ' ORDER BY id ASC';
        }
        query += ` LIMIT ${quiz.total_questions || 20}`;

        const [questions] = await pool.query(query, [quizId, quiz.topic_id]);

        res.json({
            success: true,
            quiz: {
                id: quiz.id,
                title: quiz.title,
                time_per_question: quiz.time_per_question,
                total_questions: questions.length
            },
            data: questions
        });
    } catch (err) {
        console.error('Lỗi lấy câu hỏi quiz:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy câu hỏi.' });
    }
});

module.exports = router;

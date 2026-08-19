const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAdminAuth } = require('../middleware/auth');

/**
 * GET /api/topics
 * Lấy danh sách tất cả các chủ đề (Public)
 */
router.get('/', async (req, res) => {
    try {
        const [topics] = await pool.query(`
            SELECT t.*, COUNT(q.id) as total_quizzes 
            FROM topics t 
            LEFT JOIN quizzes q ON t.id = q.topic_id AND q.status = 'PUBLISHED'
            GROUP BY t.id 
            ORDER BY t.id ASC
        `);
        res.json({ success: true, data: topics });
    } catch (err) {
        console.error('Lỗi lấy danh sách topics:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy danh sách chủ đề.' });
    }
});

/**
 * GET /api/topics/:id/quizzes
 * Lấy danh sách các bộ đề trong một chủ đề
 */
router.get('/:id/quizzes', async (req, res) => {
    try {
        const topicId = parseInt(req.params.id, 10);
        const [quizzes] = await pool.query(
            `SELECT q.*, (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count 
             FROM quizzes q 
             WHERE q.topic_id = ? AND q.status = 'PUBLISHED' 
             ORDER BY q.id ASC`,
            [topicId]
        );
        res.json({ success: true, data: quizzes });
    } catch (err) {
        console.error('Lỗi lấy danh sách quizzes theo topic:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy danh sách đề thi.' });
    }
});

/**
 * POST /api/topics (Admin)
 */
router.post('/', requireAdminAuth, async (req, res) => {
    try {
        const { name, slug, description, icon } = req.body;
        if (!name || !slug) {
            return res.status(400).json({ success: false, error: 'Vui lòng cung cấp tên và slug cho chủ đề.' });
        }

        const [result] = await pool.query(
            'INSERT INTO topics (name, slug, description, icon) VALUES (?, ?, ?, ?)',
            [name, slug, description || '', icon || '⚓']
        );

        res.status(201).json({
            success: true,
            message: 'Tạo chủ đề thành công!',
            data: { id: result.insertId, name, slug, description, icon }
        });
    } catch (err) {
        console.error('Lỗi tạo topic:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi tạo chủ đề.' });
    }
});

module.exports = router;

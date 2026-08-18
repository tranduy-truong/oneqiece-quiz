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
        // Tạo JWT Token có hạn 24 giờ
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
 * Kiểm tra trạng thái đăng nhập
 */
router.get('/me', requireAdminAuth, (req, res) => {
    res.json({
        success: true,
        user: req.admin
    });
});

/**
 * GET /api/admin/questions
 * Lấy toàn bộ danh sách câu hỏi (kèm đáp án đúng)
 */
router.get('/questions', requireAdminAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM questions ORDER BY id DESC'
        );
        res.json({
            success: true,
            total: rows.length,
            data: rows
        });
    } catch (error) {
        console.error('Admin: Lỗi lấy danh sách câu hỏi:', error);
        res.status(500).json({
            success: false,
            error: 'Không thể truy vấn cơ sở dữ liệu.'
        });
    }
});

/**
 * POST /api/admin/questions
 * Thêm một câu hỏi mới vào database
 */
router.post('/questions', requireAdminAuth, async (req, res) => {
    try {
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

        // Validation dữ liệu
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

        const [result] = await pool.query(
            `INSERT INTO questions 
            (question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, category, difficulty) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
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
            data: {
                id: result.insertId,
                question_text,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer: validAnswer,
                explanation,
                category: cleanCategory,
                difficulty: cleanDifficulty
            }
        });
    } catch (error) {
        console.error('Admin: Lỗi thêm câu hỏi:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi máy chủ khi thêm câu hỏi mới.'
        });
    }
});

/**
 * PUT /api/admin/questions/:id
 * Sửa thông tin câu hỏi
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
            return res.status(400).json({
                success: false,
                error: 'Vui lòng điền đầy đủ câu hỏi, 4 đáp án và đáp án đúng.'
            });
        }

        const validAnswer = String(correct_answer).toUpperCase().trim();
        if (!['A', 'B', 'C', 'D'].includes(validAnswer)) {
            return res.status(400).json({
                success: false,
                error: 'Đáp án đúng phải là A, B, C hoặc D.'
            });
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
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy câu hỏi để cập nhật.'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật câu hỏi thành công!'
        });
    } catch (error) {
        console.error('Admin: Lỗi cập nhật câu hỏi:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi máy chủ khi cập nhật câu hỏi.'
        });
    }
});

/**
 * DELETE /api/admin/questions/:id
 * Xóa một câu hỏi
 */
router.delete('/questions/:id', requireAdminAuth, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id, 10);
        if (!questionId) {
            return res.status(400).json({ success: false, error: 'ID câu hỏi không hợp lệ.' });
        }

        const [result] = await pool.query(
            'DELETE FROM questions WHERE id = ?',
            [questionId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy câu hỏi để xóa.'
            });
        }

        res.json({
            success: true,
            message: 'Đã xóa câu hỏi thành công!'
        });
    } catch (error) {
        console.error('Admin: Lỗi xóa câu hỏi:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi máy chủ khi xóa câu hỏi.'
        });
    }
});

module.exports = router;

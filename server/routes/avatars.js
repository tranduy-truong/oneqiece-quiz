const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * GET /api/avatars
 * Lấy danh sách toàn bộ Avatar chiến binh cho người chơi chọn
 */
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, image_url, is_default FROM avatars ORDER BY is_default DESC, id DESC');
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách avatar:', error);
        res.status(500).json({ success: false, error: 'Không thể tải danh sách avatar.' });
    }
});

module.exports = router;

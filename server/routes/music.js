const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * GET /api/music
 * Lấy danh sách bài hát công khai cho người chơi
 */
router.get('/', async (req, res) => {
    const { category, search } = req.query;
    try {
        let query = 'SELECT id, title, youtube_video_id, youtube_url, category, thumbnail_url FROM music_tracks WHERE status = "PUBLISHED"';
        const params = [];

        if (category && category !== 'All') {
            query += ' AND category = ?';
            params.push(category);
        }

        if (search) {
            query += ' AND (title LIKE ? OR category LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY id DESC';

        const [tracks] = await pool.query(query, params);
        res.json({
            success: true,
            data: tracks
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách nhạc:', error);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy danh sách bài hát.' });
    }
});

/**
 * GET /api/music/categories
 * Lấy danh sách thể loại nhạc
 */
router.get('/categories', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.id, c.name as category, 
                   COUNT(m.id) as track_count 
            FROM music_categories c
            LEFT JOIN music_tracks m ON c.name = m.category AND m.status = "PUBLISHED"
            GROUP BY c.id, c.name
            ORDER BY c.id ASC
        `);
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi khi lấy thể loại nhạc.' });
    }
});

/**
 * GET /api/music/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, title, youtube_video_id, youtube_url, category, thumbnail_url FROM music_tracks WHERE id = ? AND status = "PUBLISHED"',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy bài hát.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi khi lấy thông tin bài hát.' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireUserAuth, optionalUserAuth } = require('../middleware/userAuth');
const { getRankInfo, getLevelInfo } = require('../services/rankService');

/**
 * GET /api/user/profile/:identifier
 * Lấy hồ sơ người chơi công khai (hoặc cá nhân) theo ID hoặc username
 */
router.get('/profile/:identifier', optionalUserAuth, async (req, res) => {
    try {
        const { identifier } = req.params;
        let query = 'SELECT * FROM users WHERE username = ?';
        let params = [identifier];

        if (!isNaN(identifier)) {
            query = 'SELECT * FROM users WHERE id = ? OR username = ?';
            params = [parseInt(identifier, 10), identifier];
        }

        const [users] = await pool.query(query, params);
        if (users.length === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy người chơi.' });
        }

        const user = users[0];
        const isSelf = req.user && req.user.id === user.id;

        // 1. Thống kê trận đấu từ quiz_results
        const [statsRows] = await pool.query(
            `SELECT COUNT(*) as total_games,
                    COUNT(CASE WHEN final_rank = 1 THEN 1 END) as wins,
                    COALESCE(SUM(score), 0) as total_score,
                    COALESCE(MAX(score), 0) as best_score,
                    COALESCE(AVG(accuracy), 0) as avg_accuracy
             FROM quiz_results 
             WHERE user_id = ?`,
            [user.id]
        );
        const stats = statsRows[0] || {};
        const totalGames = parseInt(stats.total_games, 10) || 0;
        const totalWins = parseInt(stats.wins, 10) || 0;
        const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

        // 2. Lịch sử trận đấu gần đây
        const [historyRows] = await pool.query(
            `SELECT r.*, q.title as quiz_title
             FROM quiz_results r
             JOIN quizzes q ON r.quiz_id = q.id
             WHERE r.user_id = ?
             ORDER BY r.created_at DESC
             LIMIT 15`,
            [user.id]
        );

        const rankInfo = getRankInfo(user.rating);
        const levelInfo = getLevelInfo(user.xp);

        res.json({
            success: true,
            isSelf,
            profile: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                email: isSelf ? user.email : undefined,
                avatar_url: user.avatar_url,
                bio: user.bio,
                created_at: user.created_at,
                rating: user.rating,
                xp: user.xp,
                level: levelInfo.level,
                level_info: levelInfo,
                rank_tier: rankInfo.tier,
                rank_division: rankInfo.division,
                rank_display: rankInfo.rankDisplayName,
                rank_icon: rankInfo.icon,
                rank_color: rankInfo.color,
                rank_progress: rankInfo.progressPercent
            },
            stats: {
                games_played: totalGames,
                wins: totalWins,
                win_rate: winRate,
                total_score: parseInt(stats.total_score, 10) || 0,
                best_score: parseInt(stats.best_score, 10) || 0,
                avg_accuracy: Math.round(stats.avg_accuracy || 0)
            },
            history: historyRows
        });
    } catch (err) {
        console.error('Lỗi lấy profile:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy thông tin hồ sơ.' });
    }
});

/**
 * PUT /api/user/profile
 * Cập nhật thông tin Display Name, Avatar, Bio cá nhân
 */
router.put('/profile', requireUserAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { display_name, bio, avatar_url } = req.body;

        const cleanDisplayName = String(display_name || req.user.display_name).trim();
        if (!cleanDisplayName || cleanDisplayName.length < 2 || cleanDisplayName.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Tên hiển thị phải từ 2 đến 50 ký tự.'
            });
        }

        const cleanBio = bio !== undefined ? String(bio).trim().substring(0, 200) : req.user.bio;
        const cleanAvatar = avatar_url ? String(avatar_url).trim() : req.user.avatar_url;

        await pool.query(
            `UPDATE users 
             SET display_name = ?, bio = ?, avatar_url = ?
             WHERE id = ?`,
            [cleanDisplayName, cleanBio, cleanAvatar, userId]
        );

        res.json({
            success: true,
            message: 'Cập nhật thông tin hồ sơ thành công!',
            user: {
                id: userId,
                username: req.user.username,
                display_name: cleanDisplayName,
                bio: cleanBio,
                avatar_url: cleanAvatar
            }
        });
    } catch (err) {
        console.error('Lỗi cập nhật profile:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi cập nhật hồ sơ.' });
    }
});

/**
 * PUT /api/user/change-password
 * Đổi mật khẩu
 */
router.put('/change-password', requireUserAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password, confirm_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng điền đầy đủ mật khẩu hiện tại và mật khẩu mới.'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Mật khẩu mới phải có tối thiểu 6 ký tự.'
            });
        }

        if (confirm_password && new_password !== confirm_password) {
            return res.status(400).json({
                success: false,
                error: 'Mật khẩu xác nhận không khớp.'
            });
        }

        const [userRows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0 || !userRows[0].password_hash) {
            return res.status(400).json({
                success: false,
                error: 'Tài khoản này được đăng ký qua Google, hãy dùng tính năng Quên mật khẩu để tạo mật khẩu.'
            });
        }

        const isMatch = await bcrypt.compare(current_password, userRows[0].password_hash);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                error: 'Mật khẩu hiện tại không chính xác.'
            });
        }

        const newHash = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công!'
        });
    } catch (err) {
        console.error('Lỗi đổi mật khẩu:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi đổi mật khẩu.' });
    }
});

/**
 * GET /api/user/history
 * Lấy lịch sử trận đấu của bản thân
 */
router.get('/history', requireUserAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.query(
            `SELECT r.*, q.title as quiz_title
             FROM quiz_results r
             JOIN quizzes q ON r.quiz_id = q.id
             WHERE r.user_id = ?
             ORDER BY r.created_at DESC
             LIMIT 30`,
            [userId]
        );

        res.json({
            success: true,
            history: rows
        });
    } catch (err) {
        console.error('Lỗi lấy lịch sử:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy lịch sử trận đấu.' });
    }
});

module.exports = router;

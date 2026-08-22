const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { getRankInfo, getLevelInfo } = require('../services/rankService');

/**
 * GET /api/leaderboard/global
 * Bảng xếp hạng người chơi toàn cầu (Ưu tiên Registered Ranked Users)
 */
router.get('/global', async (req, res) => {
    try {
        // 1. Lấy danh sách Registered Ranked Users
        const [userRows] = await pool.query(`
            SELECT u.id, u.username, u.display_name, u.avatar_url, u.rating, u.xp, u.level, u.rank_tier, u.rank_division,
                   (SELECT COUNT(*) FROM quiz_results WHERE user_id = u.id) as games_played,
                   (SELECT COUNT(*) FROM quiz_results WHERE user_id = u.id AND final_rank = 1) as total_wins,
                   (SELECT COALESCE(AVG(accuracy), 0) FROM quiz_results WHERE user_id = u.id) as avg_accuracy,
                   (SELECT COALESCE(SUM(score), 0) FROM quiz_results WHERE user_id = u.id) as total_accumulated_score
            FROM users u
            WHERE u.email_verified = TRUE
            ORDER BY u.rating DESC, u.xp DESC
            LIMIT 50
        `);

        if (userRows.length > 0) {
            const formatted = userRows.map((u, idx) => {
                const rankInfo = getRankInfo(u.rating);
                const levelInfo = getLevelInfo(u.xp);
                return {
                    rank: idx + 1,
                    user_id: u.id,
                    username: u.username,
                    display_name: u.display_name,
                    avatar: u.avatar_url || '/images/A.jpg',
                    rating: u.rating,
                    xp: u.xp,
                    level: levelInfo.level,
                    rank_tier: rankInfo.tier,
                    rank_division: rankInfo.division,
                    rank_display: rankInfo.rankDisplayName,
                    rank_icon: rankInfo.icon,
                    rank_color: rankInfo.color,
                    total_score: parseInt(u.total_accumulated_score, 10) || 0,
                    avg_accuracy: Math.round(u.avg_accuracy || 0),
                    games_played: u.games_played || 0,
                    wins: u.total_wins || 0,
                    is_registered: true
                };
            });
            return res.json({ success: true, data: formatted });
        }

        // Fallback: nếu chưa có registered user nào, lấy từ players cũ
        const [rows] = await pool.query(`
            SELECT p.id, p.username, p.avatar, 
                   COALESCE(SUM(r.total_score), 0) as total_accumulated_score,
                   COALESCE(AVG(r.accuracy), 0) as avg_accuracy,
                   COUNT(r.id) as games_played,
                   COUNT(CASE WHEN r.final_rank = 1 THEN 1 END) as total_wins
            FROM players p
            JOIN game_player_results r ON p.id = r.player_id
            GROUP BY p.id, p.username, p.avatar
            ORDER BY total_accumulated_score DESC, total_wins DESC
            LIMIT 50
        `);

        const formatted = rows.map((r, idx) => ({
            rank: idx + 1,
            player_id: r.id,
            username: r.username,
            display_name: r.username,
            avatar: r.avatar,
            rating: 1000 + (r.total_wins * 25),
            level: 1,
            rank_display: 'Tân Binh Hải Tặc',
            rank_icon: '🥉',
            rank_color: '#cd7f32',
            total_score: parseInt(r.total_accumulated_score, 10),
            avg_accuracy: Math.round(r.avg_accuracy),
            games_played: r.games_played,
            wins: r.total_wins,
            is_registered: false
        }));

        res.json({ success: true, data: formatted });
    } catch (err) {
        console.error('Lỗi lấy global leaderboard:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy bảng xếp hạng.' });
    }
});

/**
 * GET /api/leaderboard/recent
 * Các trận đấu gần đây
 */
router.get('/recent', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT s.id as session_id, s.mode, s.started_at, s.finished_at,
                   q.title as quiz_title, t.name as topic_name,
                   (SELECT COUNT(*) FROM game_player_results WHERE game_session_id = s.id) as player_count,
                   (SELECT p.username FROM game_player_results r JOIN players p ON r.player_id = p.id WHERE r.game_session_id = s.id AND r.final_rank = 1 LIMIT 1) as winner_name
            FROM game_sessions s
            JOIN quizzes q ON s.quiz_id = q.id
            JOIN topics t ON q.topic_id = t.id
            WHERE s.finished_at IS NOT NULL
            ORDER BY s.finished_at DESC
            LIMIT 20
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Lỗi lấy recent games:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy lịch sử trận đấu.' });
    }
});

/**
 * GET /api/player/:id
 * Hồ sơ và thống kê chi tiết của một người chơi
 */
router.get('/player/:id', async (req, res) => {
    try {
        const playerId = parseInt(req.params.id, 10);
        const [playerRows] = await pool.query('SELECT * FROM players WHERE id = ?', [playerId]);
        if (playerRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy người chơi.' });
        }
        const player = playerRows[0];

        const [statsRows] = await pool.query(`
            SELECT COUNT(*) as games_played,
                   COALESCE(SUM(total_score), 0) as total_score,
                   COALESCE(MAX(total_score), 0) as best_score,
                   COALESCE(AVG(accuracy), 0) as avg_accuracy,
                   COUNT(CASE WHEN final_rank = 1 THEN 1 END) as wins,
                   COUNT(CASE WHEN final_rank <= 3 THEN 1 END) as top3_finishes
            FROM game_player_results 
            WHERE player_id = ?
        `, [playerId]);

        const stats = statsRows[0];

        const [recentGames] = await pool.query(`
            SELECT r.*, q.title as quiz_title, s.started_at 
            FROM game_player_results r
            JOIN game_sessions s ON r.game_session_id = s.id
            JOIN quizzes q ON s.quiz_id = q.id
            WHERE r.player_id = ?
            ORDER BY s.started_at DESC
            LIMIT 10
        `, [playerId]);

        res.json({
            success: true,
            player: {
                id: player.id,
                username: player.username,
                avatar: player.avatar,
                created_at: player.created_at
            },
            statistics: {
                games_played: stats.games_played,
                total_score: parseInt(stats.total_score, 10),
                best_score: parseInt(stats.best_score, 10),
                avg_accuracy: Math.round(stats.avg_accuracy),
                wins: stats.wins,
                top3_finishes: stats.top3_finishes
            },
            recent_games: recentGames
        });
    } catch (err) {
        console.error('Lỗi lấy player stats:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy thông tin người chơi.' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * POST /api/solo/start
 * Bắt đầu phiên thi đấu Solo hoặc Luyện tập
 */
router.post('/start', async (req, res) => {
    try {
        const { quiz_id, username, mode, session_token } = req.body;
        const quizId = parseInt(quiz_id, 10) || 1;
        const gameMode = mode === 'PRACTICE' ? 'PRACTICE' : 'SOLO';
        const cleanUsername = String(username || 'Chiến Binh Solo').trim();

        // 1. Lấy thông tin quiz
        const [quizzes] = await pool.query('SELECT * FROM quizzes WHERE id = ?', [quizId]);
        if (quizzes.length === 0) {
            return res.status(404).json({ success: false, error: 'Bộ đề không tồn tại.' });
        }
        const quiz = quizzes[0];

        // 2. Lấy danh sách câu hỏi (Ưu tiên chính xác theo quiz_id để không bị lẫn câu hỏi giữa các đề)
        let query = 'SELECT * FROM questions WHERE quiz_id = ?';
        if (quiz.is_random) {
            query += ' ORDER BY RAND()';
        } else {
            query += ' ORDER BY id ASC';
        }
        query += ` LIMIT ${quiz.total_questions || 20}`;

        let [questions] = await pool.query(query, [quizId]);

        // Nếu đề thi chưa có câu hỏi trực tiếp gắn quiz_id, fallback theo topic_id mà không bị trùng đề khác
        if (questions.length === 0) {
            let fallbackQuery = 'SELECT * FROM questions WHERE topic_id = ? AND (quiz_id IS NULL OR quiz_id = ?)';
            if (quiz.is_random) fallbackQuery += ' ORDER BY RAND()';
            else fallbackQuery += ' ORDER BY id ASC';
            fallbackQuery += ` LIMIT ${quiz.total_questions || 20}`;
            const [fbQuestions] = await pool.query(fallbackQuery, [quiz.topic_id, quizId]);
            questions = fbQuestions;
        }

        if (questions.length === 0) {
            return res.status(400).json({ success: false, error: 'Chưa có câu hỏi nào trong bộ đề này.' });
        }

        // 3. Đăng ký Player nếu có session_token
        let playerId = null;
        if (session_token) {
            try {
                const [pRes] = await pool.query(
                    `INSERT INTO players (username, session_token) 
                     VALUES (?, ?) 
                     ON DUPLICATE KEY UPDATE username = VALUES(username), last_active = CURRENT_TIMESTAMP`,
                    [cleanUsername, session_token]
                );
                playerId = pRes.insertId;
                if (!playerId) {
                    const [pRows] = await pool.query('SELECT id FROM players WHERE session_token = ?', [session_token]);
                    if (pRows.length > 0) playerId = pRows[0].id;
                }
            } catch (pErr) {
                console.error('Lỗi player solo:', pErr.message);
            }
        }

        // 4. Tạo Game Session và Snapshot bất biến
        const [sessRes] = await pool.query(
            'INSERT INTO game_sessions (quiz_id, mode, total_questions_count) VALUES (?, ?, ?)',
            [quizId, gameMode, questions.length]
        );
        const gameSessionId = sessRes.insertId;

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            await pool.query(
                `INSERT INTO game_session_questions 
                (game_session_id, question_order, original_question_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, category, difficulty, arc, chapter)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [gameSessionId, i + 1, q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.explanation, q.category, q.difficulty, q.arc || 'Chung', q.chapter || 'Chung']
            );
        }

        // 5. Trả về câu hỏi (Ẩn đáp án đúng)
        const clientQuestions = questions.map((q, idx) => ({
            order: idx + 1,
            id: q.id,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            category: q.category || 'Chung',
            difficulty: q.difficulty || 1,
            arc: q.arc || 'Chung',
            chapter: q.chapter || 'Chung'
        }));

        res.json({
            success: true,
            game_session_id: gameSessionId,
            quiz: {
                id: quiz.id,
                title: quiz.title,
                time_per_question: quiz.time_per_question,
                total_questions: questions.length,
                mode: gameMode
            },
            questions: clientQuestions
        });
    } catch (err) {
        console.error('Lỗi bắt đầu solo:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi tạo phiên thi đấu solo.' });
    }
});

/**
 * POST /api/solo/check
 * Kiểm tra đáp án câu hỏi tức thì (Dành cho Solo Practice Mode)
 */
router.post('/check', async (req, res) => {
    try {
        const { game_session_id, question_order, question_id, selected_answer } = req.body;

        let q = null;
        if (game_session_id && question_order) {
            const [rows] = await pool.query(
                'SELECT * FROM game_session_questions WHERE game_session_id = ? AND question_order = ?',
                [game_session_id, question_order]
            );
            if (rows.length > 0) q = rows[0];
        } else if (question_id) {
            const [rows] = await pool.query('SELECT * FROM questions WHERE id = ?', [question_id]);
            if (rows.length > 0) q = rows[0];
        }

        if (!q) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy câu hỏi.' });
        }

        const isCorrect = String(selected_answer).toUpperCase() === String(q.correct_answer).toUpperCase();

        res.json({
            success: true,
            is_correct: isCorrect,
            correct_answer: q.correct_answer,
            explanation: q.explanation || 'Không có giải thích bổ sung.',
            category: q.category,
            difficulty: q.difficulty,
            arc: q.arc || 'Chung',
            chapter: q.chapter || 'Chung'
        });
    } catch (err) {
        console.error('Lỗi check solo answer:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi kiểm tra đáp án.' });
    }
});

/**
 * POST /api/solo/submit
 * Nộp toàn bộ bài Solo -> Tính điểm, xếp hạng Larper và lưu kết quả
 */
router.post('/submit', async (req, res) => {
    try {
        const { game_session_id, answers, session_token } = req.body;
        if (!game_session_id || !answers) {
            return res.status(400).json({ success: false, error: 'Dữ liệu nộp bài không hợp lệ.' });
        }

        // Lấy snapshot câu hỏi của game_session_id
        const [questions] = await pool.query(
            'SELECT * FROM game_session_questions WHERE game_session_id = ? ORDER BY question_order ASC',
            [game_session_id]
        );

        if (questions.length === 0) {
            return res.status(404).json({ success: false, error: 'Phiên thi đấu không tồn tại.' });
        }

        let score = 0;
        let correctCount = 0;
        let wrongCount = 0;
        let streak = 0;
        let maxStreak = 0;

        const results = questions.map((q) => {
            const userAns = answers[q.question_order] || answers[q.original_question_id] || null;
            const isCorrect = userAns && String(userAns).toUpperCase() === String(q.correct_answer).toUpperCase();

            let pointsAwarded = 0;
            if (isCorrect) {
                correctCount++;
                streak++;
                if (streak > maxStreak) maxStreak = streak;

                const basePoints = { 1: 10, 2: 20, 3: 30, 4: 50, 5: 75, 6: 100 };
                pointsAwarded = basePoints[q.difficulty] || 10;
                if (streak >= 3) pointsAwarded += 10;
                score += pointsAwarded;
            } else {
                wrongCount++;
                streak = 0;
            }

            return {
                question_order: q.question_order,
                question_text: q.question_text,
                user_answer: userAns,
                correct_answer: q.correct_answer,
                is_correct: isCorrect,
                points_awarded: pointsAwarded,
                explanation: q.explanation
            };
        });

        const totalQuestions = questions.length;
        const accuracy = Math.round((correctCount / totalQuestions) * 100);

        // Đánh giá xếp hạng Larper
        let rank = '';
        let rankMessage = '';
        if (accuracy === 100) {
            rank = 'FAN CHÂN CHÍNH (NO LARPER)';
            rankMessage = 'Tuyệt đối chính xác! Bạn nắm trọn vẹn mọi kiến thức!';
        } else if (accuracy >= 80) {
            rank = 'ĐẠI HẢI TẶC REAL';
            rankMessage = 'Kiến thức cực kỳ vững chắc, chỉ sơ suất vài chi tiết nhỏ.';
        } else if (accuracy >= 50) {
            rank = 'CÓ DẤU HIỆU LARPER';
            rankMessage = 'Có hiểu biết cơ bản nhưng cần đọc kỹ nguyên tác hơn.';
        } else {
            rank = 'LARPER CHÍNH HIỆU (CHỈ XEM TIKTOK)';
            rankMessage = 'Bạn cần xem lại toàn bộ từ đầu để xóa bỏ danh xưng Larper!';
        }

        // Lưu kết quả vào DB
        await pool.query('UPDATE game_sessions SET finished_at = CURRENT_TIMESTAMP WHERE id = ?', [game_session_id]);

        if (session_token) {
            const [pRows] = await pool.query('SELECT id FROM players WHERE session_token = ?', [session_token]);
            if (pRows.length > 0) {
                const playerId = pRows[0].id;
                await pool.query(
                    `INSERT INTO game_player_results 
                    (game_session_id, player_id, total_score, correct_count, wrong_count, accuracy, final_rank)
                    VALUES (?, ?, ?, ?, ?, ?, 1)`,
                    [game_session_id, playerId, score, correctCount, wrongCount, accuracy]
                );
            }
        }

        res.json({
            success: true,
            summary: {
                total_questions: totalQuestions,
                correct_count: correctCount,
                wrong_count: wrongCount,
                accuracy_percentage: accuracy,
                score,
                max_streak: maxStreak,
                rank,
                rank_message: rankMessage
            },
            details: results
        });
    } catch (err) {
        console.error('Lỗi submit solo:', err);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ khi tổng kết điểm.' });
    }
});

module.exports = router;

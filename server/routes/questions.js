const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * GET /api/questions
 * Lấy danh sách câu hỏi cho người chơi.
 * QUAN TRỌNG: TUYỆT ĐỐI KHÔNG trả về `correct_answer` và `explanation` để bảo mật.
 */
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, question_text, option_a, option_b, option_c, option_d, category, difficulty FROM questions ORDER BY id ASC'
        );
        res.json({
            success: true,
            total: rows.length,
            data: rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách câu hỏi:', error);
        res.status(500).json({
            success: false,
            error: 'Không thể tải câu hỏi từ cơ sở dữ liệu.'
        });
    }
});

/**
 * POST /api/quiz/submit
 * Chấm điểm bài làm của người dùng trên server.
 * Body: { answers: { "1": "C", "2": "A" } } hoặc { answers: [{ questionId: 1, answer: "C" }] }
 */
router.post('/submit', async (req, res) => {
    try {
        const rawAnswers = req.body.answers || {};
        // Chuẩn hóa input về dạng object { [id]: answer }
        let userAnswers = {};
        if (Array.isArray(rawAnswers)) {
            rawAnswers.forEach(item => {
                if (item && item.questionId) {
                    userAnswers[item.questionId] = item.answer;
                }
            });
        } else if (typeof rawAnswers === 'object') {
            userAnswers = rawAnswers;
        }

        // Lấy toàn bộ câu hỏi và đáp án đúng từ database để chấm
        const [allQuestions] = await pool.query(
            'SELECT id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, category, difficulty FROM questions ORDER BY id ASC'
        );

        if (allQuestions.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Chưa có câu hỏi nào trong hệ thống.'
            });
        }

        let correctCount = 0;
        let totalScore = 0;
        const details = [];

        allQuestions.forEach(q => {
            const userChoice = userAnswers[q.id] ? String(userAnswers[q.id]).toUpperCase() : null;
            const isCorrect = userChoice === q.correct_answer;

            if (isCorrect) {
                correctCount++;
                // Tính điểm theo difficulty (1: 10đ, 2: 20đ, 3: 30đ, 4: 50đ, 5: 75đ, 6: 100đ)
                const pointTable = { 1: 10, 2: 20, 3: 30, 4: 50, 5: 75, 6: 100 };
                totalScore += pointTable[q.difficulty] || 10;
            }

            details.push({
                id: q.id,
                question_text: q.question_text,
                option_a: q.option_a,
                option_b: q.option_b,
                option_c: q.option_c,
                option_d: q.option_d,
                user_answer: userChoice,
                correct_answer: q.correct_answer,
                is_correct: isCorrect,
                explanation: q.explanation,
                category: q.category,
                difficulty: q.difficulty
            });
        });

        const totalQuestions = allQuestions.length;
        const accuracy = Math.round((correctCount / totalQuestions) * 100);

        // Đánh giá xếp hạng One Piece
        let rank = "";
        let rankMessage = "";
        if (accuracy === 100) {
            rank = "☀️ JOY BOY";
            rankMessage = "Không tì vết! Kiến thức One Piece của bạn đạt mức độ Thần thoại!";
        } else if (accuracy >= 90) {
            rank = "👑 YONKO";
            rankMessage = "Bạn nắm giữ uy quyền tuyệt đối tại Tân Thế Giới!";
        } else if (accuracy >= 75) {
            rank = "🛡️ YONKO COMMANDER";
            rankMessage = "Kiến thức đáng nể, cánh tay đắc lực của Tứ Hoàng!";
        } else if (accuracy >= 60) {
            rank = "🔥 NEW WORLD PIRATE";
            rankMessage = "Đủ bản lĩnh sinh tồn ở nửa sau của Grand Line!";
        } else if (accuracy >= 40) {
            rank = "🏴‍☠️ SUPERNOVA";
            rankMessage = "Một tân binh siêu hạng đầy triển vọng!";
        } else if (accuracy >= 20) {
            rank = "⚓ PIRATE";
            rankMessage = "Hải tặc bình thường, hãy dong buồm học hỏi thêm!";
        } else {
            rank = "👶 EAST BLUE ROOKIE";
            rankMessage = "Bạn mới xem tóm tắt phim đúng không? Cần xem lại từ đầu nhé!";
        }

        res.json({
            success: true,
            summary: {
                total_questions: totalQuestions,
                correct_count: correctCount,
                wrong_count: totalQuestions - correctCount,
                accuracy_percentage: accuracy,
                score: totalScore,
                rank: rank,
                rank_message: rankMessage
            },
            details: details
        });

    } catch (error) {
        console.error('Lỗi khi chấm điểm quiz:', error);
        res.status(500).json({
            success: false,
            error: 'Không thể chấm điểm bài thi lúc này.'
        });
    }
});

module.exports = router;

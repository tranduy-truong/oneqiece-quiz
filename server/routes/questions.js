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
 * POST /api/quiz/check
 * Kiểm tra ngay đáp án khi người dùng vừa chọn 1 câu hỏi
 * Body: { question_id: 1, selected_answer: "A" }
 */
router.post('/check', async (req, res) => {
    try {
        const { question_id, selected_answer } = req.body;
        const qId = parseInt(question_id, 10);
        const userChoice = selected_answer ? String(selected_answer).toUpperCase().trim() : null;

        if (!qId || !userChoice) {
            return res.status(400).json({
                success: false,
                error: 'Thiếu thông tin câu hỏi hoặc đáp án đã chọn.'
            });
        }

        const [rows] = await pool.query(
            'SELECT id, correct_answer, explanation, category, difficulty FROM questions WHERE id = ?',
            [qId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy câu hỏi.'
            });
        }

        const question = rows[0];
        const isCorrect = userChoice === question.correct_answer;

        res.json({
            success: true,
            is_correct: isCorrect,
            user_answer: userChoice,
            correct_answer: question.correct_answer,
            explanation: question.explanation || '',
            category: question.category,
            difficulty: question.difficulty
        });

    } catch (error) {
        console.error('Lỗi khi kiểm tra câu hỏi:', error);
        res.status(500).json({
            success: false,
            error: 'Không thể kiểm tra đáp án lúc này.'
        });
    }
});

/**
 * POST /api/quiz/submit
 * Chấm điểm toàn bộ bài làm và xếp hạng Larper
 * Body: { answers: { "1": "C", "2": "A" } }
 */
router.post('/submit', async (req, res) => {
    try {
        const rawAnswers = req.body.answers || {};
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

        // Xếp hạng trình độ - Chống Larper
        let rank = "";
        let rankMessage = "";
        if (accuracy === 100) {
            rank = "FAN CHÂN CHÍNH (NO LARPER)";
            rankMessage = "Tuyệt đối không tì vết! Bạn là một bậc thầy One Piece thực thụ.";
        } else if (accuracy >= 85) {
            rank = "ĐẠI HẢI TẶC REAL";
            rankMessage = "Kiến thức cực kỳ vững vàng, chứng minh bạn đọc kỹ từng trang truyện!";
        } else if (accuracy >= 70) {
            rank = "NGƯỜI XEM NGHIÊM TÚC";
            rankMessage = "Khá tốt! Bạn thực sự yêu thích và nhớ rõ các tình tiết chính.";
        } else if (accuracy >= 50) {
            rank = "CÓ DẤU HIỆU LARPER";
            rankMessage = "Bạn xem hơi vội hoặc đã lâu chưa đọc lại truyện đúng không?";
        } else {
            rank = "LARPER CHÍNH HIỆU";
            rankMessage = "Bạn mới chỉ xem clip tóm tắt trên Tiktok và Youtube Shorts đúng không? Hãy cày lại từ đầu!";
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

/**
 * One Piece Quiz - Instant Feedback & Larper Test
 */

// Hình ảnh loading có thể tùy chỉnh dễ dàng tại đây (URL ảnh hoặc GIF)
const CUSTOM_LOADING_IMAGE = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZhcTJ3MXZyc3BvMDk1Y3JpNmZ1cXZ6bzNxeG1mczN0cmRhNWpldCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9az09tlYyYNfq/giphy.gif';

let questions = [];
let currentIndex = 0;
let userAnswers = {}; // { questionId: 'A' }
let score = 0;
let streak = 0;
let maxStreak = 0;
let correctCount = 0;
let answeredCurrent = false;

// DOM Elements
const loadingState = document.getElementById('loading-state');
const loadingImage = document.getElementById('loading-image');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');

const questionProgress = document.getElementById('question-progress');
const scoreDisplay = document.getElementById('score-display');
const streakDisplay = document.getElementById('streak-display');
const progressBar = document.getElementById('progress-bar');
const badgeCategory = document.getElementById('badge-category');
const badgeDifficulty = document.getElementById('badge-difficulty');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');

const explanationBox = document.getElementById('explanation-box');
const explanationStatus = document.getElementById('explanation-status');
const explanationText = document.getElementById('explanation-text');
const explanationNote = document.getElementById('explanation-note');
const btnNext = document.getElementById('btn-next');

// Khởi chạy khi load trang
document.addEventListener('DOMContentLoaded', () => {
    if (loadingImage && CUSTOM_LOADING_IMAGE) {
        loadingImage.src = CUSTOM_LOADING_IMAGE;
    }
    loadQuestions();
});

/**
 * Tải danh sách câu hỏi từ Backend API
 */
async function loadQuestions() {
    loadingState.style.display = 'flex';
    errorState.style.display = 'none';
    quizScreen.style.display = 'none';
    resultScreen.style.display = 'none';

    try {
        const response = await fetch('/api/questions');
        const result = await response.json();

        if (response.ok && result.success && result.data.length > 0) {
            questions = result.data;
            currentIndex = 0;
            score = 0;
            streak = 0;
            maxStreak = 0;
            correctCount = 0;
            userAnswers = {};

            // Hiển thị giao diện mượt mà
            setTimeout(() => {
                loadingState.style.display = 'none';
                quizScreen.style.display = 'block';
                renderCurrentQuestion();
            }, 500);
        } else {
            throw new Error(result.error || 'Chưa có câu hỏi nào trong hệ thống.');
        }
    } catch (err) {
        console.error('Lỗi tải câu hỏi:', err);
        loadingState.style.display = 'none';
        errorState.style.display = 'block';
        errorMessage.innerText = err.message || 'Không thể kết nối đến cơ sở dữ liệu.';
    }
}

/**
 * Hiển thị câu hỏi hiện tại
 */
function renderCurrentQuestion() {
    if (questions.length === 0) return;
    answeredCurrent = false;

    const q = questions[currentIndex];

    // Cập nhật thông số
    questionProgress.innerText = `Câu ${currentIndex + 1} / ${questions.length}`;
    scoreDisplay.innerText = score;
    streakDisplay.innerText = streak;

    const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
    progressBar.style.width = `${progressPercent}%`;

    badgeCategory.innerText = q.category || 'Chung';
    badgeDifficulty.innerText = `Level ${q.difficulty || 1}`;

    questionText.innerText = q.question_text;

    // Render 4 options
    optionsContainer.innerHTML = '';
    const options = [
        { key: 'A', text: q.option_a },
        { key: 'B', text: q.option_b },
        { key: 'C', text: q.option_c },
        { key: 'D', text: q.option_d }
    ];

    options.forEach(opt => {
        const optEl = document.createElement('div');
        optEl.className = 'option-item';
        optEl.dataset.key = opt.key;
        optEl.onclick = () => handleSelectOption(q.id, opt.key, optEl);

        optEl.innerHTML = `
            <div class="option-key">${opt.key}</div>
            <div class="option-text">${escapeHtml(opt.text)}</div>
        `;
        optionsContainer.appendChild(optEl);
    });

    // Ẩn bảng giải thích
    explanationBox.style.display = 'none';
}

/**
 * Xử lý khi người dùng bấm chọn đáp án (Hiện ngay kết quả & giải thích)
 */
async function handleSelectOption(questionId, selectedKey, clickedElement) {
    if (answeredCurrent) return; // Khóa chọn lại
    answeredCurrent = true;

    // Khóa tất cả các nút đáp án
    const allOptions = document.querySelectorAll('.option-item');
    allOptions.forEach(el => el.classList.add('disabled'));

    userAnswers[questionId] = selectedKey;

    try {
        const response = await fetch('/api/quiz/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_id: questionId, selected_answer: selectedKey })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            const isCorrect = data.is_correct;
            const correctKey = data.correct_answer;

            if (isCorrect) {
                clickedElement.classList.add('correct');
                explanationStatus.className = 'explanation-status correct';
                explanationStatus.innerText = 'CHÍNH XÁC!';

                correctCount++;
                streak++;
                if (streak > maxStreak) maxStreak = streak;

                // Tính điểm cộng thêm theo streak
                const pointTable = { 1: 10, 2: 20, 3: 30, 4: 50, 5: 75, 6: 100 };
                let pts = pointTable[data.difficulty] || 10;
                if (streak >= 3) pts += 10;
                score += pts;
            } else {
                clickedElement.classList.add('wrong');
                explanationStatus.className = 'explanation-status wrong';
                explanationStatus.innerText = `CHƯA CHÍNH XÁC! (Đáp án đúng là: ${correctKey})`;

                // Highlight đáp án đúng màu xanh
                allOptions.forEach(el => {
                    if (el.dataset.key === correctKey) {
                        el.classList.add('correct');
                    }
                });

                streak = 0;
            }

            // Cập nhật hiển thị điểm và streak
            scoreDisplay.innerText = score;
            streakDisplay.innerText = streak;

            // Hiển thị lời giải thích
            explanationText.innerText = data.explanation || 'Không có giải thích bổ sung cho câu hỏi này.';
            explanationNote.innerText = `Chủ đề: ${data.category || 'Chung'} | Độ khó: Level ${data.difficulty || 1}`;

            // Nút tiếp theo
            const isLastQuestion = currentIndex >= questions.length - 1;
            btnNext.innerText = isLastQuestion ? 'Xem Kết Quả Đánh Giá ➔' : 'Câu Tiếp Theo ➔';

            explanationBox.style.display = 'block';

        } else {
            alert(data.error || 'Lỗi khi kiểm tra đáp án.');
        }
    } catch (err) {
        console.error('Lỗi check answer:', err);
        alert('Lỗi kết nối máy chủ.');
    }
}

/**
 * Chuyển sang câu hỏi tiếp theo hoặc nộp bài
 */
function nextQuestion() {
    currentIndex++;
    if (currentIndex >= questions.length) {
        finishQuiz();
    } else {
        renderCurrentQuestion();
    }
}

/**
 * Hoàn thành bài trắc nghiệm và hiển thị kết quả
 */
async function finishQuiz() {
    quizScreen.style.display = 'none';
    loadingState.style.display = 'flex';

    try {
        const response = await fetch('/api/quiz/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: userAnswers })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            loadingState.style.display = 'none';
            resultScreen.style.display = 'block';

            const summary = result.summary;
            document.getElementById('result-rank').innerText = summary.rank;
            document.getElementById('result-rank-desc').innerText = summary.rank_message;
            document.getElementById('stat-score').innerText = summary.score;
            document.getElementById('stat-accuracy').innerText = `${summary.accuracy_percentage}%`;
            document.getElementById('stat-correct').innerText = `${summary.correct_count} / ${summary.total_questions}`;
            document.getElementById('stat-max-streak').innerText = maxStreak;

            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            throw new Error(result.error || 'Có lỗi xảy ra khi tổng kết điểm.');
        }
    } catch (err) {
        loadingState.style.display = 'none';
        alert(`Lỗi tổng kết: ${err.message}`);
    }
}

/**
 * Làm lại bài trắc nghiệm từ đầu
 */
function restartQuiz() {
    loadQuestions();
}

/**
 * Helper escape HTML
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

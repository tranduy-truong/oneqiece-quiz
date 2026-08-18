/**
 * One Piece Quiz Application - Client-side Logic
 */

let questions = [];
let currentIndex = 0;
let userAnswers = {}; // { questionId: 'A' | 'B' | 'C' | 'D' }

// DOM Elements
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');

const questionProgress = document.getElementById('question-progress');
const answeredCounter = document.getElementById('answered-counter');
const progressBar = document.getElementById('progress-bar');
const badgeCategory = document.getElementById('badge-category');
const badgeDifficulty = document.getElementById('badge-difficulty');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const questionNavigator = document.getElementById('question-navigator');

const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnSubmit = document.getElementById('btn-submit');

// Khởi chạy khi load trang
document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
});

/**
 * Tải danh sách câu hỏi từ Backend API
 */
async function loadQuestions() {
    loadingState.style.display = 'block';
    errorState.style.display = 'none';
    quizScreen.style.display = 'none';
    resultScreen.style.display = 'none';

    try {
        const response = await fetch('/api/questions');
        const result = await response.json();

        if (response.ok && result.success && result.data.length > 0) {
            questions = result.data;
            currentIndex = 0;
            userAnswers = {};

            loadingState.style.display = 'none';
            quizScreen.style.display = 'block';

            renderNavigator();
            renderCurrentQuestion();
        } else {
            throw new Error(result.error || 'Chưa có câu hỏi nào trong hệ thống.');
        }
    } catch (err) {
        console.error('Lỗi tải câu hỏi:', err);
        loadingState.style.display = 'none';
        errorState.style.display = 'block';
        errorMessage.innerText = err.message || 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại MySQL.';
    }
}

/**
 * Vẽ bảng điều hướng số câu hỏi
 */
function renderNavigator() {
    questionNavigator.innerHTML = '';
    questions.forEach((q, idx) => {
        const item = document.createElement('div');
        item.className = 'nav-grid-item';
        item.id = `nav-item-${idx}`;
        item.innerText = idx + 1;
        item.onclick = () => jumpToQuestion(idx);
        questionNavigator.appendChild(item);
    });
    updateNavigatorState();
}

/**
 * Cập nhật trạng thái hiển thị của các nút trong bảng điều hướng
 */
function updateNavigatorState() {
    questions.forEach((q, idx) => {
        const item = document.getElementById(`nav-item-${idx}`);
        if (!item) return;

        item.classList.remove('active', 'answered');

        if (userAnswers[q.id]) {
            item.classList.add('answered');
        }

        if (idx === currentIndex) {
            item.classList.add('active');
        }
    });

    // Cập nhật số câu đã trả lời
    const answeredCount = Object.keys(userAnswers).length;
    answeredCounter.innerText = `Đã làm: ${answeredCount}/${questions.length}`;
}

/**
 * Hiển thị câu hỏi hiện tại
 */
function renderCurrentQuestion() {
    if (questions.length === 0) return;

    const q = questions[currentIndex];

    // Cập nhật thông tin tiến độ
    questionProgress.innerText = `Câu ${currentIndex + 1} / ${questions.length}`;
    const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
    progressBar.style.width = `${progressPercent}%`;

    // Cập nhật Badge
    badgeCategory.innerText = q.category || 'Chung';
    badgeDifficulty.innerText = `Level ${q.difficulty || 1}`;

    // Cập nhật nội dung câu hỏi
    questionText.innerText = q.question_text;

    // Cập nhật danh sách 4 lựa chọn
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
        if (userAnswers[q.id] === opt.key) {
            optEl.classList.add('selected');
        }

        optEl.onclick = () => selectOption(q.id, opt.key);

        optEl.innerHTML = `
            <div class="option-key">${opt.key}</div>
            <div class="option-text">${escapeHtml(opt.text)}</div>
        `;
        optionsContainer.appendChild(optEl);
    });

    // Cập nhật trạng thái các nút điều hướng
    btnPrev.disabled = currentIndex === 0;
    btnNext.disabled = currentIndex === questions.length - 1;

    updateNavigatorState();
}

/**
 * Xử lý khi người dùng chọn đáp án
 */
function selectOption(questionId, optionKey) {
    userAnswers[questionId] = optionKey;
    renderCurrentQuestion();
}

/**
 * Chuyển tới câu hỏi trước
 */
function prevQuestion() {
    if (currentIndex > 0) {
        currentIndex--;
        renderCurrentQuestion();
    }
}

/**
 * Chuyển tới câu hỏi kế tiếp
 */
function nextQuestion() {
    if (currentIndex < questions.length - 1) {
        currentIndex++;
        renderCurrentQuestion();
    }
}

/**
 * Nhảy tới câu hỏi cụ thể theo index
 */
function jumpToQuestion(index) {
    if (index >= 0 && index < questions.length) {
        currentIndex = index;
        renderCurrentQuestion();
    }
}

/**
 * Xác nhận nộp bài
 */
function confirmSubmit() {
    const answeredCount = Object.keys(userAnswers).length;
    const total = questions.length;

    let confirmMsg = `Bạn đã hoàn thành ${answeredCount}/${total} câu hỏi. Bạn có chắc chắn muốn nộp bài?`;
    if (answeredCount < total) {
        confirmMsg = `⚠️ Bạn còn ${total - answeredCount} câu chưa trả lời. Bạn vẫn muốn nộp bài ngay bây giờ?`;
    }

    if (confirm(confirmMsg)) {
        submitQuiz();
    }
}

/**
 * Gửi bài làm lên Server để chấm điểm
 */
async function submitQuiz() {
    btnSubmit.disabled = true;
    btnSubmit.innerText = '⏳ Đang chấm điểm...';

    try {
        const response = await fetch('/api/quiz/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ answers: userAnswers })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showResult(result.summary, result.details);
        } else {
            throw new Error(result.error || 'Có lỗi xảy ra khi chấm điểm.');
        }
    } catch (err) {
        alert(`Lỗi nộp bài: ${err.message}`);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = '🚩 Nộp bài';
    }
}

/**
 * Hiển thị màn hình kết quả chi tiết
 */
function showResult(summary, details) {
    quizScreen.style.display = 'none';
    resultScreen.style.display = 'block';

    // Cuộn lên đầu trang mượt mà
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Hiển thị thông số tổng kết
    document.getElementById('result-rank').innerText = summary.rank;
    document.getElementById('result-rank-desc').innerText = summary.rank_message;
    document.getElementById('stat-score').innerText = summary.score;
    document.getElementById('stat-accuracy').innerText = `${summary.accuracy_percentage}%`;
    document.getElementById('stat-correct').innerText = `${summary.correct_count} / ${summary.total_questions}`;

    // Hiển thị chi tiết từng câu
    const reviewList = document.getElementById('review-list');
    reviewList.innerHTML = '';

    details.forEach((item, idx) => {
        const reviewEl = document.createElement('div');
        reviewEl.className = `review-item ${item.is_correct ? 'correct' : 'wrong'}`;

        const userAnsText = item.user_answer ? `Đáp án của bạn: ${item.user_answer}` : 'Bạn chưa trả lời';
        const statusBadge = item.is_correct ? '🟢 Đúng' : '🔴 Sai';

        const optionMap = {
            'A': item.option_a,
            'B': item.option_b,
            'C': item.option_c,
            'D': item.option_d
        };

        const correctFullText = `${item.correct_answer}. ${optionMap[item.correct_answer] || ''}`;
        const userFullText = item.user_answer ? `${item.user_answer}. ${optionMap[item.user_answer] || ''}` : 'Chưa chọn';

        reviewEl.innerHTML = `
            <div class="review-q-text">Câu ${idx + 1}: ${escapeHtml(item.question_text)}</div>
            <div class="review-ans-info">
                <span class="ans-tag user">${statusBadge} - ${userAnsText} (${escapeHtml(userFullText)})</span>
                <span class="ans-tag correct">Đáp án đúng: ${escapeHtml(correctFullText)}</span>
            </div>
            ${item.explanation ? `<div class="review-explanation"><strong>💡 Giải thích:</strong> ${escapeHtml(item.explanation)}</div>` : ''}
        `;

        reviewList.appendChild(reviewEl);
    });
}

/**
 * Làm lại bài kiểm tra
 */
function restartQuiz() {
    userAnswers = {};
    currentIndex = 0;
    resultScreen.style.display = 'none';
    quizScreen.style.display = 'block';
    renderNavigator();
    renderCurrentQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Helper escape HTML chống XSS
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

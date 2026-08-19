/**
 * Solo & Practice Mode Controller
 */

let GIF_CORRECT = 'https://media1.tenor.com/m/nI7qFkM-K_wAAAAC/tony-tony-chopper-dance.gif';
let GIF_WRONG = 'https://media.tenor.com/nXjNCZY_PE4AAAAM/happy-dance-moves.gif';
let GIF_LOADING = 'https://media1.tenor.com/m/EQLp7bbM_7gAAAAC/kizaru-smile-one-piece.gif';

let OPTION_IMAGES = {
    'A': '/images/A.jpg',
    'B': '/images/B.jpg',
    'C': '/images/C.jpg',
    'D': '/images/D.jpg'
};

let questions = [];
let currentIndex = 0;
let answeredRecords = {};
let score = 0;
let streak = 0;
let maxStreak = 0;
let correctCount = 0;
let gameSessionId = null;
let currentMode = 'SOLO';

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const loadingState = document.getElementById('loading-state');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');

const selectQuiz = document.getElementById('select-quiz');
const selectMode = document.getElementById('select-mode');
const playerUsername = document.getElementById('player-username');

const questionProgress = document.getElementById('question-progress');
const scoreDisplay = document.getElementById('score-display');
const streakDisplay = document.getElementById('streak-display');
const progressBar = document.getElementById('progress-bar');
const badgeArc = document.getElementById('badge-arc') || document.getElementById('badge-category');
const badgeChapter = document.getElementById('badge-chapter') || document.getElementById('badge-difficulty');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const questionNavigator = document.getElementById('question-navigator');

const explanationBox = document.getElementById('explanation-box');
const explanationGif = document.getElementById('explanation-gif');
const explanationStatus = document.getElementById('explanation-status');
const explanationText = document.getElementById('explanation-text');
const explanationNote = document.getElementById('explanation-note');

const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnFinish = document.getElementById('btn-finish');

// Tải danh sách bộ đề & media assets khi load trang
document.addEventListener('DOMContentLoaded', async () => {
    // Khôi phục nickname đã lưu nếu có
    const savedName = localStorage.getItem('player_username');
    if (savedName) playerUsername.value = savedName;

    await Promise.all([
        loadSiteMediaSettings(),
        loadQuizOptions()
    ]);
});

async function loadSiteMediaSettings() {
    try {
        const res = await fetch('/api/site/settings');
        const data = await res.json();
        if (res.ok && data.success && data.data) {
            const s = data.data;
            if (s.icon_option_a) OPTION_IMAGES['A'] = s.icon_option_a;
            if (s.icon_option_b) OPTION_IMAGES['B'] = s.icon_option_b;
            if (s.icon_option_c) OPTION_IMAGES['C'] = s.icon_option_c;
            if (s.icon_option_d) OPTION_IMAGES['D'] = s.icon_option_d;
            if (s.gif_correct) GIF_CORRECT = s.gif_correct;
            if (s.gif_wrong) GIF_WRONG = s.gif_wrong;
            if (s.gif_loading) {
                GIF_LOADING = s.gif_loading;
                const loadImg = document.querySelector('#loading-state img');
                if (loadImg) loadImg.src = s.gif_loading;
            }
            if (s.banner_image) {
                const bg = document.getElementById('site-bg-img');
                if (bg) bg.src = s.banner_image;
            }
        }
    } catch (e) {
        console.warn('Lỗi load media settings:', e);
    }
}

async function loadQuizOptions() {
    try {
        const res = await fetch('/api/quizzes');
        const result = await res.json();
        if (res.ok && result.success && result.data.length > 0) {
            selectQuiz.innerHTML = result.data.map(q => `
                <option value="${q.id}">
                    ${q.topic_icon || '⚓'} ${q.title} (${q.total_questions || 20} câu)
                </option>
            `).join('');
        } else {
            selectQuiz.innerHTML = '<option value="1">One Piece Grand Test (Mặc định)</option>';
        }
    } catch (err) {
        console.error('Lỗi tải quizzes:', err);
        selectQuiz.innerHTML = '<option value="1">One Piece Grand Test</option>';
    }
}

/**
 * Bắt đầu làm bài Solo
 */
async function startSoloGame() {
    const quizId = selectQuiz.value || 1;
    currentMode = selectMode.value || 'SOLO';
    const username = playerUsername.value.trim() || 'Hải Tặc Mũ Rơm';
    localStorage.setItem('player_username', username);

    let sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) {
        sessionToken = 'user_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem('session_token', sessionToken);
    }

    setupScreen.style.display = 'none';
    loadingState.style.display = 'flex';
    quizScreen.style.display = 'none';
    resultScreen.style.display = 'none';

    try {
        const response = await fetch('/api/solo/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quiz_id: quizId,
                username,
                mode: currentMode,
                session_token: sessionToken
            })
        });

        const result = await response.json();
        if (response.ok && result.success && result.questions.length > 0) {
            questions = result.questions;
            gameSessionId = result.game_session_id;
            currentIndex = 0;
            score = 0;
            streak = 0;
            maxStreak = 0;
            correctCount = 0;
            answeredRecords = {};

            setTimeout(() => {
                loadingState.style.display = 'none';
                quizScreen.style.display = 'block';
                renderNavigator();
                renderCurrentQuestion();
            }, 300);
        } else {
            throw new Error(result.error || 'Không thể tạo phiên thi đấu.');
        }
    } catch (err) {
        alert(err.message || 'Lỗi kết nối máy chủ.');
        loadingState.style.display = 'none';
        setupScreen.style.display = 'block';
    }
}

function renderNavigator() {
    questionNavigator.innerHTML = '';
    questions.forEach((q, idx) => {
        const item = document.createElement('div');
        item.className = 'nav-grid-item';
        item.id = `nav-dot-${idx}`;
        item.innerText = idx + 1;
        item.onclick = () => jumpToQuestion(idx);
        questionNavigator.appendChild(item);
    });
    updateNavigatorState();
}

function updateNavigatorState() {
    questions.forEach((q, idx) => {
        const dot = document.getElementById(`nav-dot-${idx}`);
        if (!dot) return;

        dot.className = 'nav-grid-item';

        if (answeredRecords[q.order || q.id]) {
            if (answeredRecords[q.order || q.id].is_correct) {
                dot.classList.add('answered-correct');
            } else {
                dot.classList.add('answered-wrong');
            }
        }

        if (idx === currentIndex) {
            dot.classList.add('active');
        }
    });

    const answeredCount = Object.keys(answeredRecords).length;
    if (answeredCount === questions.length) {
        btnFinish.style.display = 'inline-flex';
    } else {
        btnFinish.style.display = 'none';
    }
}

function renderCurrentQuestion() {
    if (questions.length === 0) return;

    const q = questions[currentIndex];
    const qKey = q.order || q.id;
    const record = answeredRecords[qKey];

    questionProgress.innerText = `Câu ${currentIndex + 1} / ${questions.length}`;
    scoreDisplay.innerText = score;
    streakDisplay.innerText = streak;

    const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
    progressBar.style.width = `${progressPercent}%`;

    if (badgeArc) badgeArc.innerText = q.arc ? `Arc: ${q.arc}` : (q.category ? `Chủ đề: ${q.category}` : 'Arc: Chung');
    if (badgeChapter) badgeChapter.innerText = q.chapter ? (q.chapter.toLowerCase().includes('chapter') ? q.chapter : `Chapter: ${q.chapter}`) : `Level ${q.difficulty || 1}`;

    questionText.innerText = q.question_text;

    optionsContainer.innerHTML = '';
    const options = [
        { key: 'A', text: q.option_a },
        { key: 'B', text: q.option_b },
        { key: 'C', text: q.option_c },
        { key: 'D', text: q.option_d }
    ];

    options.forEach(opt => {
        const optEl = document.createElement('div');
        optEl.className = 'arena-opt-btn';
        optEl.dataset.key = opt.key;
        optEl.dataset.choice = opt.key;

        if (record) {
            optEl.classList.add('disabled');
            if (opt.key === record.user_answer) {
                optEl.classList.add(record.is_correct ? 'correct' : 'wrong');
            }
            if (!record.is_correct && opt.key === record.correct_answer) {
                optEl.classList.add('correct');
            }
        } else {
            optEl.onclick = () => handleSelectOption(q, opt.key, optEl);
        }

        optEl.innerHTML = `
            <div class="option-key">
                <img src="${OPTION_IMAGES[opt.key]}" alt="${opt.key}" class="option-key-img">
            </div>
            <div class="option-text">${escapeHtml(opt.text)}</div>
        `;
        optionsContainer.appendChild(optEl);
    });

    if (record) {
        if (record.is_correct) {
            explanationBox.className = 'explanation-card correct-card';
            explanationGif.src = GIF_CORRECT;
            explanationStatus.className = 'explanation-status correct';
            explanationStatus.innerText = 'CHÍNH XÁC!';
        } else {
            explanationBox.className = 'explanation-card wrong-card';
            explanationGif.src = GIF_WRONG;
            explanationStatus.className = 'explanation-status wrong';
            explanationStatus.innerText = `CHƯA CHÍNH XÁC! (Đáp án đúng: ${record.correct_answer})`;
        }
        explanationText.innerText = record.explanation || 'Không có giải thích bổ sung.';
        explanationNote.innerText = `Chủ đề: ${record.category || 'Chung'} | Độ khó: Level ${record.difficulty || 1}`;
        explanationBox.style.display = 'block';
    } else {
        explanationBox.style.display = 'none';
    }

    btnPrev.disabled = currentIndex === 0;
    btnNext.disabled = currentIndex === questions.length - 1;

    updateNavigatorState();
}

async function handleSelectOption(q, selectedKey, clickedElement) {
    const qKey = q.order || q.id;
    if (answeredRecords[qKey]) return;

    const allOptions = document.querySelectorAll('.option-item');
    allOptions.forEach(el => el.classList.add('disabled'));

    try {
        const response = await fetch('/api/solo/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game_session_id: gameSessionId,
                question_order: q.order,
                question_id: q.id,
                selected_answer: selectedKey
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            const isCorrect = data.is_correct;
            const correctKey = data.correct_answer;

            answeredRecords[qKey] = {
                user_answer: selectedKey,
                is_correct: isCorrect,
                correct_answer: correctKey,
                explanation: data.explanation,
                category: data.category,
                difficulty: data.difficulty
            };

            if (isCorrect) {
                clickedElement.classList.add('correct');
                explanationBox.className = 'explanation-card correct-card';
                explanationGif.src = GIF_CORRECT;
                explanationStatus.className = 'explanation-status correct';
                explanationStatus.innerText = 'CHÍNH XÁC!';

                correctCount++;
                streak++;
                if (streak > maxStreak) maxStreak = streak;

                const pointTable = { 1: 10, 2: 20, 3: 30, 4: 50, 5: 75, 6: 100 };
                let pts = pointTable[data.difficulty] || 10;
                if (streak >= 3) {
                    pts += 10;
                    if (window.SoundFX) window.SoundFX.playStreak();
                } else {
                    if (window.SoundFX) window.SoundFX.playCorrect();
                }
                score += pts;
            } else {
                clickedElement.classList.add('wrong');
                explanationBox.className = 'explanation-card wrong-card';
                explanationGif.src = GIF_WRONG;
                explanationStatus.className = 'explanation-status wrong';
                explanationStatus.innerText = `CHƯA CHÍNH XÁC! (Đáp án đúng: ${correctKey})`;

                if (window.SoundFX) window.SoundFX.playWrong();

                allOptions.forEach(el => {
                    if (el.dataset.key === correctKey) {
                        el.classList.add('correct');
                    }
                });

                streak = 0;
            }

            scoreDisplay.innerText = score;
            streakDisplay.innerText = streak;

            const arcLabel = data.arc || data.category || 'Chung';
            const chapLabel = data.chapter || `Level ${data.difficulty || 1}`;
            explanationNote.innerText = `Arc: ${arcLabel} | Chapter: ${chapLabel}`;
            explanationBox.style.display = 'block';

            updateNavigatorState();
        }
    } catch (err) {
        console.error('Lỗi check answer:', err);
    }
}

function prevQuestion() {
    if (currentIndex > 0) {
        if (window.SoundFX) window.SoundFX.playClick();
        currentIndex--;
        renderCurrentQuestion();
    }
}

function nextQuestion() {
    if (currentIndex < questions.length - 1) {
        if (window.SoundFX) window.SoundFX.playClick();
        currentIndex++;
        renderCurrentQuestion();
    }
}

function jumpToQuestion(index) {
    if (index >= 0 && index < questions.length) {
        if (window.SoundFX) window.SoundFX.playClick();
        currentIndex = index;
        renderCurrentQuestion();
    }
}

async function finishSoloQuiz() {
    quizScreen.style.display = 'none';
    loadingState.style.display = 'flex';

    const answers = {};
    Object.keys(answeredRecords).forEach(k => {
        answers[k] = answeredRecords[k].user_answer;
    });

    const sessionToken = localStorage.getItem('session_token');

    try {
        const response = await fetch('/api/solo/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game_session_id: gameSessionId,
                answers,
                session_token: sessionToken
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            loadingState.style.display = 'none';
            resultScreen.style.display = 'block';

            if (window.SoundFX) window.SoundFX.playVictory();

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

function restartSoloGame() {
    resultScreen.style.display = 'none';
    setupScreen.style.display = 'block';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

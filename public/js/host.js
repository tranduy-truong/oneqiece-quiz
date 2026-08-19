/**
 * Host Screen Socket Controller
 */

const socket = io();

let currentRoomCode = '';
let hostSessionToken = '';
let hostTimerInterval = null;
let totalPlayersInGame = 0;

// Screens
const hostSetupCard = document.getElementById('host-setup-card');
const hostLobbyCard = document.getElementById('host-lobby-card');
const hostQuestionCard = document.getElementById('host-question-card');
const hostResultCard = document.getElementById('host-result-card');
const hostLeaderboardCard = document.getElementById('host-leaderboard-card');
const hostPodiumCard = document.getElementById('host-podium-card');
const hostCountdownOverlay = document.getElementById('host-countdown-overlay');

const hostSelectQuiz = document.getElementById('host-select-quiz');

document.addEventListener('DOMContentLoaded', async () => {
    hostSessionToken = localStorage.getItem('host_token');
    if (!hostSessionToken) {
        hostSessionToken = 'host_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        localStorage.setItem('host_token', hostSessionToken);
    }

    await loadHostQuizzes();
});

async function loadHostQuizzes() {
    try {
        const res = await fetch('/api/quizzes');
        const data = await res.json();
        if (res.ok && data.success && data.data.length > 0) {
            hostSelectQuiz.innerHTML = data.data.map(q => `
                <option value="${q.id}">
                    ${q.topic_icon || '⚓'} ${q.title} (${q.total_questions || 20} câu - ${q.time_per_question || 15}s/câu)
                </option>
            `).join('');
        }
    } catch (err) {
        console.error('Lỗi tải quizzes host:', err);
    }
}

function showHostScreen(screenEl) {
    const screens = [hostSetupCard, hostLobbyCard, hostQuestionCard, hostResultCard, hostLeaderboardCard, hostPodiumCard];
    screens.forEach(s => {
        if (s) s.style.display = 'none';
    });
    if (screenEl) screenEl.style.display = 'block';
}

/**
 * Host gửi lệnh tạo phòng
 */
function handleCreateRoom() {
    const quizId = hostSelectQuiz.value;
    const maxPlayers = document.getElementById('host-max-players').value;
    const isPublic = document.getElementById('host-is-public').value === 'true';

    if (!quizId) {
        alert('Vui lòng chọn bộ đề thi.');
        return;
    }

    socket.emit('CREATE_ROOM', {
        quiz_id: quizId,
        max_players: maxPlayers,
        is_public: isPublic,
        host_token: hostSessionToken
    }, (res) => {
        if (res.success) {
            currentRoomCode = res.data.roomCode;
            document.getElementById('host-display-code').innerText = currentRoomCode;
            document.getElementById('host-quiz-name').innerText = res.data.quizTitle;
            document.getElementById('host-join-url').innerText = `${window.location.origin}/join?room=${currentRoomCode}`;
            showHostScreen(hostLobbyCard);
        } else {
            alert(res.error || 'Lỗi khi tạo phòng.');
        }
    });
}

function renderHostLobbyPlayers(playerList) {
    const container = document.getElementById('host-lobby-players');
    if (!container) return;
    totalPlayersInGame = playerList.length;
    document.getElementById('host-player-count').innerText = `${playerList.length} người chơi`;

    container.innerHTML = playerList.map(p => `
        <div class="roster-chip">
            <img src="${p.avatar || '/images/A.jpg'}" class="roster-avatar" onerror="this.src='/images/A.jpg'" alt="avatar">
            <div class="roster-name">${escapeHtml(p.username)}</div>
        </div>
    `).join('');
}

/**
 * Host bấm nút bắt đầu trận đấu
 */
function handleHostStartGame() {
    if (totalPlayersInGame === 0) {
        alert('Cần ít nhất 1 người chơi tham gia để bắt đầu.');
        return;
    }

    const btn = document.getElementById('btn-host-start');
    btn.disabled = true;
    btn.innerText = 'Đang khởi động trận đấu...';

    socket.emit('START_GAME', { room_code: currentRoomCode }, (res) => {
        if (!res || !res.success) {
            alert(res?.error || 'Không thể bắt đầu trận đấu.');
            btn.disabled = false;
            btn.innerText = '▶ BẮT ĐẦU TRẬN ĐẤU (START GAME)';
        }
    });
}

function startHostTimer(timeLimitSec, startTime) {
    if (hostTimerInterval) clearInterval(hostTimerInterval);

    const timerBar = document.getElementById('host-timer-bar');
    const timerText = document.getElementById('host-timer-text');
    const totalMs = timeLimitSec * 1000;

    function update() {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, totalMs - elapsed);
        const remainingSec = Math.ceil(remaining / 1000);
        const percent = (remaining / totalMs) * 100;

        timerText.innerText = `${remainingSec}s`;
        timerBar.style.width = `${percent}%`;

        if (remaining <= 3000) {
            timerBar.style.background = '#ef4444';
        } else {
            timerBar.style.background = 'linear-gradient(90deg, #4fa8cc, #87CEEB)';
        }

        if (remaining <= 0) {
            clearInterval(hostTimerInterval);
        }
    }

    update();
    hostTimerInterval = setInterval(update, 100);
}

// ==========================================
// SOCKET.IO EVENT LISTENERS FOR HOST
// ==========================================

socket.on('PLAYER_JOINED', (data) => {
    renderHostLobbyPlayers(data.playerList);
});

socket.on('PLAYER_LEFT', (data) => {
    renderHostLobbyPlayers(data.playerList);
});

socket.on('GAME_STARTING', (data) => {
    hostCountdownOverlay.style.display = 'flex';
    let count = data.countdown || 3;
    const numEl = document.getElementById('host-countdown-num');
    numEl.innerText = count;

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            numEl.innerText = count;
        } else {
            clearInterval(interval);
            hostCountdownOverlay.style.display = 'none';
        }
    }, 1000);
});

socket.on('QUESTION_STARTED', (data) => {
    hostCountdownOverlay.style.display = 'none';

    document.getElementById('host-q-progress').innerText = `${data.questionNumber} / ${data.totalQuestions}`;
    document.getElementById('host-answered-progress').innerText = `0 / ${totalPlayersInGame}`;
    document.getElementById('host-q-text').innerText = data.questionText;

    document.getElementById('host-opt-text-A').innerText = data.options.A;
    document.getElementById('host-opt-text-B').innerText = data.options.B;
    document.getElementById('host-opt-text-C').innerText = data.options.C;
    document.getElementById('host-opt-text-D').innerText = data.options.D;

    showHostScreen(hostQuestionCard);
    startHostTimer(data.timeLimit, data.startTime || Date.now());
});

socket.on('ANSWER_SUBMITTED_PROGRESS', (data) => {
    document.getElementById('host-answered-progress').innerText = `${data.answeredCount} / ${data.totalPlayers}`;
});

socket.on('QUESTION_ENDED', (data) => {
    if (hostTimerInterval) clearInterval(hostTimerInterval);

    document.getElementById('host-correct-answer').innerText = data.correctAnswer;
    document.getElementById('host-explanation-text').innerText = data.explanation || 'Không có giải thích bổ sung.';

    const stats = data.stats || { A: 0, B: 0, C: 0, D: 0 };
    const maxVal = Math.max(1, stats.A, stats.B, stats.C, stats.D);

    ['A', 'B', 'C', 'D'].forEach(opt => {
        const count = stats[opt] || 0;
        const percent = Math.round((count / maxVal) * 100);
        document.getElementById(`stat-count-${opt}`).innerText = count;
        const barEl = document.getElementById(`stat-bar-${opt}`);
        barEl.style.height = `${percent}%`;

        if (opt === data.correctAnswer) {
            barEl.className = 'stats-bar correct-bar';
        } else {
            barEl.className = 'stats-bar';
        }
    });

    showHostScreen(hostResultCard);
});

socket.on('LEADERBOARD_UPDATE', (data) => {
    const tbody = document.getElementById('host-leaderboard-rows');
    tbody.innerHTML = (data.leaderboard || []).slice(0, 5).map((p, idx) => {
        let deltaHtml = '';
        if (p.rankChange > 0) {
            deltaHtml = `<span class="rank-change rank-up">▲ +${p.rankChange}</span>`;
        } else if (p.rankChange < 0) {
            deltaHtml = `<span class="rank-change rank-down">▼ ${p.rankChange}</span>`;
        }

        return `
            <tr>
                <td class="rank-cell" style="font-size: 1.5rem;">#${p.rank}</td>
                <td>
                    <div class="player-info-cell">
                        <img src="${p.avatar || '/images/A.jpg'}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-skyblue);">
                        <div>
                            <div style="font-weight: 800; font-size: 1.2rem; color: var(--text-main);">${escapeHtml(p.username)}</div>
                            ${deltaHtml}
                        </div>
                    </div>
                </td>
                <td class="player-score-cell" style="font-size: 1.4rem; color: var(--color-skyblue);">
                    ${p.totalScore.toLocaleString()} pts
                </td>
            </tr>
        `;
    }).join('');

    showHostScreen(hostLeaderboardCard);
});

socket.on('GAME_FINISHED', (data) => {
    if (hostTimerInterval) clearInterval(hostTimerInterval);

    const podium = data.podium || {};

    if (podium.first) {
        document.getElementById('host-podium-1-name').innerText = podium.first.username;
        document.getElementById('host-podium-1-score').innerText = `${podium.first.totalScore.toLocaleString()} pts`;
        document.getElementById('host-podium-1-avatar').src = podium.first.avatar || '/images/A.jpg';
    }
    if (podium.second) {
        document.getElementById('host-podium-2-name').innerText = podium.second.username;
        document.getElementById('host-podium-2-score').innerText = `${podium.second.totalScore.toLocaleString()} pts`;
        document.getElementById('host-podium-2-avatar').src = podium.second.avatar || '/images/B.jpg';
    }
    if (podium.third) {
        document.getElementById('host-podium-3-name').innerText = podium.third.username;
        document.getElementById('host-podium-3-score').innerText = `${podium.third.totalScore.toLocaleString()} pts`;
        document.getElementById('host-podium-3-avatar').src = podium.third.avatar || '/images/C.jpg';
    }

    showHostScreen(hostPodiumCard);
});

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

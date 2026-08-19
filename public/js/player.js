let GIF_CORRECT = 'https://media1.tenor.com/m/nI7qFkM-K_wAAAAC/tony-tony-chopper-dance.gif';
let GIF_WRONG = 'https://media.tenor.com/nXjNCZY_PE4AAAAM/happy-dance-moves.gif';
let OPTION_IMAGES = {
    'A': '/images/A.jpg',
    'B': '/images/B.jpg',
    'C': '/images/C.jpg',
    'D': '/images/D.jpg'
};

const socket = io();

let currentRoomCode = '';
let currentSessionToken = '';
let selectedAvatar = '/images/A.jpg';
let myTotalScore = 0;
let hasAnsweredCurrentQuestion = false;
let clientTimerInterval = null;
let currentQuestionData = null;

// DOM Screens
const joinCard = document.getElementById('join-card');
const lobbyCard = document.getElementById('lobby-card');
const arenaCard = document.getElementById('arena-card');
const resultCardQuestion = document.getElementById('result-card-question');
const leaderboardCardLive = document.getElementById('leaderboard-card-live');
const podiumCard = document.getElementById('podium-card');
const countdownOverlay = document.getElementById('countdown-overlay');

// Form Inputs
const inputRoomCode = document.getElementById('input-room-code');
const inputUsername = document.getElementById('input-username');

document.addEventListener('DOMContentLoaded', async () => {
    // Khởi tạo session token duy nhất cho thiết bị
    currentSessionToken = localStorage.getItem('session_token');
    if (!currentSessionToken) {
        currentSessionToken = 'player_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        localStorage.setItem('session_token', currentSessionToken);
    }

    const savedName = localStorage.getItem('player_username');
    if (savedName) inputUsername.value = savedName;

    // Kiểm tra nếu URL có param ?room=8F3K2A
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
        inputRoomCode.value = roomParam.toUpperCase();
    }

    await Promise.all([
        loadSiteMediaSettings(),
        loadAvailableAvatars()
    ]);
});

async function loadSiteMediaSettings() {
    try {
        const res = await fetch('/api/site/settings');
        const data = await res.json();
        if (res.ok && data.success && data.data) {
            const s = data.data;
            if (s.icon_option_a) { OPTION_IMAGES['A'] = s.icon_option_a; const el = document.querySelector('#opt-btn-A img'); if (el) el.src = s.icon_option_a; }
            if (s.icon_option_b) { OPTION_IMAGES['B'] = s.icon_option_b; const el = document.querySelector('#opt-btn-B img'); if (el) el.src = s.icon_option_b; }
            if (s.icon_option_c) { OPTION_IMAGES['C'] = s.icon_option_c; const el = document.querySelector('#opt-btn-C img'); if (el) el.src = s.icon_option_c; }
            if (s.icon_option_d) { OPTION_IMAGES['D'] = s.icon_option_d; const el = document.querySelector('#opt-btn-D img'); if (el) el.src = s.icon_option_d; }
            if (s.gif_correct) GIF_CORRECT = s.gif_correct;
            if (s.gif_wrong) GIF_WRONG = s.gif_wrong;
            if (s.banner_image) {
                const bg = document.getElementById('site-bg-img');
                if (bg) bg.src = s.banner_image;
            }
        }
    } catch (e) {
        console.warn('Lỗi load media settings:', e);
    }
}

async function loadAvailableAvatars() {
    const container = document.getElementById('avatar-picker-container');
    if (!container) return;

    try {
        const res = await fetch('/api/avatars');
        const data = await res.json();
        if (res.ok && data.success && data.data.length > 0) {
            container.innerHTML = data.data.map((av, idx) => `
                <img src="${av.image_url}" 
                     class="avatar-pick ${idx === 0 ? 'active' : ''}" 
                     data-src="${av.image_url}" 
                     title="${escapeHtml(av.name)}"
                     onclick="pickAvatar(this)" 
                     alt="${escapeHtml(av.name)}"
                     onerror="this.src='/images/A.jpg'">
            `).join('');
            selectedAvatar = data.data[0].image_url;
        }
    } catch (err) {
        console.warn('Lỗi tải avatar:', err);
    }
}

function pickAvatar(imgEl) {
    document.querySelectorAll('.avatar-pick').forEach(el => el.classList.remove('active'));
    imgEl.classList.add('active');
    selectedAvatar = imgEl.dataset.src || imgEl.src;
}

function showScreen(screenEl) {
    const screens = [joinCard, lobbyCard, arenaCard, resultCardQuestion, leaderboardCardLive, podiumCard];
    screens.forEach(s => {
        if (s) s.style.display = 'none';
    });
    if (screenEl) screenEl.style.display = 'block';
}

/**
 * Gửi yêu cầu tham gia phòng
 */
function handleJoinRoom() {
    const roomCode = inputRoomCode.value.trim().toUpperCase();
    const username = inputUsername.value.trim();

    if (!roomCode || roomCode.length < 4) {
        alert('Vui lòng nhập mã phòng hợp lệ.');
        return;
    }
    if (!username) {
        alert('Vui lòng nhập tên của bạn.');
        return;
    }

    localStorage.setItem('player_username', username);
    currentRoomCode = roomCode;

    socket.emit('JOIN_ROOM', {
        room_code: roomCode,
        username,
        session_token: currentSessionToken,
        avatar: selectedAvatar
    }, (res) => {
        if (res.success) {
            document.getElementById('lobby-room-code').innerText = res.data.roomCode;
            document.getElementById('lobby-quiz-title').innerText = res.data.quizTitle;
            renderLobbyPlayers(res.data.playerList);
            showScreen(lobbyCard);
        } else {
            alert(res.error || 'Không thể tham gia phòng này.');
        }
    });
}

function renderLobbyPlayers(playerList) {
    const container = document.getElementById('lobby-players');
    if (!container) return;
    document.getElementById('lobby-count').innerText = `${playerList.length} / 50 người chơi`;

    container.innerHTML = playerList.map(p => `
        <div class="roster-chip">
            <img src="${p.avatar || '/images/A.jpg'}" class="roster-avatar" onerror="this.src='/images/A.jpg'" alt="avatar">
            <div class="roster-name">${escapeHtml(p.username)}</div>
        </div>
    `).join('');
}

/**
 * Nộp đáp án A, B, C, D
 */
function submitPlayerAnswer(choice) {
    if (hasAnsweredCurrentQuestion || !currentQuestionData) return;
    hasAnsweredCurrentQuestion = true;

    if (window.SoundFX) window.SoundFX.playClick();

    document.querySelectorAll('.arena-opt-btn').forEach(btn => {
        btn.classList.add('disabled');
        if (btn.dataset.choice === choice) {
            btn.classList.add('selected');
        }
    });
    document.getElementById('arena-answered-notice').style.display = 'block';

    socket.emit('SUBMIT_ANSWER', {
        room_code: currentRoomCode,
        selected_answer: choice,
        answer: choice
    }, (res) => {
        if (res && res.success) {
            myLastAnswerResult = res;
            if (res.totalScore !== undefined) {
                myTotalScore = res.totalScore;
                document.getElementById('arena-score').innerText = myTotalScore;
            }
        }
    });
}

/**
 * Chạy Timer đếm ngược tại Client đồng bộ theo StartTime của Server
 */
function startClientTimer(timeLimitSec, startTime) {
    if (clientTimerInterval) clearInterval(clientTimerInterval);

    const timerBar = document.getElementById('arena-timer-bar');
    const timerText = document.getElementById('arena-timer-text');
    const totalMs = timeLimitSec * 1000;
    let lastTickedSec = -1;

    function update() {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, totalMs - elapsed);
        const remainingSec = Math.ceil(remaining / 1000);
        const percent = (remaining / totalMs) * 100;

        timerText.innerText = `${remainingSec}s`;
        timerBar.style.width = `${percent}%`;

        if (remainingSec <= 5 && remainingSec > 0 && remainingSec !== lastTickedSec) {
            lastTickedSec = remainingSec;
            if (window.SoundFX) window.SoundFX.playTick();
        }

        if (remaining <= 3000) {
            timerBar.style.background = '#ef4444';
        } else {
            timerBar.style.background = 'linear-gradient(90deg, #4fa8cc, #87CEEB)';
        }

        if (remaining <= 0) {
            clearInterval(clientTimerInterval);
            document.querySelectorAll('.arena-opt-btn').forEach(btn => btn.classList.add('disabled'));
        }
    }

    update();
    clientTimerInterval = setInterval(update, 100);
}

// ==========================================
// SOCKET.IO REALTIME EVENT LISTENERS
// ==========================================

// 1. Cập nhật Lobby khi có người vào
socket.on('PLAYER_JOINED', (data) => {
    renderLobbyPlayers(data.playerList);
});

// 2. Cập nhật Lobby khi có người rời
socket.on('PLAYER_LEFT', (data) => {
    renderLobbyPlayers(data.playerList);
});

// 3. Phòng bị hủy bởi Host
socket.on('ROOM_CANCELLED', (data) => {
    alert(data.message || 'Host đã hủy phòng thi đấu.');
    window.location.href = '/join';
});

// 4. Bắt đầu đếm ngược 3s
socket.on('GAME_STARTING', (data) => {
    countdownOverlay.style.display = 'flex';
    let count = data.countdown || 3;
    const numEl = document.getElementById('countdown-number');
    numEl.innerText = count;
    if (window.SoundFX) window.SoundFX.playCountdown(count);

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            numEl.innerText = count;
            if (window.SoundFX) window.SoundFX.playCountdown(count);
        } else {
            clearInterval(interval);
            if (window.SoundFX) window.SoundFX.playCountdown('GO');
            countdownOverlay.style.display = 'none';
        }
    }, 1000);
});

// 5. Bắt đầu câu hỏi mới
socket.on('QUESTION_STARTED', (data) => {
    countdownOverlay.style.display = 'none';
    currentQuestionData = data;
    hasAnsweredCurrentQuestion = false;
    myLastAnswerResult = null;

    if (window.SoundFX) window.SoundFX.playClick();

    document.getElementById('arena-q-num').innerText = data.questionNumber;
    document.getElementById('arena-q-total').innerText = data.totalQuestions;
    document.getElementById('arena-score').innerText = myTotalScore;
    document.getElementById('arena-q-text').innerText = data.questionText;

    document.getElementById('arena-opt-text-A').innerText = data.options.A;
    document.getElementById('arena-opt-text-B').innerText = data.options.B;
    document.getElementById('arena-opt-text-C').innerText = data.options.C;
    document.getElementById('arena-opt-text-D').innerText = data.options.D;

    document.querySelectorAll('.arena-opt-btn').forEach(btn => {
        btn.className = 'arena-opt-btn';
    });
    document.getElementById('arena-answered-notice').style.display = 'none';

    showScreen(arenaCard);
    startClientTimer(data.timeLimit, data.startTime || Date.now());
});

// 6. Kết thúc câu hỏi -> Tiết lộ đáp án
socket.on('QUESTION_ENDED', (data) => {
    if (clientTimerInterval) clearInterval(clientTimerInterval);

    const statusEl = document.getElementById('result-q-status');
    const pointsEl = document.getElementById('result-q-points');
    const gifEl = document.getElementById('result-q-gif');
    const expEl = document.getElementById('result-q-explanation');

    const myUsername = inputUsername.value.trim().toLowerCase();
    const myRankItem = (data.leaderboard || []).find(p => p.username.toLowerCase() === myUsername);

    const isCorrect = (myLastAnswerResult && myLastAnswerResult.isCorrect) || (myRankItem && myRankItem.isCorrectLast);
    const scoreAwarded = (myLastAnswerResult && myLastAnswerResult.scoreAwarded) ? myLastAnswerResult.scoreAwarded : (myRankItem ? myRankItem.scoreAwardedLast : 0);

    if (isCorrect) {
        statusEl.innerText = 'CHÍNH XÁC!';
        statusEl.style.color = 'var(--color-correct)';
        pointsEl.innerText = `+${scoreAwarded.toLocaleString()} điểm`;
        gifEl.src = GIF_CORRECT;
        if (window.SoundFX) window.SoundFX.playCorrect();
    } else {
        statusEl.innerText = `CHƯA CHÍNH XÁC! (Đáp án: ${data.correctAnswer})`;
        statusEl.style.color = 'var(--color-wrong)';
        pointsEl.innerText = '+0 điểm';
        gifEl.src = GIF_WRONG;
        if (window.SoundFX) window.SoundFX.playWrong();
    }

    expEl.innerText = data.explanation || 'Không có giải thích bổ sung.';
    showScreen(resultCardQuestion);
});

// 7. Cập nhật Leaderboard Realtime
socket.on('LEADERBOARD_UPDATE', (data) => {
    document.getElementById('lb-q-curr').innerText = data.questionNumber;
    document.getElementById('lb-q-tot').innerText = data.totalQuestions;

    const tbody = document.getElementById('leaderboard-rows');
    tbody.innerHTML = (data.leaderboard || []).map((p, idx) => {
        let deltaHtml = '';
        if (p.rankChange > 0) {
            deltaHtml = `<span class="rank-change rank-up">▲ +${p.rankChange}</span>`;
        } else if (p.rankChange < 0) {
            deltaHtml = `<span class="rank-change rank-down">▼ ${p.rankChange}</span>`;
        }

        const isMe = p.username === inputUsername.value.trim();
        const highlightStyle = isMe ? 'background: rgba(135, 206, 235, 0.12); border-left: 3px solid var(--color-skyblue);' : '';

        return `
            <tr style="${highlightStyle}">
                <td class="rank-cell">#${p.rank}</td>
                <td>
                    <div class="player-info-cell">
                        <img src="${p.avatar || '/images/A.jpg'}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;">
                        <div>
                            <span style="font-weight: 700; ${isMe ? 'color: var(--color-skyblue);' : ''}">${escapeHtml(p.username)}</span>
                            ${deltaHtml}
                        </div>
                    </div>
                </td>
                <td class="player-score-cell">${p.totalScore.toLocaleString()} pts</td>
            </tr>
        `;
    }).join('');

    showScreen(leaderboardCardLive);
});

// 8. Kết thúc trận đấu -> Podium
socket.on('GAME_FINISHED', (data) => {
    if (clientTimerInterval) clearInterval(clientTimerInterval);

    if (window.SoundFX) window.SoundFX.playVictory();

    const podium = data.podium || {};

    if (podium.first) {
        document.getElementById('podium-1-name').innerText = podium.first.username;
        document.getElementById('podium-1-score').innerText = `${podium.first.totalScore.toLocaleString()} pts`;
        document.getElementById('podium-1-avatar').src = podium.first.avatar || '/images/A.jpg';
    }
    if (podium.second) {
        document.getElementById('podium-2-name').innerText = podium.second.username;
        document.getElementById('podium-2-score').innerText = `${podium.second.totalScore.toLocaleString()} pts`;
        document.getElementById('podium-2-avatar').src = podium.second.avatar || '/images/B.jpg';
    }
    if (podium.third) {
        document.getElementById('podium-3-name').innerText = podium.third.username;
        document.getElementById('podium-3-score').innerText = `${podium.third.totalScore.toLocaleString()} pts`;
        document.getElementById('podium-3-avatar').src = podium.third.avatar || '/images/C.jpg';
    }

    const myResult = (data.fullLeaderboard || []).find(p => p.username === inputUsername.value.trim());
    if (myResult) {
        document.getElementById('player-final-rank').innerText = myResult.rank;
        document.getElementById('player-final-score').innerText = myResult.totalScore.toLocaleString();
    }

    showScreen(podiumCard);
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

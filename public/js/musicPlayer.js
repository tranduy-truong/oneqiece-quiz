/**
 * One Piece Personal Music Engine & YouTube Controller
 * Liquid Glass Mini Player, Seek Bar, Auto-Minimize, Dynamic Categories & Seamless Navigation
 */

let ytPlayer = null;
let isYtApiReady = false;
let musicTracks = [];
let musicCategories = [];
let currentTrackIndex = 0;
let isPlaying = false;
let currentVolume = parseInt(localStorage.getItem('app_music_volume'), 10) || 50;
let isMuted = localStorage.getItem('app_music_muted') === 'true';
let hasUserInteracted = false;
let isSeeking = false;
let progressInterval = null;
let autoMinimizeTimer = null;

// ==========================================
// 1. KHỞI TẠO YOUTUBE IFRAME API
// ==========================================

(function initYouTubeApi() {
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
})();

window.onYouTubeIframeAPIReady = function () {
    isYtApiReady = true;
    initMusicSystem();
};

document.addEventListener('DOMContentLoaded', () => {
    injectMusicPlayerDom();
    loadMusicLibraryData();
    setupAutoMinimizeEvents();

    // Lắng nghe tương tác đầu tiên để Autoplay hợp lệ theo chính sách trình duyệt
    const handleFirstInteraction = () => {
        if (!hasUserInteracted) {
            hasUserInteracted = true;
            if (ytPlayer && !isPlaying) {
                const autoStart = localStorage.getItem('app_music_autostart') !== 'false';
                if (autoStart) {
                    playTrack(currentTrackIndex, false);
                }
            }
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('keydown', handleFirstInteraction);
            document.removeEventListener('touchstart', handleFirstInteraction);
        }
    };

    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('keydown', handleFirstInteraction, { once: true });
    document.addEventListener('touchstart', handleFirstInteraction, { once: true });
});

// ==========================================
// 2. TẢI DỮ LIỆU BÀI HÁT & THỂ LOẠI
// ==========================================

async function loadMusicLibraryData() {
    try {
        const [resTracks, resCats] = await Promise.all([
            fetch('/api/music'),
            fetch('/api/music/categories')
        ]);

        const dataTracks = await resTracks.json();
        const dataCats = await resCats.json();

        if (resCats.ok && dataCats.success) {
            musicCategories = dataCats.data;
            renderCategoryFilterButtons(musicCategories);
        }

        if (resTracks.ok && dataTracks.success && dataTracks.data.length > 0) {
            musicTracks = dataTracks.data;

            const savedTrackId = parseInt(localStorage.getItem('preferred_music_id'), 10);
            if (savedTrackId) {
                const foundIndex = musicTracks.findIndex(t => t.id === savedTrackId);
                if (foundIndex !== -1) currentTrackIndex = foundIndex;
            }

            updateMiniPlayerDisplay();
            renderMusicLibraryCards(musicTracks);
            if (isYtApiReady && !ytPlayer) {
                initMusicSystem();
            }
        }
    } catch (err) {
        console.warn('Không thể tải kho nhạc:', err);
    }
}

function renderCategoryFilterButtons(categories) {
    const bar = document.querySelector('.music-categories-bar');
    if (!bar) return;

    let html = `<button id="cat-btn-All" class="music-cat-btn active" onclick="filterMusicByCategory('All')">Tất Cả</button>`;
    categories.forEach(c => {
        const catName = c.category || c.name;
        if (catName) {
            html += `<button id="cat-btn-${escapeHtml(catName)}" class="music-cat-btn" onclick="filterMusicByCategory('${escapeHtml(catName).replace(/'/g, "\\'")}')">${escapeHtml(catName)}</button>`;
        }
    });
    bar.innerHTML = html;
}

// ==========================================
// 3. ĐIỀU KHIỂN YOUTUBE PLAYER & TIẾN TRÌNH (SEEK)
// ==========================================

function initMusicSystem() {
    if (!isYtApiReady || musicTracks.length === 0 || ytPlayer) return;

    const initialTrack = musicTracks[currentTrackIndex];
    if (!initialTrack) return;

    ytPlayer = new YT.Player('yt-hidden-player', {
        height: '0',
        width: '0',
        videoId: initialTrack.youtube_video_id,
        playerVars: {
            autoplay: 1,
            playsinline: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: onPlayerError
        }
    });
}

function onPlayerReady(event) {
    ytPlayer.setVolume(currentVolume);
    if (isMuted) ytPlayer.mute();
    updateVolumeDisplay();

    // Khôi phục thời gian phát trước đó nếu có
    const savedTime = parseFloat(localStorage.getItem('app_music_last_time'));
    if (savedTime && savedTime > 2) {
        try {
            ytPlayer.seekTo(savedTime, true);
        } catch (e) {}
    }

    try {
        event.target.playVideo();
    } catch (e) {
        console.log('Chờ tương tác người dùng để phát nhạc');
    }

    startProgressTracker();
}

function onPlayerStateChange(event) {
    const playBtn = document.getElementById('music-btn-play');
    const visualizer = document.getElementById('music-visualizer');

    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        if (playBtn) playBtn.innerHTML = '⏸';
        if (visualizer) visualizer.classList.add('active');
        startProgressTracker();
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        isPlaying = false;
        if (playBtn) playBtn.innerHTML = '▶';
        if (visualizer) visualizer.classList.remove('active');

        if (event.data === YT.PlayerState.ENDED) {
            nextTrack();
        }
    }
}

function onPlayerError(event) {
    console.warn('Lỗi phát YouTube track:', event.data);
    setTimeout(() => {
        nextTrack();
    }, 1500);
}

function startProgressTracker() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (!ytPlayer || !isPlaying || isSeeking || typeof ytPlayer.getCurrentTime !== 'function') return;

        const cur = ytPlayer.getCurrentTime() || 0;
        const dur = ytPlayer.getDuration() || 0;

        localStorage.setItem('app_music_last_time', Math.floor(cur));

        const seekBar = document.getElementById('music-seek-bar');
        const curTimeEl = document.getElementById('music-current-time');
        const durTimeEl = document.getElementById('music-total-duration');

        if (curTimeEl) curTimeEl.innerText = formatTime(cur);
        if (durTimeEl && dur > 0) durTimeEl.innerText = formatTime(dur);

        if (seekBar && dur > 0) {
            seekBar.value = (cur / dur) * 100;
        }
    }, 500);
}

function handleSeekInput(val) {
    isSeeking = true;
    triggerActivityTimer();
    if (!ytPlayer || typeof ytPlayer.getDuration !== 'function') return;
    const dur = ytPlayer.getDuration() || 0;
    const seekSeconds = (parseFloat(val) / 100) * dur;
    const curTimeEl = document.getElementById('music-current-time');
    if (curTimeEl) curTimeEl.innerText = formatTime(seekSeconds);
}

function handleSeekChange(val) {
    if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
        const dur = ytPlayer.getDuration() || 0;
        const seekSeconds = (parseFloat(val) / 100) * dur;
        ytPlayer.seekTo(seekSeconds, true);
    }
    isSeeking = false;
    triggerActivityTimer();
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function togglePlayMusic() {
    triggerActivityTimer();
    if (!ytPlayer) {
        initMusicSystem();
        return;
    }

    if (isPlaying) {
        ytPlayer.pauseVideo();
    } else {
        ytPlayer.playVideo();
    }
}

function playTrack(index, forcePlay = true) {
    if (index < 0 || index >= musicTracks.length) return;
    currentTrackIndex = index;
    const track = musicTracks[currentTrackIndex];

    localStorage.setItem('preferred_music_id', track.id);
    localStorage.removeItem('app_music_last_time');
    updateMiniPlayerDisplay();

    if (ytPlayer && ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById(track.youtube_video_id);
        if (forcePlay) {
            ytPlayer.playVideo();
        }
    }
    triggerActivityTimer();
}

function nextTrack() {
    if (musicTracks.length === 0) return;
    let nextIdx = (currentTrackIndex + 1) % musicTracks.length;
    playTrack(nextIdx, true);
}

function prevTrack() {
    if (musicTracks.length === 0) return;
    let prevIdx = (currentTrackIndex - 1 + musicTracks.length) % musicTracks.length;
    playTrack(prevIdx, true);
}

function handleVolumeChange(val) {
    currentVolume = parseInt(val, 10);
    localStorage.setItem('app_music_volume', currentVolume);
    if (ytPlayer && ytPlayer.setVolume) {
        ytPlayer.setVolume(currentVolume);
    }
    if (isMuted && currentVolume > 0) {
        toggleMuteMusic();
    }
    triggerActivityTimer();
}

function toggleMuteMusic() {
    isMuted = !isMuted;
    localStorage.setItem('app_music_muted', isMuted);
    if (ytPlayer) {
        if (isMuted) ytPlayer.mute();
        else ytPlayer.unMute();
    }
    updateVolumeDisplay();
    triggerActivityTimer();
}

function updateVolumeDisplay() {
    const muteBtn = document.getElementById('music-btn-mute');
    const volSlider = document.getElementById('music-volume-slider');
    if (volSlider) volSlider.value = isMuted ? 0 : currentVolume;
    if (muteBtn) muteBtn.innerHTML = isMuted || currentVolume === 0 ? '🔇' : '🔊';
}

function updateMiniPlayerDisplay() {
    const track = musicTracks[currentTrackIndex];
    if (!track) return;

    const titleEl = document.getElementById('music-track-title');
    const categoryEl = document.getElementById('music-track-category');
    if (titleEl) titleEl.innerText = track.title;
    if (categoryEl) categoryEl.innerText = `${track.category || 'Nhạc Nền'}`;
}

// ==========================================
// 4. TỰ ĐỘNG THU NHỎ (AUTO-MINIMIZE ENGINE)
// ==========================================

function togglePlayerMinimize() {
    const playerBox = document.getElementById('liquid-music-player');
    if (!playerBox) return;

    const isCurrentlyMin = playerBox.classList.contains('minimized');
    if (isCurrentlyMin) {
        playerBox.classList.remove('minimized');
        triggerActivityTimer();
    } else {
        playerBox.classList.add('minimized');
        if (autoMinimizeTimer) clearTimeout(autoMinimizeTimer);
    }
}

function minimizePlayer() {
    const playerBox = document.getElementById('liquid-music-player');
    if (playerBox && !playerBox.classList.contains('minimized')) {
        playerBox.classList.add('minimized');
    }
}

function triggerActivityTimer() {
    if (autoMinimizeTimer) clearTimeout(autoMinimizeTimer);
    autoMinimizeTimer = setTimeout(() => {
        minimizePlayer();
    }, 4000); // Tự động thu nhỏ sau 4 giây không thao tác
}

function setupAutoMinimizeEvents() {
    const playerBox = document.getElementById('liquid-music-player');
    if (!playerBox) return;

    playerBox.addEventListener('mouseenter', () => {
        if (autoMinimizeTimer) clearTimeout(autoMinimizeTimer);
    });

    playerBox.addEventListener('mouseleave', () => {
        if (!playerBox.classList.contains('minimized')) {
            triggerActivityTimer();
        }
    });

    playerBox.addEventListener('mousemove', () => {
        if (!playerBox.classList.contains('minimized')) {
            if (autoMinimizeTimer) clearTimeout(autoMinimizeTimer);
        }
    });
}

// ==========================================
// 5. THƯ VIỆN NHẠC (MUSIC LIBRARY MODAL)
// ==========================================

function openMusicLibraryModal() {
    const modal = document.getElementById('music-library-modal');
    if (modal) {
        modal.classList.add('open');
        renderMusicLibraryCards(musicTracks);
    }
}

function closeMusicLibraryModal() {
    const modal = document.getElementById('music-library-modal');
    if (modal) modal.classList.remove('open');
}

function filterMusicByCategory(cat) {
    document.querySelectorAll('.music-cat-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`cat-btn-${cat}`);
    if (targetBtn) targetBtn.classList.add('active');

    let filtered = musicTracks;
    if (cat !== 'All') {
        filtered = musicTracks.filter(t => t.category === cat);
    }
    renderMusicLibraryCards(filtered);
}

function handleMusicSearch() {
    const query = document.getElementById('music-search-input').value.toLowerCase().trim();
    const filtered = musicTracks.filter(t => 
        t.title.toLowerCase().includes(query) || 
        (t.category && t.category.toLowerCase().includes(query))
    );
    renderMusicLibraryCards(filtered);
}

function renderMusicLibraryCards(tracks) {
    const container = document.getElementById('music-library-list');
    if (!container) return;

    if (tracks.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--game-text-muted); padding: 30px;">Không tìm thấy bài hát nào trong thể loại này.</div>';
        return;
    }

    container.innerHTML = tracks.map((t) => {
        const isCurrent = (musicTracks[currentTrackIndex] && musicTracks[currentTrackIndex].id === t.id);
        const originalIndex = musicTracks.findIndex(item => item.id === t.id);

        return `
            <div class="music-card-item ${isCurrent ? 'active-track' : ''}">
                <div class="music-card-thumb-wrapper">
                    <img src="${t.thumbnail_url || `https://img.youtube.com/vi/${t.youtube_video_id}/hqdefault.jpg`}" class="music-card-thumb" alt="${t.title}" onerror="this.src='/favicon.svg'">
                    <button class="music-card-play-btn" onclick="playTrack(${originalIndex}, true)">
                        ${isCurrent && isPlaying ? '⏸' : '▶'}
                    </button>
                </div>
                <div class="music-card-info" style="padding: 12px;">
                    <div class="music-card-category" style="font-size: 0.72rem; color: var(--game-primary); font-weight: 800; text-transform: uppercase;">${t.category || 'Gaming'}</div>
                    <div class="music-card-title" style="font-size: 0.88rem; font-weight: 700; margin: 4px 0 8px; color: var(--game-text-primary);">${escapeHtml(t.title)}</div>
                    <button class="btn btn-secondary btn-sm" onclick="selectAsPersonalSoundtrack(${originalIndex})" style="width: 100%;">
                        ${isCurrent ? '✓ Đang Phát' : 'Chọn Làm Nhạc Nền'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function selectAsPersonalSoundtrack(index) {
    playTrack(index, true);
    closeMusicLibraryModal();
}

// ==========================================
// 6. TẠO GIAO DIỆN PLAYER DOM VÀ SEEK BAR
// ==========================================

function injectMusicPlayerDom() {
    // 1. YouTube Hidden Player Wrap
    if (!document.getElementById('yt-hidden-player-wrapper')) {
        const ytWrap = document.createElement('div');
        ytWrap.id = 'yt-hidden-player-wrapper';
        ytWrap.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 1px; height: 1px; overflow: hidden; opacity: 0; pointer-events: none;';
        ytWrap.innerHTML = '<div id="yt-hidden-player"></div>';
        document.body.appendChild(ytWrap);
    }

    // 2. Floating Liquid Glass Mini Player (Khởi đầu ở trạng thái minimized để không che màn hình)
    if (!document.getElementById('liquid-music-player')) {
        const playerHtml = `
            <div id="liquid-music-player" class="liquid-glass-player minimized">
                <!-- Compact Toggle Icon -->
                <button class="player-toggle-bubble" onclick="togglePlayerMinimize()" title="Mở/Thu gọn Trình phát nhạc">
                    🎵
                    <span id="music-visualizer" class="music-mini-bars">
                        <span></span><span></span><span></span>
                    </span>
                </button>

                <!-- Full Player Card -->
                <div class="player-inner-card">
                    <div class="player-header-row">
                        <div class="player-track-meta">
                            <span id="music-track-category" class="player-category-pill">Nhạc Nền</span>
                            <div id="music-track-title" class="player-title-marquee">Đang tải nhạc...</div>
                        </div>
                        <button class="btn-player-action" onclick="togglePlayerMinimize()" title="Thu nhỏ">&times;</button>
                    </div>

                    <!-- Seek Bar & Track Duration -->
                    <div class="player-progress-row">
                        <span id="music-current-time" class="player-time">00:00</span>
                        <input type="range" id="music-seek-bar" class="player-seek-slider" min="0" max="100" value="0" step="0.1" oninput="handleSeekInput(this.value)" onchange="handleSeekChange(this.value)" title="Tua nhạc">
                        <span id="music-total-duration" class="player-time">00:00</span>
                    </div>

                    <!-- Action Controls -->
                    <div class="player-controls-row">
                        <button class="btn-control" onclick="prevTrack()" title="Bài trước">⏮</button>
                        <button id="music-btn-play" class="btn-control-play" onclick="togglePlayMusic()" title="Phát/Tạm dừng">▶</button>
                        <button class="btn-control" onclick="nextTrack()" title="Bài tiếp">⏭</button>
                        <button class="btn-control" onclick="openMusicLibraryModal()" title="Thư viện nhạc">📚</button>
                    </div>

                    <!-- Background Music Volume Row -->
                    <div class="player-volume-row" style="margin-bottom: 6px;">
                        <button id="music-btn-mute" class="btn-mute" onclick="toggleMuteMusic()" title="Bật/Tắt Nhạc Nền">🔊</button>
                        <span style="font-size: 0.72rem; color: var(--game-text-muted); font-weight: 700; width: 32px;">BGM</span>
                        <input type="range" id="music-volume-slider" class="player-vol-slider" min="0" max="100" value="${currentVolume}" oninput="handleVolumeChange(this.value)" title="Âm lượng Nhạc Nền">
                    </div>

                    <!-- Game SFX Sound Volume Row -->
                    <div class="player-volume-row">
                        <button id="sfx-btn-mute" class="btn-mute" onclick="toggleMuteSfx()" title="Bật/Tắt Âm Thanh Hiệu Ứng">🔔</button>
                        <span style="font-size: 0.72rem; color: var(--game-primary); font-weight: 700; width: 32px;">SFX</span>
                        <input type="range" id="sfx-volume-slider" class="player-vol-slider" min="0" max="100" value="${Math.round((parseFloat(localStorage.getItem('app_sfx_volume') ?? 0.7)) * 100)}" oninput="handleSfxVolumeChange(this.value)" title="Âm lượng Hiệu Ứng SFX">
                    </div>
                </div>
            </div>

            <!-- Music Library Liquid Glass Modal -->
            <div id="music-library-modal" class="modal-backdrop">
                <div class="modal-card modal-glass-card" style="max-width: 850px;">
                    <div class="modal-header">
                        <h3 class="modal-title">🎵 Kho Nhạc Nền Cá Nhân (YouTube Soundtrack)</h3>
                        <button class="btn-close" onclick="closeMusicLibraryModal()">&times;</button>
                    </div>

                    <div style="margin-bottom: 16px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: space-between; align-items: center;">
                        <div class="music-categories-bar">
                            <button id="cat-btn-All" class="music-cat-btn active" onclick="filterMusicByCategory('All')">Tất Cả</button>
                        </div>
                        <input type="text" id="music-search-input" class="form-control" placeholder="Tìm bài hát..." oninput="handleMusicSearch()" style="width: auto; min-width: 220px; font-size: 0.85rem; padding: 6px 12px;">
                    </div>

                    <div id="music-library-list" class="music-grid-container">
                        <!-- Dynamic Music Cards -->
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', playerHtml);
    }
}



// ==========================================
// 8. ĐIỀU KHIỂN ÂM THANH HIỆU ỨNG (SFX)
// ==========================================

function handleSfxVolumeChange(val) {
    const vol = parseInt(val, 10) / 100;
    if (window.SoundFX) {
        window.SoundFX.setVolume(vol);
    }
    updateSfxDisplay();
    triggerActivityTimer();
}

function toggleMuteSfx() {
    if (window.SoundFX) {
        window.SoundFX.toggleMute();
        updateSfxDisplay();
    }
    triggerActivityTimer();
}

function updateSfxDisplay() {
    const sfxBtn = document.getElementById('sfx-btn-mute');
    const sfxSlider = document.getElementById('sfx-volume-slider');
    if (window.SoundFX) {
        if (sfxBtn) sfxBtn.innerHTML = window.SoundFX.isMuted || window.SoundFX.volume === 0 ? '🔕' : '🔔';
        if (sfxSlider) sfxSlider.value = window.SoundFX.isMuted ? 0 : Math.round(window.SoundFX.volume * 100);
    }
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

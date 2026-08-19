/**
 * YouTube Personal Background Music Controller
 * 100% YouTube IFrame API compliant - Liquid Glass Mini Player & Music Library
 */

let ytPlayer = null;
let isYtApiReady = false;
let musicTracks = [];
let currentTrackIndex = 0;
let isPlaying = false;
let currentVolume = parseInt(localStorage.getItem('app_music_volume'), 10) || 50;
let isMuted = localStorage.getItem('app_music_muted') === 'true';
let hasUserInteracted = false;

// Load YouTube IFrame Player API
(function initYouTubeApi() {
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
})();

// Callback khi YouTube IFrame API sẵn sàng
window.onYouTubeIframeAPIReady = function () {
    isYtApiReady = true;
    initMusicSystem();
};

document.addEventListener('DOMContentLoaded', () => {
    injectMusicPlayerDom();
    loadMusicLibraryData();

    // Lắng nghe tương tác đầu tiên của người dùng để kích hoạt Autoplay hợp lệ
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

async function loadMusicLibraryData() {
    try {
        const res = await fetch('/api/music');
        const data = await res.json();
        if (res.ok && data.success && data.data.length > 0) {
            musicTracks = data.data;

            // Tìm bài hát đã lưu trong localStorage
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

    // Tự động phát ngay lập tức
    try {
        event.target.playVideo();
    } catch (e) {
        console.log('Chờ tương tác người dùng để phát nhạc');
    }
}

function onPlayerStateChange(event) {
    const playBtn = document.getElementById('music-btn-play');
    const visualizer = document.getElementById('music-visualizer');

    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        if (playBtn) playBtn.innerHTML = '⏸';
        if (visualizer) visualizer.classList.add('active');
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        isPlaying = false;
        if (playBtn) playBtn.innerHTML = '▶';
        if (visualizer) visualizer.classList.remove('active');

        // Tự động chuyển bài tiếp theo khi hết bài
        if (event.data === YT.PlayerState.ENDED) {
            nextTrack();
        }
    }
}

function onPlayerError(event) {
    console.warn('Lỗi phát YouTube track:', event.data);
    // Nếu video bị chặn embed hoặc lỗi, thử bài tiếp theo
    setTimeout(() => {
        nextTrack();
    }, 1500);
}

function togglePlayMusic() {
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
    updateMiniPlayerDisplay();

    if (ytPlayer && ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById(track.youtube_video_id);
        if (forcePlay) {
            ytPlayer.playVideo();
        }
    }
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
}

function toggleMuteMusic() {
    isMuted = !isMuted;
    localStorage.setItem('app_music_muted', isMuted);
    if (ytPlayer) {
        if (isMuted) ytPlayer.mute();
        else ytPlayer.unMute();
    }
    updateVolumeDisplay();
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

function togglePlayerMinimize() {
    const playerBox = document.getElementById('liquid-music-player');
    if (playerBox) {
        playerBox.classList.toggle('minimized');
    }
}

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
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--game-text-muted); padding: 30px;">Không tìm thấy bài hát nào.</div>';
        return;
    }

    container.innerHTML = tracks.map((t, idx) => {
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
                <div class="music-card-info">
                    <div class="music-card-category">${t.category || 'Gaming'}</div>
                    <div class="music-card-title">${escapeHtml(t.title)}</div>
                    <button class="btn btn-secondary btn-sm" onclick="selectAsPersonalSoundtrack(${originalIndex})" style="margin-top: 8px; width: 100%;">
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

function injectMusicPlayerDom() {
    // 1. Tạo container nhúng ẩn cho YouTube Player
    if (!document.getElementById('yt-hidden-player-wrapper')) {
        const ytWrap = document.createElement('div');
        ytWrap.id = 'yt-hidden-player-wrapper';
        ytWrap.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 1px; height: 1px; overflow: hidden; opacity: 0; pointer-events: none;';
        ytWrap.innerHTML = '<div id="yt-hidden-player"></div>';
        document.body.appendChild(ytWrap);
    }

    // 2. Floating Liquid Glass Mini Player
    if (!document.getElementById('liquid-music-player')) {
        const playerHtml = `
            <div id="liquid-music-player" class="liquid-glass-player">
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

                    <!-- Action Controls -->
                    <div class="player-controls-row">
                        <button class="btn-control" onclick="prevTrack()" title="Bài trước">⏮</button>
                        <button id="music-btn-play" class="btn-control-play" onclick="togglePlayMusic()" title="Phát/Tạm dừng">▶</button>
                        <button class="btn-control" onclick="nextTrack()" title="Bài tiếp">⏭</button>
                        <button class="btn-control" onclick="openMusicLibraryModal()" title="Thư viện nhạc">📚</button>
                    </div>

                    <!-- Volume Row -->
                    <div class="player-volume-row">
                        <button id="music-btn-mute" class="btn-mute" onclick="toggleMuteMusic()">🔊</button>
                        <input type="range" id="music-volume-slider" class="player-vol-slider" min="0" max="100" value="${currentVolume}" oninput="handleVolumeChange(this.value)">
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
                            <button id="cat-btn-Epic" class="music-cat-btn" onclick="filterMusicByCategory('Epic')">Epic</button>
                            <button id="cat-btn-Gaming" class="music-cat-btn" onclick="filterMusicByCategory('Gaming')">Gaming</button>
                            <button id="cat-btn-Lo-fi" class="music-cat-btn" onclick="filterMusicByCategory('Lo-fi')">Lo-fi</button>
                            <button id="cat-btn-Chill" class="music-cat-btn" onclick="filterMusicByCategory('Chill')">Chill</button>
                        </div>
                        <input type="text" id="music-search-input" class="search-input" placeholder="Tìm bài hát..." oninput="handleMusicSearch()" style="min-width: 200px;">
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

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

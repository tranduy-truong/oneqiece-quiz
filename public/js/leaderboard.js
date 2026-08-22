/**
 * Leaderboard & History Controller (Desktop Table + Mobile Card Views)
 */

document.addEventListener('DOMContentLoaded', () => {
    loadGlobalLeaderboard();
});

function switchLbTab(tabName) {
    document.querySelectorAll('.admin-sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(`tab-btn-${tabName}`);
    if (btn) btn.classList.add('active');

    if (tabName === 'global') {
        document.getElementById('tab-content-global').style.display = 'block';
        document.getElementById('tab-content-recent').style.display = 'none';
        loadGlobalLeaderboard();
    } else {
        document.getElementById('tab-content-global').style.display = 'none';
        document.getElementById('tab-content-recent').style.display = 'block';
        loadRecentMatches();
    }
}

async function loadGlobalLeaderboard() {
    const tbody = document.getElementById('global-lb-tbody');
    const mobileList = document.getElementById('global-lb-mobile-list');

    try {
        const res = await fetch('/api/leaderboard/global');
        const data = await res.json();

        if (res.ok && data.success && data.data.length > 0) {
            // 1. Desktop Table Rows
            tbody.innerHTML = data.data.map((r) => {
                let medal = `#${r.rank}`;
                if (r.rank === 1) medal = '🥇 1';
                else if (r.rank === 2) medal = '🥈 2';
                else if (r.rank === 3) medal = '🥉 3';

                const rankDisplay = r.rank_display || 'Tân Binh Hải Tặc';
                const rankIcon = r.rank_icon || '🥉';
                const rankColor = r.rank_color || '#cd7f32';
                const displayName = r.display_name || r.username;

                return `
                    <tr>
                        <td style="text-align: center; font-weight: 900; color: var(--game-primary); font-size: 1.1rem;">
                            ${medal}
                        </td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <img src="${r.avatar || '/images/A.jpg'}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid ${rankColor};" onerror="this.src='/images/A.jpg'">
                                <div>
                                    <div style="font-weight: 800; color: var(--game-text-primary); font-size: 0.95rem;">${escapeHtml(displayName)}</div>
                                    <div style="font-size: 0.76rem; color: var(--game-text-muted);">@${escapeHtml(r.username)} • Lv.${r.level || 1}</div>
                                </div>
                            </div>
                        </td>
                        <td style="text-align: center;">
                            <span class="badge" style="background: rgba(245, 158, 11, 0.1); border: 1px solid ${rankColor}; color: ${rankColor}; font-weight: 800;">
                                ${rankIcon} ${rankDisplay}
                            </span>
                        </td>
                        <td style="text-align: right; font-weight: 900; color: var(--game-gold); font-size: 1.15rem;">
                            ${(r.rating || 1000).toLocaleString()}
                        </td>
                        <td style="text-align: right; font-weight: 800; color: var(--game-primary); font-size: 1rem;">
                            ${(r.total_score || 0).toLocaleString()} pts
                        </td>
                        <td style="text-align: center; font-weight: 700; color: #10b981;">
                            ${r.avg_accuracy || 0}%
                        </td>
                        <td style="text-align: center; font-weight: 800; color: var(--game-gold);">
                            ${r.wins || 0} 🏆
                        </td>
                    </tr>
                `;
            }).join('');

            // 2. Mobile Cards List
            if (mobileList) {
                mobileList.innerHTML = data.data.map((r) => {
                    let medal = `#${r.rank}`;
                    if (r.rank === 1) medal = '🥇';
                    else if (r.rank === 2) medal = '🥈';
                    else if (r.rank === 3) medal = '🥉';

                    const rankDisplay = r.rank_display || 'Tân Binh';
                    const rankIcon = r.rank_icon || '🥉';
                    const rankColor = r.rank_color || '#cd7f32';
                    const displayName = r.display_name || r.username;

                    return `
                        <div class="mobile-rank-card">
                            <div class="mobile-rank-left">
                                <div class="mobile-rank-pos">${medal}</div>
                                <img src="${r.avatar || '/images/A.jpg'}" class="mobile-rank-avatar" style="border: 2px solid ${rankColor};" alt="${escapeHtml(displayName)}" onerror="this.src='/images/A.jpg'">
                                <div class="mobile-rank-meta">
                                    <div class="mobile-rank-name">${escapeHtml(displayName)}</div>
                                    <div class="mobile-rank-tier" style="color: ${rankColor};">${rankIcon} ${rankDisplay} • Lv.${r.level || 1}</div>
                                </div>
                            </div>
                            <div class="mobile-rank-right">
                                <div class="mobile-rank-rating">${(r.rating || 1000).toLocaleString()}</div>
                                <div class="mobile-rank-score">${(r.total_score || 0).toLocaleString()} pts • ${r.wins || 0}🏆</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // 3. Highlight Current User if logged in
            updateStickyUserRank(data.data);
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--game-text-muted); padding: 24px;">Chưa có dữ liệu thi đấu nào. Hãy là người đầu tiên ghi danh!</td></tr>';
            if (mobileList) {
                mobileList.innerHTML = '<div style="text-align: center; color: var(--game-text-muted); padding: 24px;">Chưa có dữ liệu thi đấu nào.</div>';
            }
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--game-danger); padding: 24px;">Không thể tải bảng xếp hạng.</td></tr>';
    }
}

async function loadRecentMatches() {
    const tbody = document.getElementById('recent-matches-tbody');
    const mobileList = document.getElementById('recent-matches-mobile-list');

    try {
        const res = await fetch('/api/leaderboard/recent');
        const data = await res.json();

        if (res.ok && data.success && data.data.length > 0) {
            tbody.innerHTML = data.data.map(m => `
                <tr>
                    <td style="font-weight: 700; color: var(--game-primary);">#${m.session_id}</td>
                    <td>
                        <strong style="color: var(--game-text-primary);">${escapeHtml(m.quiz_title)}</strong>
                        <div style="font-size: 0.8rem; color: var(--game-text-muted);">${escapeHtml(m.topic_name || 'One Piece')}</div>
                    </td>
                    <td>
                        <span class="badge ${m.mode === 'MULTIPLAYER' ? 'badge-primary' : 'badge-secondary'}">
                            ${m.mode === 'MULTIPLAYER' ? '⚡ Multiplayer' : '🎮 Solo'}
                        </span>
                    </td>
                    <td style="text-align: center; font-weight: 700;">${m.player_count || 1}</td>
                    <td style="font-weight: 700; color: var(--game-gold);">
                        ${m.winner_name ? `👑 ${escapeHtml(m.winner_name)}` : 'Chưa có'}
                    </td>
                    <td style="font-size: 0.85rem; color: var(--game-text-muted);">
                        ${new Date(m.finished_at).toLocaleString('vi-VN')}
                    </td>
                </tr>
            `).join('');

            if (mobileList) {
                mobileList.innerHTML = data.data.map(m => `
                    <div class="mobile-rank-card">
                        <div class="mobile-rank-left">
                            <div style="font-size: 1.3rem;">${m.mode === 'MULTIPLAYER' ? '⚡' : '🎮'}</div>
                            <div class="mobile-rank-meta">
                                <div class="mobile-rank-name">${escapeHtml(m.quiz_title)}</div>
                                <div style="font-size: 0.74rem; color: var(--game-text-muted);">${new Date(m.finished_at).toLocaleTimeString('vi-VN')} • ${m.player_count || 1} người</div>
                            </div>
                        </div>
                        <div class="mobile-rank-right">
                            <div style="font-weight: 800; color: var(--game-gold); font-size: 0.88rem;">${m.winner_name ? `👑 ${escapeHtml(m.winner_name)}` : 'Hoàn thành'}</div>
                            <div style="font-size: 0.72rem; color: var(--game-text-muted);">${m.mode}</div>
                        </div>
                    </div>
                `).join('');
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--game-text-muted); padding: 24px;">Chưa có trận đấu nào được ghi nhận.</td></tr>';
            if (mobileList) {
                mobileList.innerHTML = '<div style="text-align: center; color: var(--game-text-muted); padding: 24px;">Chưa có trận đấu nào.</div>';
            }
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--game-danger); padding: 24px;">Lỗi tải dữ liệu lịch sử trận đấu.</td></tr>';
    }
}

async function updateStickyUserRank(leaderboardData) {
    const stickyBar = document.getElementById('sticky-user-rank-bar');
    if (!stickyBar) return;

    const token = localStorage.getItem('auth_token');
    if (!token) {
        stickyBar.style.display = 'none';
        return;
    }

    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success && data.user) {
            const user = data.user;
            const myEntry = leaderboardData.find(p => p.username === user.username);

            document.getElementById('sticky-user-name').innerText = user.display_name;
            document.getElementById('sticky-user-tier').innerText = `${user.rank_icon || '🥉'} ${user.rank_display || 'Tân Binh'}`;
            document.getElementById('sticky-user-rating').innerText = (user.rating || 1000).toLocaleString();

            if (myEntry) {
                document.getElementById('sticky-user-pos').innerText = `#${myEntry.rank}`;
            } else {
                document.getElementById('sticky-user-pos').innerText = `#99+`;
            }
        } else {
            stickyBar.style.display = 'none';
        }
    } catch (e) {
        stickyBar.style.display = 'none';
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

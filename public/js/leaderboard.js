/**
 * Leaderboard & History Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    loadGlobalLeaderboard();
});

function switchLbTab(tabName) {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-btn-${tabName}`).classList.add('active');

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
    try {
        const res = await fetch('/api/leaderboard/global');
        const data = await res.json();

        if (res.ok && data.success && data.data.length > 0) {
            tbody.innerHTML = data.data.map((r, idx) => {
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
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Chưa có dữ liệu thi đấu nào. Hãy là người đầu tiên ghi danh!</td></tr>';
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-wrong); padding: 24px;">Không thể tải bảng xếp hạng.</td></tr>';
    }
}

async function loadRecentMatches() {
    const tbody = document.getElementById('recent-matches-tbody');
    try {
        const res = await fetch('/api/leaderboard/recent');
        const data = await res.json();

        if (res.ok && data.success && data.data.length > 0) {
            tbody.innerHTML = data.data.map(m => `
                <tr>
                    <td style="font-weight: 700; color: var(--color-skyblue);">#${m.session_id}</td>
                    <td>
                        <strong style="color: var(--text-main);">${escapeHtml(m.quiz_title)}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(m.topic_name)}</div>
                    </td>
                    <td>
                        <span class="badge ${m.mode === 'MULTIPLAYER' ? 'badge-category' : 'badge-difficulty'}">
                            ${m.mode === 'MULTIPLAYER' ? '⚡ Multiplayer' : '🎮 Solo'}
                        </span>
                    </td>
                    <td style="text-align: center; font-weight: 700;">${m.player_count || 1}</td>
                    <td style="font-weight: 700; color: #ffd700;">
                        ${m.winner_name ? `👑 ${escapeHtml(m.winner_name)}` : 'Chưa có'}
                    </td>
                    <td style="font-size: 0.85rem; color: var(--text-muted);">
                        ${new Date(m.finished_at).toLocaleString('vi-VN')}
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Chưa có trận đấu nào hoàn thành gần đây.</td></tr>';
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-wrong); padding: 24px;">Không thể tải lịch sử trận đấu.</td></tr>';
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

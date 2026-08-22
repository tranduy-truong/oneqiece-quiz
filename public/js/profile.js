/**
 * User Profile Dashboard & Settings Controller
 */

let currentSelectedAvatar = '/images/A.jpg';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    await loadUserProfile(token);
    await loadAvatars();
});

async function loadUserProfile(token) {
    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
            return;
        }

        const data = await res.json();
        if (data.success && data.user) {
            renderProfileData(data.user);
            await loadUserStatsAndHistory(data.user.id, token);
        }
    } catch (err) {
        console.error('Lỗi tải hồ sơ:', err);
    }
}

function renderProfileData(user) {
    const avatarImg = document.getElementById('prof-avatar');
    const displayNameEl = document.getElementById('prof-display-name');
    const usernameEl = document.getElementById('prof-username');
    const createdAtEl = document.getElementById('prof-created-at');
    const bioEl = document.getElementById('prof-bio');
    const rankIconEl = document.getElementById('prof-rank-icon');
    const rankTagEl = document.getElementById('prof-rank-tag');
    const ratingValEl = document.getElementById('prof-rating-val');
    const rankDescEl = document.getElementById('prof-rank-desc');
    const levelEl = document.getElementById('prof-level');
    const currentXpEl = document.getElementById('prof-current-xp');
    const nextXpEl = document.getElementById('prof-next-xp');
    const xpBarEl = document.getElementById('prof-xp-bar');

    currentSelectedAvatar = user.avatar_url || '/images/A.jpg';
    avatarImg.src = currentSelectedAvatar;
    displayNameEl.innerText = user.display_name;
    usernameEl.innerText = `@${user.username}`;
    createdAtEl.innerText = new Date(user.created_at || Date.now()).toLocaleDateString('vi-VN');
    bioEl.innerText = user.bio || 'Chưa có tiểu sử hải tặc.';

    rankIconEl.innerText = user.rank_icon || '🥉';
    rankTagEl.innerText = `${user.rank_tier} ${user.rank_division || ''}`.trim();
    rankTagEl.style.color = user.rank_color || '#f59e0b';
    rankTagEl.style.borderColor = user.rank_color || '#f59e0b';
    ratingValEl.innerText = user.rating || 1000;
    rankDescEl.innerText = user.rank_display || 'Tân Binh Hải Tặc';

    const levelInfo = user.level_info || { level: 1, xpInCurrentLevel: 0, xpNeededForNextLevel: 100, progressPercent: 0 };
    levelEl.innerText = levelInfo.level || 1;
    currentXpEl.innerText = levelInfo.xpInCurrentLevel || 0;
    nextXpEl.innerText = levelInfo.xpNeededForNextLevel || 100;
    xpBarEl.style.width = `${levelInfo.progressPercent || 0}%`;

    // Fill form edit values
    document.getElementById('edit-display-name').value = user.display_name;
    document.getElementById('edit-bio').value = user.bio || '';
}

async function loadUserStatsAndHistory(userId, token) {
    try {
        const res = await fetch(`/api/user/profile/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.success) {
            // Render Stats
            const stats = data.stats || {};
            document.getElementById('stat-total-games').innerText = stats.games_played || 0;
            document.getElementById('stat-wins').innerText = stats.wins || 0;
            document.getElementById('stat-winrate').innerText = `${stats.win_rate || 0}%`;
            document.getElementById('stat-best-score').innerText = (stats.best_score || 0).toLocaleString();
            document.getElementById('stat-avg-acc').innerText = `${stats.avg_accuracy || 0}%`;

            // Render History
            renderHistoryTable(data.history || []);
        }
    } catch (err) {
        console.error('Lỗi tải thống kê/lịch sử:', err);
    }
}

function renderHistoryTable(history) {
    const tbody = document.getElementById('history-table-body');
    if (!history || history.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--game-text-muted); padding: 30px;">
                    Chưa có trận đấu nào. Hãy tham gia Đấu Solo hoặc Vào Phòng để bắt đầu tích lũy chiến tích!
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = history.map(item => {
        const dateStr = new Date(item.created_at).toLocaleString('vi-VN', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
        });

        const ratingChange = item.rating_change || 0;
        let ratingBadge = `<span style="color: var(--game-text-muted); font-weight: 700;">+0</span>`;
        if (ratingChange > 0) {
            ratingBadge = `<span style="color: #10b981; font-weight: 800;">+${ratingChange} ▲</span>`;
        } else if (ratingChange < 0) {
            ratingBadge = `<span style="color: #ef4444; font-weight: 800;">${ratingChange} ▼</span>`;
        }

        const modeBadge = item.mode === 'RANKED_MULTIPLAYER' 
            ? `<span class="badge badge-accent">Ranked Phòng</span>`
            : item.mode === 'SOLO'
            ? `<span class="badge badge-primary">Solo Thử Thách</span>`
            : `<span class="badge badge-secondary">Casual</span>`;

        return `
            <tr>
                <td style="font-size: 0.85rem; color: var(--game-text-muted);">${dateStr}</td>
                <td><strong>${escapeHtml(item.quiz_title || 'Đại Thử Thách One Piece')}</strong></td>
                <td>${modeBadge}</td>
                <td style="font-weight: 800; color: var(--game-gold);">${(item.score || 0).toLocaleString()}</td>
                <td>${item.accuracy || 0}% (${item.correct_answers || 0}/${item.total_questions || 0})</td>
                <td>${ratingBadge}</td>
                <td style="color: var(--game-primary); font-weight: 700;">+${item.xp_gained || 0} XP</td>
            </tr>
        `;
    }).join('');
}

async function loadAvatars() {
    try {
        const res = await fetch('/api/avatars');
        const data = await res.json();
        const picker = document.getElementById('profile-avatar-picker');

        let avatarList = [
            { name: 'A', image_url: '/images/A.jpg' },
            { name: 'B', image_url: '/images/B.jpg' },
            { name: 'C', image_url: '/images/C.jpg' },
            { name: 'D', image_url: '/images/D.jpg' }
        ];

        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            avatarList = data.data;
        }

        picker.innerHTML = avatarList.map(a => `
            <div class="avatar-option ${a.image_url === currentSelectedAvatar ? 'selected' : ''}" 
                 onclick="selectProfileAvatar('${a.image_url}', this)">
                <img src="${a.image_url}" alt="${escapeHtml(a.name)}" onerror="this.src='/images/A.jpg'">
            </div>
        `).join('');
    } catch (e) {
        console.warn('Lỗi load avatars:', e);
    }
}

function selectProfileAvatar(url, element) {
    currentSelectedAvatar = url;
    document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
    if (element) element.classList.add('selected');
    document.getElementById('prof-avatar').src = url;
}

function switchProfileTab(tab) {
    const btnHistory = document.getElementById('tab-btn-history');
    const btnEdit = document.getElementById('tab-btn-edit');
    const btnSecurity = document.getElementById('tab-btn-security');

    const contentHistory = document.getElementById('tab-content-history');
    const contentEdit = document.getElementById('tab-content-edit');
    const contentSecurity = document.getElementById('tab-content-security');

    btnHistory.classList.remove('active');
    btnEdit.classList.remove('active');
    btnSecurity.classList.remove('active');

    contentHistory.style.display = 'none';
    contentEdit.style.display = 'none';
    contentSecurity.style.display = 'none';

    if (tab === 'edit') {
        btnEdit.classList.add('active');
        contentEdit.style.display = 'block';
    } else if (tab === 'security') {
        btnSecurity.classList.add('active');
        contentSecurity.style.display = 'block';
    } else {
        btnHistory.classList.add('active');
        contentHistory.style.display = 'block';
    }
}

async function handleSaveProfile(e) {
    e.preventDefault();
    const token = localStorage.getItem('auth_token');
    const displayName = document.getElementById('edit-display-name').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    const btnSubmit = document.getElementById('btn-save-profile');

    const alertEl = document.getElementById('prof-alert');
    const successEl = document.getElementById('prof-success');
    alertEl.style.display = 'none';
    successEl.style.display = 'none';

    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Đang lưu...';

    try {
        const res = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                display_name: displayName,
                bio,
                avatar_url: currentSelectedAvatar
            })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            successEl.innerText = 'Cập nhật thông tin hồ sơ thành công!';
            successEl.style.display = 'block';
            document.getElementById('prof-display-name').innerText = displayName;
            document.getElementById('prof-bio').innerText = bio || 'Chưa có tiểu sử hải tặc.';
            localStorage.setItem('player_username', displayName);
        } else {
            alertEl.innerText = data.error || 'Cập nhật hồ sơ thất bại.';
            alertEl.style.display = 'block';
        }
    } catch (err) {
        alertEl.innerText = 'Lỗi kết nối máy chủ.';
        alertEl.style.display = 'block';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Lưu Thay Đổi';
    }
}

async function handleChangePassword(e) {
    e.preventDefault();
    const token = localStorage.getItem('auth_token');
    const currentPass = document.getElementById('change-current-pass').value;
    const newPass = document.getElementById('change-new-pass').value;
    const confirmPass = document.getElementById('change-confirm-pass').value;
    const btnSubmit = document.getElementById('btn-save-password');

    const alertEl = document.getElementById('prof-alert');
    const successEl = document.getElementById('prof-success');
    alertEl.style.display = 'none';
    successEl.style.display = 'none';

    if (newPass.length < 6) {
        alertEl.innerText = 'Mật khẩu mới phải có tối thiểu 6 ký tự.';
        alertEl.style.display = 'block';
        return;
    }

    if (newPass !== confirmPass) {
        alertEl.innerText = 'Mật khẩu xác nhận không khớp.';
        alertEl.style.display = 'block';
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Đang xử lý...';

    try {
        const res = await fetch('/api/user/change-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                current_password: currentPass,
                new_password: newPass,
                confirm_password: confirmPass
            })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            successEl.innerText = 'Đổi mật khẩu thành công!';
            successEl.style.display = 'block';
            document.getElementById('form-change-password').reset();
        } else {
            alertEl.innerText = data.error || 'Đổi mật khẩu thất bại.';
            alertEl.style.display = 'block';
        }
    } catch (err) {
        alertEl.innerText = 'Lỗi kết nối máy chủ.';
        alertEl.style.display = 'block';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Cập Nhật Mật Khẩu';
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

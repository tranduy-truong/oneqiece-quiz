/**
 * AuthNav — Universal Header Auth State Controller for ONE PIECE QUIZ
 * Automatically renders User profile chip or Login button across all pages
 */

(function () {
    document.addEventListener('DOMContentLoaded', async () => {
        initAuthNav();
    });

    async function initAuthNav() {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        const token = localStorage.getItem('auth_token');
        if (!token) {
            renderGuestNav(navActions);
            return;
        }

        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                localStorage.removeItem('auth_token');
                renderGuestNav(navActions);
                return;
            }

            const data = await res.json();
            if (data.success && data.user) {
                renderUserNav(navActions, data.user);
            } else {
                renderGuestNav(navActions);
            }
        } catch (e) {
            renderGuestNav(navActions);
        }
    }

    function renderGuestNav(container) {
        // Xóa auth chip cũ nếu có
        const oldChip = document.getElementById('nav-user-chip');
        if (oldChip) oldChip.remove();

        // Kiểm tra xem đã có nút Login chưa
        let loginBtn = document.getElementById('nav-login-btn');
        if (!loginBtn) {
            loginBtn = document.createElement('a');
            loginBtn.id = 'nav-login-btn';
            loginBtn.href = '/login';
            loginBtn.className = 'btn btn-primary btn-sm';
            loginBtn.style.padding = '6px 14px';
            loginBtn.style.fontSize = '0.82rem';
            loginBtn.innerText = 'Đăng Nhập';
            container.appendChild(loginBtn);
        }
    }

    function renderUserNav(container, user) {
        const loginBtn = document.getElementById('nav-login-btn');
        if (loginBtn) loginBtn.remove();

        const oldChip = document.getElementById('nav-user-chip');
        if (oldChip) oldChip.remove();

        const userChip = document.createElement('div');
        userChip.id = 'nav-user-chip';
        userChip.className = 'nav-user-chip';

        const rankIcon = user.rank_icon || '🥉';
        const rankColor = user.rank_color || '#f59e0b';
        const avatarUrl = user.avatar_url || '/images/A.jpg';

        userChip.innerHTML = `
            <div class="user-chip-button" onclick="toggleUserDropdown(event)">
                <img src="${avatarUrl}" class="user-chip-avatar" alt="${escapeHtml(user.display_name)}" onerror="this.src='/images/A.jpg'">
                <div class="user-chip-info">
                    <span class="user-chip-name">${escapeHtml(user.display_name)}</span>
                    <span class="user-chip-rank" style="color: ${rankColor};">${rankIcon} ${user.rating || 1000}</span>
                </div>
                <span style="font-size: 0.7rem; color: var(--game-text-muted);">▼</span>
            </div>
            <div id="user-dropdown-menu" class="user-dropdown-menu">
                <div class="dropdown-header">
                    <div style="font-weight: 800; color: var(--game-text-primary); font-size: 0.95rem;">${escapeHtml(user.display_name)}</div>
                    <div style="font-size: 0.78rem; color: var(--game-text-muted);">@${escapeHtml(user.username)} • Lv.${user.level || 1}</div>
                </div>
                <a href="/profile" class="dropdown-item">👤 Hồ Sơ & Lịch Sử</a>
                <a href="/leaderboard" class="dropdown-item">🏆 Bảng Phong Thần</a>
                <div class="dropdown-divider"></div>
                <button onclick="handleUserLogout()" class="dropdown-item dropdown-item-danger">🚪 Đăng Xuất</button>
            </div>
        `;

        container.appendChild(userChip);
    }

    window.toggleUserDropdown = function (e) {
        e.stopPropagation();
        const menu = document.getElementById('user-dropdown-menu');
        if (menu) {
            menu.classList.toggle('show');
        }
    };

    window.handleUserLogout = function () {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
    };

    document.addEventListener('click', () => {
        const menu = document.getElementById('user-dropdown-menu');
        if (menu) menu.classList.remove('show');
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
})();

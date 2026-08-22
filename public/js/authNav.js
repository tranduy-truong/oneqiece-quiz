/**
 * AuthNav & Mobile Navigation Drawer Controller for ONE PIECE QUIZ
 * Universally syncs User Authentication & Mobile Drawer across all pages
 */

(function () {
    let currentUser = null;

    document.addEventListener('DOMContentLoaded', async () => {
        setupMobileDrawerDom();
        await initAuthNav();
    });

    async function initAuthNav() {
        const navActions = document.querySelector('.nav-actions');
        const token = localStorage.getItem('auth_token');

        if (!token) {
            currentUser = null;
            if (navActions) renderGuestNav(navActions);
            renderDrawerUserState(null);
            return;
        }

        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                localStorage.removeItem('auth_token');
                currentUser = null;
                if (navActions) renderGuestNav(navActions);
                renderDrawerUserState(null);
                return;
            }

            const data = await res.json();
            if (data.success && data.user) {
                currentUser = data.user;
                if (navActions) renderUserNav(navActions, currentUser);
                renderDrawerUserState(currentUser);
            } else {
                currentUser = null;
                if (navActions) renderGuestNav(navActions);
                renderDrawerUserState(null);
            }
        } catch (e) {
            currentUser = null;
            if (navActions) renderGuestNav(navActions);
            renderDrawerUserState(null);
        }
    }

    function renderGuestNav(container) {
        const oldChip = document.getElementById('nav-user-chip');
        if (oldChip) oldChip.remove();

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

    /**
     * Khởi tạo Mobile Navigation Drawer & Hamburger Toggle Button
     */
    function setupMobileDrawerDom() {
        const navInner = document.querySelector('.nav-inner');
        if (!navInner) return;

        // 1. Thêm nút Hamburger nếu chưa có
        if (!document.getElementById('btn-mobile-nav-toggle')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'btn-mobile-nav-toggle';
            toggleBtn.className = 'mobile-nav-toggle';
            toggleBtn.innerHTML = '☰';
            toggleBtn.setAttribute('aria-label', 'Mở menu điều hướng');
            toggleBtn.onclick = toggleMobileDrawer;
            navInner.insertBefore(toggleBtn, navInner.firstChild);
        }

        // 2. Thêm Overlay Backdrop nếu chưa có
        if (!document.getElementById('mobile-drawer-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'mobile-drawer-overlay';
            overlay.className = 'mobile-drawer-overlay';
            overlay.onclick = closeMobileDrawer;
            document.body.appendChild(overlay);
        }

        // 3. Thêm Side Drawer Panel nếu chưa có
        if (!document.getElementById('mobile-drawer-panel')) {
            const currentPath = window.location.pathname;

            const drawer = document.createElement('div');
            drawer.id = 'mobile-drawer-panel';
            drawer.className = 'mobile-drawer';

            drawer.innerHTML = `
                <div class="mobile-drawer-header">
                    <a href="/" class="mobile-drawer-brand" onclick="closeMobileDrawer()">
                        <img src="/favicon.svg" style="width: 28px; height: 28px;" alt="Logo">
                        <span>ONE PIECE <span style="color: var(--game-gold);">QUIZ</span></span>
                    </a>
                    <button class="mobile-drawer-close" onclick="closeMobileDrawer()" title="Đóng">&times;</button>
                </div>

                <div id="mobile-drawer-user-slot">
                    <!-- User or Guest Card dynamic -->
                </div>

                <ul class="mobile-drawer-nav">
                    <li><a href="/" class="mobile-drawer-link ${currentPath === '/' ? 'active' : ''}" onclick="closeMobileDrawer()"><span class="mobile-drawer-link-icon">🏠</span> <span>Trang Chủ</span></a></li>
                    <li><a href="/solo" class="mobile-drawer-link ${currentPath === '/solo' ? 'active' : ''}" onclick="closeMobileDrawer()"><span class="mobile-drawer-link-icon">⚔️</span> <span>Chơi Solo</span></a></li>
                    <li><a href="/join" class="mobile-drawer-link ${currentPath === '/join' ? 'active' : ''}" onclick="closeMobileDrawer()"><span class="mobile-drawer-link-icon">🏴‍☠️</span> <span>Vào Phòng Đấu</span></a></li>
                    <li><a href="/host" class="mobile-drawer-link ${currentPath === '/host' ? 'active' : ''}" onclick="closeMobileDrawer()"><span class="mobile-drawer-link-icon">👑</span> <span>Tạo Phòng Host</span></a></li>
                    <li><a href="/leaderboard" class="mobile-drawer-link ${currentPath === '/leaderboard' ? 'active' : ''}" onclick="closeMobileDrawer()"><span class="mobile-drawer-link-icon">🏆</span> <span>Bảng Vàng Danh Dự</span></a></li>
                    <li><a href="/profile" class="mobile-drawer-link ${currentPath === '/profile' ? 'active' : ''}" onclick="closeMobileDrawer()"><span class="mobile-drawer-link-icon">👤</span> <span>Hồ Sơ Chiến Binh</span></a></li>
                    <li><a href="/admin" class="mobile-drawer-link ${currentPath === '/admin' ? 'active' : ''}" onclick="closeMobileDrawer()"><span class="mobile-drawer-link-icon">⚙️</span> <span>Quản Trị Studio</span></a></li>
                </ul>

                <div class="mobile-drawer-footer">
                    <button class="mobile-drawer-action-btn" onclick="toggleTheme(); updateThemeToggleButtons();">
                        🌓 <span class="theme-btn-text">Đổi Giao Diện Sáng / Tối</span>
                    </button>
                    <button class="mobile-drawer-action-btn" onclick="openMusicLibraryModal(); closeMobileDrawer();">
                        🎵 <span>Thư Viện Nhạc Nền</span>
                    </button>
                    <div id="mobile-drawer-auth-action">
                        <!-- Login or Logout dynamic -->
                    </div>
                </div>
            `;

            document.body.appendChild(drawer);
        }
    }

    function renderDrawerUserState(user) {
        const slot = document.getElementById('mobile-drawer-user-slot');
        const authActionSlot = document.getElementById('mobile-drawer-auth-action');
        if (!slot) return;

        if (user) {
            const rankIcon = user.rank_icon || '🥉';
            const rankColor = user.rank_color || '#f59e0b';
            const rankName = user.rank_display || 'Tân Binh Hải Tặc';

            slot.innerHTML = `
                <div class="mobile-drawer-user-card">
                    <img src="${user.avatar_url || '/images/A.jpg'}" class="mobile-drawer-avatar" alt="${escapeHtml(user.display_name)}" onerror="this.src='/images/A.jpg'">
                    <div class="mobile-drawer-meta">
                        <div class="mobile-drawer-username">${escapeHtml(user.display_name)}</div>
                        <div class="mobile-drawer-rank" style="color: ${rankColor};">${rankIcon} ${rankName} • ${user.rating || 1000} ELO</div>
                    </div>
                </div>
            `;

            if (authActionSlot) {
                authActionSlot.innerHTML = `
                    <button class="mobile-drawer-action-btn" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);" onclick="handleUserLogout()">
                        🚪 <span>Đăng Xuất Tài Khoản</span>
                    </button>
                `;
            }
        } else {
            slot.innerHTML = `
                <div class="mobile-drawer-user-card" style="justify-content: center; text-align: center; flex-direction: column; gap: 8px;">
                    <div style="font-weight: 800; font-size: 0.92rem; color: var(--game-text-primary);">Chào Mừng Thuyền Viên!</div>
                    <div style="font-size: 0.78rem; color: var(--game-text-muted);">Đăng nhập để leo Rank và lưu thành tích</div>
                    <a href="/login" class="btn btn-primary btn-sm" style="width: 100%; margin-top: 4px;" onclick="closeMobileDrawer()">Đăng Nhập / Đăng Ký</a>
                </div>
            `;

            if (authActionSlot) {
                authActionSlot.innerHTML = ``;
            }
        }
    }

    function toggleMobileDrawer() {
        const overlay = document.getElementById('mobile-drawer-overlay');
        const drawer = document.getElementById('mobile-drawer-panel');
        if (drawer && overlay) {
            const isOpen = drawer.classList.contains('active');
            if (isOpen) {
                closeMobileDrawer();
            } else {
                drawer.classList.add('active');
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
    }

    function closeMobileDrawer() {
        const overlay = document.getElementById('mobile-drawer-overlay');
        const drawer = document.getElementById('mobile-drawer-panel');
        if (drawer && overlay) {
            drawer.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    window.toggleMobileDrawer = toggleMobileDrawer;
    window.closeMobileDrawer = closeMobileDrawer;

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

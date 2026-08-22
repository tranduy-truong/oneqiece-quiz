/**
 * Dual Login Page Logic (Player vs Admin Studio) + Google OAuth
 */

let globalGoogleClientId = '';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Kiểm tra nếu URL có thông báo ?verified=true hoặc ?reset=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
        showAlert('success', 'Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay.');
    }
    if (urlParams.get('reset') === 'true') {
        showAlert('success', 'Mật khẩu đã được đặt lại thành công! Hãy đăng nhập bằng mật khẩu mới.');
    }

    // 2. Nếu đã có auth_token người chơi, tự chuyển về profile
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
        verifyPlayerToken(authToken);
    }

    // 3. Tải Google Client ID từ Server
    await initGoogleAuth();
});

async function initGoogleAuth() {
    try {
        const res = await fetch('/api/auth/config');
        const data = await res.json();
        if (data.success && data.googleClientId) {
            globalGoogleClientId = data.googleClientId;
            if (window.google && window.google.accounts && window.google.accounts.id) {
                google.accounts.id.initialize({
                    client_id: globalGoogleClientId,
                    callback: handleGoogleResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
            }
        }
    } catch (e) {
        console.warn('Không thể tải cấu hình Google Auth:', e);
    }
}

function switchLoginTab(tab) {
    const tabPlayer = document.getElementById('tab-player');
    const tabAdmin = document.getElementById('tab-admin');
    const formPlayer = document.getElementById('form-player-container');
    const formAdmin = document.getElementById('form-admin-container');
    const alertEl = document.getElementById('login-alert');
    const alertSuccess = document.getElementById('login-success');

    alertEl.style.display = 'none';
    alertSuccess.style.display = 'none';

    if (tab === 'admin') {
        tabAdmin.classList.add('active');
        tabPlayer.classList.remove('active');
        formAdmin.style.display = 'block';
        formPlayer.style.display = 'none';
    } else {
        tabPlayer.classList.add('active');
        tabAdmin.classList.remove('active');
        formPlayer.style.display = 'block';
        formAdmin.style.display = 'none';
    }
}

function showAlert(type, message) {
    const alertEl = document.getElementById('login-alert');
    const successEl = document.getElementById('login-success');

    if (type === 'success') {
        alertEl.style.display = 'none';
        successEl.innerText = message;
        successEl.style.display = 'block';
    } else {
        successEl.style.display = 'none';
        alertEl.innerText = message;
        alertEl.style.display = 'block';
    }
}

async function verifyPlayerToken(token) {
    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            window.location.href = '/profile';
        }
    } catch (e) {
        localStorage.removeItem('auth_token');
    }
}

/**
 * Xử lý đăng nhập Player bằng Email / Password
 */
async function handlePlayerLogin(e) {
    e.preventDefault();
    const emailInput = document.getElementById('player-email');
    const passwordInput = document.getElementById('player-password');
    const btnSubmit = document.getElementById('btn-player-submit');

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showAlert('danger', 'Vui lòng nhập đầy đủ thông tin.');
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Đang xác thực...';

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.success && data.token) {
            localStorage.setItem('auth_token', data.token);
            if (data.user && data.user.display_name) {
                localStorage.setItem('player_username', data.user.display_name);
            }
            showAlert('success', 'Đăng nhập thành công! Đang chuyển hướng...');
            setTimeout(() => {
                window.location.href = '/profile';
            }, 800);
        } else {
            showAlert('danger', data.error || 'Đăng nhập thất bại.');
        }
    } catch (err) {
        showAlert('danger', 'Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Đăng Nhập Ngay';
    }
}

/**
 * Xử lý đăng nhập Admin Studio
 */
async function handleAdminLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('admin-username');
    const passwordInput = document.getElementById('admin-password');
    const btnSubmit = document.getElementById('btn-admin-submit');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showAlert('danger', 'Vui lòng nhập username và mật khẩu quản trị.');
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Đang xác thực...';

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.success && data.token) {
            localStorage.setItem('admin_token', data.token);
            window.location.href = '/admin';
        } else {
            showAlert('danger', data.error || 'Đăng nhập Admin không thành công.');
        }
    } catch (err) {
        showAlert('danger', 'Lỗi kết nối máy chủ.');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Đăng Nhập Studio';
    }
}

/**
 * Xử lý đăng nhập Google
 */
async function handleGoogleSignInClick() {
    if (globalGoogleClientId && window.google && window.google.accounts && window.google.accounts.id) {
        try {
            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    console.log('Google Prompt dismissed:', notification.getNotDisplayedReason());
                }
            });
            return;
        } catch (e) {
            console.warn('Google GSI prompt error:', e);
        }
    }

    // Nếu chưa cấu hình Google Client ID trên Render / Local
    showAlert('danger', 'Chưa cấu hình GOOGLE_CLIENT_ID trên server Render. Vui lòng thêm biến GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET vào Environment của Render hoặc đăng nhập bằng Email/Password.');
}

async function handleGoogleResponse(response) {
    if (!response || !response.credential) return;

    try {
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });

        const data = await res.json();
        if (res.ok && data.success && data.token) {
            localStorage.setItem('auth_token', data.token);
            if (data.user && data.user.display_name) {
                localStorage.setItem('player_username', data.user.display_name);
            }
            showAlert('success', 'Đăng nhập Google thành công! Đang chuyển hướng...');
            setTimeout(() => {
                window.location.href = '/profile';
            }, 800);
        } else {
            showAlert('danger', data.error || 'Xác thực Google thất bại.');
        }
    } catch (err) {
        showAlert('danger', 'Lỗi kết nối máy chủ khi đăng nhập Google.');
    }
}

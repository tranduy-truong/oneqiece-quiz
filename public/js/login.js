/**
 * Dual Login Page Logic (Player vs Admin Studio) + Google OAuth
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra nếu URL có thông báo ?verified=true hoặc ?reset=true
    const urlParams = new URLSearchParams(window.location.search);
    const alertSuccess = document.getElementById('login-success');
    if (urlParams.get('verified') === 'true') {
        showAlert('success', 'Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay.');
    }
    if (urlParams.get('reset') === 'true') {
        showAlert('success', 'Mật khẩu đã được đặt lại thành công! Hãy đăng nhập bằng mật khẩu mới.');
    }

    // 2. Nếu đã có auth_token người chơi, tự chuyển về profile hoặc trang trước đó
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
        verifyPlayerToken(authToken);
    }
});

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
    // Tự động kiểm tra Google Identity Services hoặc Mock Flow
    if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
            google.accounts.id.initialize({
                client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
                callback: handleGoogleResponse
            });
            google.accounts.id.prompt();
            return;
        } catch (e) {
            console.warn('Google GSI init fallback:', e);
        }
    }

    // Fallback Dev Popup / Google Dialog
    const userPrompt = prompt('Nhập địa chỉ Gmail để đăng nhập thử nghiệm Google OAuth:', 'haitac@gmail.com');
    if (!userPrompt) return;

    try {
        const mockPayload = {
            sub: 'google_' + btoa(userPrompt).substring(0, 16),
            email: userPrompt,
            name: userPrompt.split('@')[0].toUpperCase(),
            picture: '/images/A.jpg'
        };

        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: 'mock.' + btoa(JSON.stringify(mockPayload)) + '.mock' })
        });

        const data = await res.json();
        if (res.ok && data.success && data.token) {
            localStorage.setItem('auth_token', data.token);
            if (data.user && data.user.display_name) {
                localStorage.setItem('player_username', data.user.display_name);
            }
            showAlert('success', 'Đăng nhập Google thành công!');
            setTimeout(() => {
                window.location.href = '/profile';
            }, 800);
        } else {
            showAlert('danger', data.error || 'Đăng nhập Google thất bại.');
        }
    } catch (err) {
        showAlert('danger', 'Lỗi kết nối Google Auth.');
    }
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
            window.location.href = '/profile';
        } else {
            showAlert('danger', data.error || 'Xác thực Google thất bại.');
        }
    } catch (err) {
        showAlert('danger', 'Lỗi kết nối máy chủ.');
    }
}

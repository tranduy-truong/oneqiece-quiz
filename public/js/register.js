/**
 * User Registration Controller + Google Auth
 */

let globalGoogleClientId = '';

document.addEventListener('DOMContentLoaded', async () => {
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
});

async function handleRegister(e) {
    e.preventDefault();

    const displayName = document.getElementById('reg-display-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;

    const alertEl = document.getElementById('register-alert');
    const formEl = document.getElementById('register-form');
    const doneBox = document.getElementById('register-done-box');
    const btnSubmit = document.getElementById('btn-reg-submit');

    alertEl.style.display = 'none';

    if (!displayName || !username || !email || !password) {
        alertEl.innerText = 'Vui lòng điền đầy đủ các thông tin bắt buộc.';
        alertEl.style.display = 'block';
        return;
    }

    if (password !== confirmPassword) {
        alertEl.innerText = 'Mật khẩu xác nhận không khớp.';
        alertEl.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        alertEl.innerText = 'Mật khẩu phải có tối thiểu 6 ký tự.';
        alertEl.style.display = 'block';
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Đang khởi tạo tài khoản...';

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                display_name: displayName,
                username,
                email,
                password,
                confirm_password: confirmPassword
            })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            formEl.style.display = 'none';
            doneBox.style.display = 'block';

            if (data.devMode && data.verifyUrl) {
                const devContainer = document.getElementById('dev-verify-link-container');
                const devLink = document.getElementById('dev-verify-link');
                devLink.href = data.verifyUrl;
                devLink.innerText = data.verifyUrl;
                devContainer.style.display = 'block';
            }
        } else {
            alertEl.innerText = data.error || 'Đăng ký tài khoản thất bại.';
            alertEl.style.display = 'block';
        }
    } catch (err) {
        alertEl.innerText = 'Lỗi kết nối máy chủ. Vui lòng thử lại sau.';
        alertEl.style.display = 'block';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Tạo Tài Khoản Ngay';
    }
}

/**
 * Đăng nhập/Đăng ký nhanh bằng Google
 */
async function handleGoogleSignInClick() {
    if (globalGoogleClientId && window.google && window.google.accounts && window.google.accounts.id) {
        try {
            google.accounts.id.prompt();
            return;
        } catch (e) {
            console.warn('Google prompt error:', e);
        }
    }

    const alertEl = document.getElementById('register-alert');
    alertEl.innerText = 'Chưa cấu hình GOOGLE_CLIENT_ID trên server Render. Vui lòng đăng ký bằng biểu mẫu bên dưới hoặc thêm Client ID vào Render Environment.';
    alertEl.style.display = 'block';
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
            window.location.href = '/profile';
        } else {
            alert(data.error || 'Đăng ký Google thất bại.');
        }
    } catch (err) {
        alert('Lỗi kết nối Google Auth.');
    }
}

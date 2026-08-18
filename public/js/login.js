/**
 * Admin Login Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Nếu đã có token còn hạn, kiểm tra và chuyển thẳng đến /admin
    const token = localStorage.getItem('admin_token');
    if (token) {
        verifyExistingToken(token);
    }

    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', handleLogin);
});

async function verifyExistingToken(token) {
    try {
        const res = await fetch('/api/admin/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            window.location.href = '/admin';
        }
    } catch (e) {
        localStorage.removeItem('admin_token');
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const alertEl = document.getElementById('login-alert');
    const btnSubmit = document.getElementById('btn-login-submit');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    alertEl.classList.remove('show');

    if (!username || !password) {
        alertEl.innerText = 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.';
        alertEl.classList.add('show');
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Đang xác thực...';

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Lưu token vào localStorage
            localStorage.setItem('admin_token', result.token);
            window.location.href = '/admin';
        } else {
            alertEl.innerText = result.error || 'Đăng nhập không thành công.';
            alertEl.classList.add('show');
        }
    } catch (err) {
        alertEl.innerText = 'Lỗi kết nối máy chủ. Vui lòng thử lại sau.';
        alertEl.classList.add('show');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Đăng Nhập';
    }
}

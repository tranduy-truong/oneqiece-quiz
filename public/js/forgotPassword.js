/**
 * Forgot & Reset Password Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    const requestBox = document.getElementById('request-reset-box');
    const performBox = document.getElementById('perform-reset-box');

    if (token) {
        requestBox.style.display = 'none';
        performBox.style.display = 'block';
    } else {
        requestBox.style.display = 'block';
        performBox.style.display = 'none';
    }
});

function showAlert(type, message) {
    const alertEl = document.getElementById('forgot-alert');
    const successEl = document.getElementById('forgot-success');

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

/**
 * Yêu cầu gửi link Reset mật khẩu
 */
async function handleRequestReset(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value.trim();
    const btnSubmit = document.getElementById('btn-request-submit');

    if (!email) return;

    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Đang gửi link...';

    try {
        const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await res.json();
        showAlert('success', data.message || 'Đã gửi link đặt lại mật khẩu! Vui lòng kiểm tra email.');

        if (data.devMode && data.resetUrl) {
            const devContainer = document.getElementById('dev-reset-link-container');
            const devLink = document.getElementById('dev-reset-link');
            devLink.href = data.resetUrl;
            devLink.innerText = data.resetUrl;
            devContainer.style.display = 'block';
        }
    } catch (err) {
        showAlert('danger', 'Lỗi kết nối máy chủ.');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Gửi Link Đặt Lại Mật Khẩu';
    }
}

/**
 * Thực hiện đổi mật khẩu mới
 */
async function handlePerformReset(e) {
    e.preventDefault();
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    const btnSubmit = document.getElementById('btn-perform-submit');

    if (newPassword.length < 6) {
        showAlert('danger', 'Mật khẩu mới phải có tối thiểu 6 ký tự.');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('danger', 'Mật khẩu xác nhận không khớp.');
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Đang lưu mật khẩu mới...';

    try {
        const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token,
                new_password: newPassword,
                confirm_password: confirmPassword
            })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showAlert('success', 'Đặt lại mật khẩu thành công! Đang chuyển hướng đến trang đăng nhập...');
            setTimeout(() => {
                window.location.href = '/login?reset=true';
            }, 1200);
        } else {
            showAlert('danger', data.error || 'Đặt lại mật khẩu thất bại.');
        }
    } catch (err) {
        showAlert('danger', 'Lỗi kết nối máy chủ.');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Cập Nhật Mật Khẩu Mới';
    }
}

/**
 * Email Verification Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    const loadingEl = document.getElementById('verify-loading');
    const successEl = document.getElementById('verify-success');
    const errorEl = document.getElementById('verify-error');
    const errorMsgEl = document.getElementById('verify-error-msg');
    const countdownEl = document.getElementById('countdown-timer');

    if (!token) {
        loadingEl.style.display = 'none';
        errorMsgEl.innerText = 'Không tìm thấy token xác thực trong đường dẫn.';
        errorEl.style.display = 'block';
        return;
    }

    try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        loadingEl.style.display = 'none';

        if (res.ok && data.success) {
            successEl.style.display = 'block';

            let count = 3;
            const timer = setInterval(() => {
                count--;
                if (countdownEl) countdownEl.innerText = count;
                if (count <= 0) {
                    clearInterval(timer);
                    window.location.href = '/login?verified=true';
                }
            }, 1000);
        } else {
            errorMsgEl.innerText = data.error || 'Link xác thực không hợp lệ hoặc đã hết hạn.';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        loadingEl.style.display = 'none';
        errorMsgEl.innerText = 'Lỗi kết nối máy chủ khi xác thực email.';
        errorEl.style.display = 'block';
    }
});

async function handleResendModal() {
    const email = prompt('Vui lòng nhập địa chỉ email của bạn để nhận link kích hoạt mới:');
    if (!email) return;

    try {
        const res = await fetch('/api/auth/resend-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        alert(data.message || 'Đã gửi lại link xác thực! Vui lòng kiểm tra hộp thư.');
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

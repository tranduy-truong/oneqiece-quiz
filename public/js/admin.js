/**
 * One Piece Admin Dashboard Logic
 */

let allQuestions = [];
let token = localStorage.getItem('admin_token');

// DOM Elements
const tableBody = document.getElementById('questions-table-body');
const totalCountEl = document.getElementById('total-count');
const searchInput = document.getElementById('search-input');
const modalBackdrop = document.getElementById('question-modal');
const modalTitle = document.getElementById('modal-title');
const alertEl = document.getElementById('admin-alert');

// Khởi chạy khi load trang
document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        window.location.href = '/login';
        return;
    }
    loadAdminQuestions();
});

/**
 * Hiển thị thông báo
 */
function showAlert(message, type = 'success') {
    alertEl.className = `alert alert-${type} show`;
    alertEl.innerText = message;
    setTimeout(() => {
        alertEl.classList.remove('show');
    }, 4000);
}

/**
 * Tải danh sách câu hỏi từ Admin API
 */
async function loadAdminQuestions() {
    try {
        const res = await fetch('/api/admin/questions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('admin_token');
            window.location.href = '/login';
            return;
        }

        const data = await res.json();
        if (res.ok && data.success) {
            allQuestions = data.data;
            totalCountEl.innerText = allQuestions.length;
            renderTable(allQuestions);
        } else {
            showAlert(data.error || 'Không thể tải danh sách câu hỏi.', 'danger');
        }
    } catch (err) {
        console.error('Lỗi tải danh sách admin:', err);
        showAlert('Lỗi kết nối đến máy chủ.', 'danger');
    }
}

/**
 * Vẽ bảng dữ liệu câu hỏi
 */
function renderTable(questionsList) {
    tableBody.innerHTML = '';

    if (questionsList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: var(--text-secondary);">
                    Không tìm thấy câu hỏi nào.
                </td>
            </tr>
        `;
        return;
    }

    questionsList.forEach(q => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight: 700; color: var(--accent-gold);">${q.id}</td>
            <td>
                <div style="font-weight: 600; margin-bottom: 4px;">${escapeHtml(q.question_text)}</div>
                <div style="font-size: 0.82rem; color: var(--text-muted);">
                    A: ${escapeHtml(q.option_a)} | B: ${escapeHtml(q.option_b)} | C: ${escapeHtml(q.option_c)} | D: ${escapeHtml(q.option_d)}
                </div>
            </td>
            <td>
                <span class="badge badge-category">${escapeHtml(q.category || 'Chung')}</span>
                <span class="badge badge-difficulty">Lv.${q.difficulty || 1}</span>
            </td>
            <td style="text-align: center;">
                <span style="display: inline-block; padding: 4px 12px; background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 800; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.4);">
                    ${q.correct_answer}
                </span>
            </td>
            <td style="text-align: center;">
                <div class="admin-actions" style="justify-content: center;">
                    <button class="btn btn-secondary btn-sm" onclick="openEditModal(${q.id})">✏️ Sửa</button>
                    <button class="btn btn-danger btn-sm" onclick="handleDeleteQuestion(${q.id})">🗑️ Xóa</button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

/**
 * Xử lý tìm kiếm câu hỏi
 */
function handleSearch() {
    const keyword = searchInput.value.toLowerCase().trim();
    if (!keyword) {
        renderTable(allQuestions);
        return;
    }

    const filtered = allQuestions.filter(q => 
        q.question_text.toLowerCase().includes(keyword) ||
        (q.category && q.category.toLowerCase().includes(keyword)) ||
        q.option_a.toLowerCase().includes(keyword) ||
        q.option_b.toLowerCase().includes(keyword) ||
        q.option_c.toLowerCase().includes(keyword) ||
        q.option_d.toLowerCase().includes(keyword)
    );

    renderTable(filtered);
}

/**
 * Mở Modal thêm câu hỏi
 */
function openAddModal() {
    modalTitle.innerText = '➕ Thêm Câu Hỏi Mới';
    document.getElementById('question-form').reset();
    document.getElementById('form-question-id').value = '';
    document.getElementById('form-correct-answer').value = 'A';
    document.getElementById('form-difficulty').value = '1';
    modalBackdrop.classList.add('open');
}

/**
 * Mở Modal sửa câu hỏi
 */
function openEditModal(id) {
    const question = allQuestions.find(q => q.id === id);
    if (!question) return;

    modalTitle.innerText = `✏️ Chỉnh Sửa Câu Hỏi #${id}`;
    document.getElementById('form-question-id').value = question.id;
    document.getElementById('form-question-text').value = question.question_text;
    document.getElementById('form-opt-a').value = question.option_a;
    document.getElementById('form-opt-b').value = question.option_b;
    document.getElementById('form-opt-c').value = question.option_c;
    document.getElementById('form-opt-d').value = question.option_d;
    document.getElementById('form-correct-answer').value = question.correct_answer;
    document.getElementById('form-category').value = question.category || '';
    document.getElementById('form-difficulty').value = question.difficulty || 1;
    document.getElementById('form-explanation').value = question.explanation || '';

    modalBackdrop.classList.add('open');
}

/**
 * Đóng Modal
 */
function closeModal() {
    modalBackdrop.classList.remove('open');
}

/**
 * Lưu câu hỏi (Thêm mới hoặc Cập nhật)
 */
async function handleSaveQuestion(e) {
    e.preventDefault();

    const id = document.getElementById('form-question-id').value;
    const isEdit = Boolean(id);

    const payload = {
        question_text: document.getElementById('form-question-text').value.trim(),
        option_a: document.getElementById('form-opt-a').value.trim(),
        option_b: document.getElementById('form-opt-b').value.trim(),
        option_c: document.getElementById('form-opt-c').value.trim(),
        option_d: document.getElementById('form-opt-d').value.trim(),
        correct_answer: document.getElementById('form-correct-answer').value,
        category: document.getElementById('form-category').value.trim(),
        difficulty: parseInt(document.getElementById('form-difficulty').value, 10),
        explanation: document.getElementById('form-explanation').value.trim()
    };

    const btnSave = document.getElementById('btn-save-question');
    btnSave.disabled = true;
    btnSave.innerText = 'Đang lưu...';

    const url = isEdit ? `/api/admin/questions/${id}` : '/api/admin/questions';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
            closeModal();
            showAlert(isEdit ? 'Đã cập nhật câu hỏi thành công!' : 'Đã thêm câu hỏi mới thành công!', 'success');
            await loadAdminQuestions();
        } else {
            alert(data.error || 'Có lỗi xảy ra khi lưu câu hỏi.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ khi lưu.');
    } finally {
        btnSave.disabled = false;
        btnSave.innerText = 'Lưu Câu Hỏi';
    }
}

/**
 * Xóa câu hỏi có xác nhận
 */
async function handleDeleteQuestion(id) {
    const question = allQuestions.find(q => q.id === id);
    const textPreview = question ? `"${question.question_text.slice(0, 50)}..."` : `#${id}`;

    if (!confirm(`Bạn có chắc chắn muốn xóa câu hỏi ${textPreview}? Thao tác này không thể hoàn tác.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/admin/questions/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showAlert(`Đã xóa câu hỏi #${id} thành công!`, 'success');
            await loadAdminQuestions();
        } else {
            showAlert(data.error || 'Không thể xóa câu hỏi.', 'danger');
        }
    } catch (err) {
        showAlert('Lỗi kết nối khi xóa câu hỏi.', 'danger');
    }
}

/**
 * Đăng xuất admin
 */
function handleLogout() {
    if (confirm('Bạn có chắc muốn đăng xuất khỏi trang quản trị?')) {
        localStorage.removeItem('admin_token');
        window.location.href = '/login';
    }
}

/**
 * Helper escape HTML
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

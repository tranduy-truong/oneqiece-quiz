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
                <span style="display: inline-block; padding: 4px 12px; background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: 800; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3);">
                    ${q.correct_answer}
                </span>
            </td>
            <td style="text-align: center;">
                <div class="admin-actions" style="justify-content: center;">
                    <button class="btn btn-secondary btn-sm" onclick="openEditModal(${q.id})">Sửa</button>
                    <button class="btn btn-danger btn-sm" onclick="handleDeleteQuestion(${q.id})">Xóa</button>
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
    modalTitle.innerText = 'Thêm Câu Hỏi Mới';
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

    modalTitle.innerText = `Chỉnh Sửa Câu Hỏi #${id}`;
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
 * Mở Modal Nhập Hàng Loạt
 */
function openBulkModal() {
    const modal = document.getElementById('bulk-modal');
    document.getElementById('bulk-input').value = '';
    document.getElementById('bulk-preview-status').innerText = '';
    modal.classList.add('open');
}

/**
 * Đóng Modal Nhập Hàng Loạt
 */
function closeBulkModal() {
    const modal = document.getElementById('bulk-modal');
    modal.classList.remove('open');
}

/**
 * Xử lý nhập hàng loạt câu hỏi
 */
async function handleProcessBulk() {
    const rawInput = document.getElementById('bulk-input').value.trim();
    if (!rawInput) {
        alert('Vui lòng dán danh sách câu hỏi vào ô nhập liệu.');
        return;
    }

    let parsedQuestions = [];

    // 1. Thử parse dạng JSON
    try {
        let json = JSON.parse(rawInput);
        if (!Array.isArray(json) && json && Array.isArray(json.questions)) {
            json = json.questions;
        }
        if (Array.isArray(json)) {
            parsedQuestions = json.map(q => ({
                question_text: q.question_text || q.question || '',
                option_a: q.option_a || (q.options ? q.options.A : '') || '',
                option_b: q.option_b || (q.options ? q.options.B : '') || '',
                option_c: q.option_c || (q.options ? q.options.C : '') || '',
                option_d: q.option_d || (q.options ? q.options.D : '') || '',
                correct_answer: q.correct_answer || q.answer || 'A',
                category: q.category || 'Chung',
                difficulty: parseInt(q.difficulty, 10) || 1,
                explanation: q.explanation || ''
            })).filter(q => q.question_text && q.option_a && q.option_b && q.option_c && q.option_d);
        }
    } catch (e) {
        // 2. Nếu không phải JSON, parse dạng Văn Bản Tự Do
        parsedQuestions = parsePlainTextQuestions(rawInput);
    }

    if (parsedQuestions.length === 0) {
        alert('Không tìm thấy câu hỏi hợp lệ nào trong nội dung bạn vừa dán.\nVui lòng kiểm tra lại định dạng (mỗi câu cần có câu hỏi, 4 lựa chọn A, B, C, D và Đáp án).');
        return;
    }

    if (!confirm(`Hệ thống đã nhận diện được ${parsedQuestions.length} câu hỏi hợp lệ. Bạn có muốn nạp tất cả vào database?`)) {
        return;
    }

    const btnSubmit = document.getElementById('btn-submit-bulk');
    btnSubmit.disabled = true;
    btnSubmit.innerText = '⏳ Đang lưu dữ liệu...';

    try {
        const res = await fetch('/api/admin/questions/bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ questions: parsedQuestions })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            closeBulkModal();
            showAlert(data.message || `Đã thêm thành công ${parsedQuestions.length} câu hỏi!`, 'success');
            await loadAdminQuestions();
        } else {
            alert(data.error || 'Có lỗi xảy ra khi nạp dữ liệu hàng loạt.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ khi nạp câu hỏi.');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = '⚡ Tiến Hành Nhập Dữ Liệu';
    }
}

/**
 * Hàm phân tích văn bản tự do thành mảng câu hỏi
 */
function parsePlainTextQuestions(text) {
    const blocks = text.split(/\n\s*---\s*\n|\n\s*===\s*\n|\n{2,}/);
    const result = [];

    blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 5) return;

        let qText = '';
        let optA = '', optB = '', optC = '', optD = '';
        let correct = '';
        let category = 'Chung';
        let difficulty = 1;
        let explanation = '';

        lines.forEach(line => {
            if (/^(Câu\s*\d*[:.]?|Question\s*\d*[:.]?)/i.test(line)) {
                qText = line.replace(/^(Câu\s*\d*[:.]?|Question\s*\d*[:.]?)\s*/i, '');
            } else if (/^[AÀa]\s*[:.)-]\s*/i.test(line)) {
                optA = line.replace(/^[AÀa]\s*[:.)-]\s*/i, '');
            } else if (/^[Bᵇb]\s*[:.)-]\s*/i.test(line)) {
                optB = line.replace(/^[Bᵇb]\s*[:.)-]\s*/i, '');
            } else if (/^[Cᶜc]\s*[:.)-]\s*/i.test(line)) {
                optC = line.replace(/^[Cᶜc]\s*[:.)-]\s*/i, '');
            } else if (/^[Dᵈd]\s*[:.)-]\s*/i.test(line)) {
                optD = line.replace(/^[Dᵈd]\s*[:.)-]\s*/i, '');
            } else if (/^(Đáp án|Đáp án đúng|Answer|Key)\s*[:.]?\s*([A-D])/i.test(line)) {
                const match = line.match(/^(Đáp án|Đáp án đúng|Answer|Key)\s*[:.]?\s*([A-D])/i);
                if (match) correct = match[2].toUpperCase();
            } else if (/^(Chủ đề|Category)\s*[:.]?\s*(.+)/i.test(line)) {
                const match = line.match(/^(Chủ đề|Category)\s*[:.]?\s*(.+)/i);
                if (match) category = match[2].trim();
            } else if (/^(Độ khó|Level|Difficulty)\s*[:.]?\s*(\d)/i.test(line)) {
                const match = line.match(/^(Độ khó|Level|Difficulty)\s*[:.]?\s*(\d)/i);
                if (match) difficulty = parseInt(match[2], 10) || 1;
            } else if (/^(Giải thích|Explanation|Nguồn)\s*[:.]?\s*(.+)/i.test(line)) {
                const match = line.match(/^(Giải thích|Explanation|Nguồn)\s*[:.]?\s*(.+)/i);
                if (match) explanation = match[2].trim();
            } else if (!qText) {
                qText = line;
            }
        });

        if (qText && optA && optB && optC && optD && correct) {
            result.push({
                question_text: qText,
                option_a: optA,
                option_b: optB,
                option_c: optC,
                option_d: optD,
                correct_answer: correct,
                category: category,
                difficulty: difficulty,
                explanation: explanation
            });
        }
    });

    return result;
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

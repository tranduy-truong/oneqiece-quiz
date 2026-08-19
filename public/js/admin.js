/**
 * Admin Panel Controller
 */

let allQuestions = [];
const authToken = localStorage.getItem('admin_token');

// DOM Elements
const questionsTableBody = document.getElementById('questions-table-body');
const totalCountSpan = document.getElementById('total-count');
const adminAlert = document.getElementById('admin-alert');
const questionModal = document.getElementById('question-modal');
const modalTitle = document.getElementById('modal-title');
const searchInput = document.getElementById('search-input');
const bulkModal = document.getElementById('bulk-modal');
const bulkInput = document.getElementById('bulk-input');
const bulkPreviewStatus = document.getElementById('bulk-preview-status');

document.addEventListener('DOMContentLoaded', async () => {
    if (!authToken) {
        window.location.href = '/login';
        return;
    }

    try {
        const res = await fetch('/api/admin/me', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) {
            localStorage.removeItem('admin_token');
            window.location.href = '/login';
            return;
        }
    } catch (e) {
        window.location.href = '/login';
        return;
    }

    loadDashboardStats();
});

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-btn-${tabName}`).classList.add('active');

    const tabs = ['stats', 'questions', 'quizzes', 'games'];
    tabs.forEach(t => {
        document.getElementById(`tab-content-${t}`).style.display = (t === tabName) ? 'block' : 'none';
    });

    if (tabName === 'stats') loadDashboardStats();
    else if (tabName === 'questions') loadQuestions();
    else if (tabName === 'quizzes') loadAdminQuizzes();
    else if (tabName === 'games') loadAdminGames();
}

async function loadDashboardStats() {
    try {
        const res = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await res.json();
        if (res.ok && result.success) {
            const d = result.data;
            document.getElementById('stat-total-q').innerText = d.total_questions;
            document.getElementById('stat-total-quizzes').innerText = d.total_quizzes;
            document.getElementById('stat-total-topics').innerText = d.total_topics;
            document.getElementById('stat-total-games').innerText = d.games_played;
            document.getElementById('stat-total-players').innerText = d.total_players;
            document.getElementById('stat-games-today').innerText = d.games_today;
        }
    } catch (err) {
        console.error('Lỗi tải stats:', err);
    }
}

async function loadQuestions() {
    try {
        const response = await fetch('/api/admin/questions', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            allQuestions = result.data;
            totalCountSpan.innerText = allQuestions.length;
            renderQuestionsTable(allQuestions);
        } else {
            showAlert(result.error || 'Không thể tải danh sách câu hỏi.', 'danger');
        }
    } catch (error) {
        showAlert('Lỗi kết nối cơ sở dữ liệu.', 'danger');
    }
}

function renderQuestionsTable(questions) {
    if (questions.length === 0) {
        questionsTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: var(--text-muted);">
                    Chưa có câu hỏi nào.
                </td>
            </tr>
        `;
        return;
    }

    questionsTableBody.innerHTML = questions.map(q => `
        <tr>
            <td style="font-weight: 700; color: var(--color-skyblue);">#${q.id}</td>
            <td>
                <div style="font-weight: 600; color: var(--text-main); margin-bottom: 6px;">
                    ${escapeHtml(q.question_text)}
                </div>
                <div style="font-size: 0.84rem; color: var(--text-muted); display: flex; gap: 10px; flex-wrap: wrap;">
                    <span>A: ${escapeHtml(q.option_a)}</span>
                    <span>B: ${escapeHtml(q.option_b)}</span>
                    <span>C: ${escapeHtml(q.option_c)}</span>
                    <span>D: ${escapeHtml(q.option_d)}</span>
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
        </tr>
    `).join('');
}

function handleSearch() {
    const term = searchInput.value.toLowerCase().trim();
    if (!term) {
        renderQuestionsTable(allQuestions);
        return;
    }

    const filtered = allQuestions.filter(q => 
        q.question_text.toLowerCase().includes(term) ||
        (q.category && q.category.toLowerCase().includes(term)) ||
        q.option_a.toLowerCase().includes(term) ||
        q.option_b.toLowerCase().includes(term) ||
        q.option_c.toLowerCase().includes(term) ||
        q.option_d.toLowerCase().includes(term)
    );

    renderQuestionsTable(filtered);
}

function openAddModal() {
    modalTitle.innerText = 'Thêm Câu Hỏi Mới';
    document.getElementById('question-form').reset();
    document.getElementById('form-question-id').value = '';
    document.getElementById('form-correct-answer').value = 'A';
    document.getElementById('form-difficulty').value = '1';
    questionModal.classList.add('open');
}

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
    document.getElementById('form-difficulty').value = question.difficulty || '1';
    document.getElementById('form-explanation').value = question.explanation || '';

    questionModal.classList.add('open');
}

function closeModal() {
    questionModal.classList.remove('open');
}

async function handleSaveQuestion(e) {
    e.preventDefault();

    const id = document.getElementById('form-question-id').value;
    const isEdit = Boolean(id);

    const questionData = {
        question_text: document.getElementById('form-question-text').value.trim(),
        option_a: document.getElementById('form-opt-a').value.trim(),
        option_b: document.getElementById('form-opt-b').value.trim(),
        option_c: document.getElementById('form-opt-c').value.trim(),
        option_d: document.getElementById('form-opt-d').value.trim(),
        correct_answer: document.getElementById('form-correct-answer').value,
        category: document.getElementById('form-category').value.trim() || 'Chung',
        difficulty: parseInt(document.getElementById('form-difficulty').value, 10) || 1,
        explanation: document.getElementById('form-explanation').value.trim()
    };

    try {
        const url = isEdit ? `/api/admin/questions/${id}` : '/api/admin/questions';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(questionData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showAlert(result.message || 'Lưu câu hỏi thành công!', 'success');
            closeModal();
            loadQuestions();
        } else {
            alert(result.error || 'Không thể lưu câu hỏi.');
        }
    } catch (error) {
        alert('Lỗi kết nối máy chủ.');
    }
}

async function handleDeleteQuestion(id) {
    if (!confirm(`Bạn có chắc chắn muốn xóa câu hỏi #${id}?`)) return;

    try {
        const response = await fetch(`/api/admin/questions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showAlert('Đã xóa câu hỏi thành công!', 'success');
            loadQuestions();
        } else {
            showAlert(result.error || 'Không thể xóa câu hỏi.', 'danger');
        }
    } catch (error) {
        showAlert('Lỗi kết nối máy chủ.', 'danger');
    }
}

function openBulkModal() {
    bulkInput.value = '';
    bulkPreviewStatus.innerText = '';
    bulkModal.classList.add('open');
}

function closeBulkModal() {
    bulkModal.classList.remove('open');
}

async function handleProcessBulk() {
    const rawInput = bulkInput.value.trim();
    if (!rawInput) {
        alert('Vui lòng dán danh sách câu hỏi.');
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
        // 2. Parse dạng văn bản
        parsedQuestions = parsePlainTextQuestions(rawInput);
    }

    if (parsedQuestions.length === 0) {
        alert('Không tìm thấy câu hỏi hợp lệ nào.');
        return;
    }

    try {
        const response = await fetch('/api/admin/questions/bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ questions: parsedQuestions })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showAlert(result.message, 'success');
            closeBulkModal();
            loadQuestions();
        } else {
            alert(result.error || 'Lỗi khi nhập hàng loạt.');
        }
    } catch (error) {
        alert('Lỗi kết nối máy chủ.');
    }
}

function parsePlainTextQuestions(text) {
    const list = [];
    const blocks = text.split(/\n\s*---\s*\n|\n\s*={3,}\s*\n/);

    for (const block of blocks) {
        if (!block.trim()) continue;

        const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let qText = '';
        let optA = '', optB = '', optC = '', optD = '';
        let correctAns = '';
        let cat = 'Chung';
        let diff = 1;
        let exp = '';

        for (const line of lines) {
            if (/^(Câu\s*\d*[:.]?|Q\s*\d*[:.]?)/i.test(line)) {
                qText = line.replace(/^(Câu\s*\d*[:.]?|Q\s*\d*[:.]?)\s*/i, '').trim();
            } else if (/^[A][:.)]\s*/i.test(line)) {
                optA = line.replace(/^[A][:.)]\s*/i, '').trim();
            } else if (/^[B][:.)]\s*/i.test(line)) {
                optB = line.replace(/^[B][:.)]\s*/i, '').trim();
            } else if (/^[C][:.)]\s*/i.test(line)) {
                optC = line.replace(/^[C][:.)]\s*/i, '').trim();
            } else if (/^[D][:.)]\s*/i.test(line)) {
                optD = line.replace(/^[D][:.)]\s*/i, '').trim();
            } else if (/^(Đáp án|Answer|Key)[:.]?\s*/i.test(line)) {
                const match = line.match(/[A-D]/i);
                if (match) correctAns = match[0].toUpperCase();
            } else if (/^(Chủ đề|Category)[:.]?\s*/i.test(line)) {
                cat = line.replace(/^(Chủ đề|Category)[:.]?\s*/i, '').trim();
            } else if (/^(Độ khó|Level|Difficulty)[:.]?\s*/i.test(line)) {
                const num = parseInt(line.replace(/\D/g, ''), 10);
                if (num >= 1 && num <= 6) diff = num;
            } else if (/^(Giải thích|Explanation|Nguồn)[:.]?\s*/i.test(line)) {
                exp = line.replace(/^(Giải thích|Explanation|Nguồn)[:.]?\s*/i, '').trim();
            } else if (!qText) {
                qText = line;
            }
        }

        if (qText && optA && optB && optC && optD && correctAns) {
            list.push({
                question_text: qText,
                option_a: optA,
                option_b: optB,
                option_c: optC,
                option_d: optD,
                correct_answer: correctAns,
                category: cat,
                difficulty: diff,
                explanation: exp
            });
        }
    }

    return list;
}

async function loadAdminQuizzes() {
    const tbody = document.getElementById('quizzes-table-body');
    try {
        const res = await fetch('/api/quizzes');
        const data = await res.json();
        if (res.ok && data.success && data.data.length > 0) {
            tbody.innerHTML = data.data.map(q => `
                <tr>
                    <td style="font-weight: 700; color: var(--color-skyblue);">#${q.id}</td>
                    <td>
                        <strong style="color: var(--text-main); font-size: 1rem;">${escapeHtml(q.title)}</strong>
                        <div style="font-size: 0.84rem; color: var(--text-muted);">${escapeHtml(q.description || '')}</div>
                    </td>
                    <td>
                        <span class="badge badge-category">${escapeHtml(q.topic_name || 'Chung')}</span>
                    </td>
                    <td style="text-align: center; font-weight: 700;">${q.time_per_question || 15}s</td>
                    <td style="text-align: center; font-weight: 700;">${q.total_questions || 20}</td>
                    <td style="text-align: center;">
                        <span class="badge ${q.status === 'PUBLISHED' ? 'badge-category' : 'badge-difficulty'}">
                            ${q.status}
                        </span>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-wrong);">Không thể tải bộ đề.</td></tr>';
    }
}

async function loadAdminGames() {
    const tbody = document.getElementById('games-table-body');
    try {
        const res = await fetch('/api/admin/games', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (res.ok && data.success && data.data.length > 0) {
            tbody.innerHTML = data.data.map(g => `
                <tr>
                    <td style="font-weight: 700; color: var(--color-skyblue);">#${g.id}</td>
                    <td><strong style="color: var(--text-main);">${escapeHtml(g.quiz_title || 'One Piece Grand Test')}</strong></td>
                    <td><span class="badge ${g.mode === 'MULTIPLAYER' ? 'badge-category' : 'badge-difficulty'}">${g.mode}</span></td>
                    <td style="text-align: center; font-weight: 700;">${g.player_count || 1}</td>
                    <td style="font-weight: 700; color: #ffd700;">${g.winner ? `👑 ${escapeHtml(g.winner)}` : 'Chưa có'}</td>
                    <td style="font-size: 0.85rem; color: var(--text-muted);">${new Date(g.started_at).toLocaleString('vi-VN')}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Chưa có trận đấu nào được lưu trong hệ thống.</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-wrong);">Không thể tải lịch sử trận đấu.</td></tr>';
    }
}

function showAlert(message, type = 'success') {
    adminAlert.className = `alert alert-${type} show`;
    adminAlert.innerText = message;
    setTimeout(() => {
        adminAlert.className = 'alert';
    }, 4000);
}

function handleLogout() {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

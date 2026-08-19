/**
 * Admin Panel Complete Controller
 */

let allQuestions = [];
let allQuizzes = [];
let allTopics = [];
const authToken = localStorage.getItem('admin_token');

// DOM Elements - Common
const adminAlert = document.getElementById('admin-alert');
const totalCountSpan = document.getElementById('total-count');
const searchInput = document.getElementById('search-input');
const filterQuizSelect = document.getElementById('filter-quiz');

// DOM Elements - Questions
const questionsTableBody = document.getElementById('questions-table-body');
const questionModal = document.getElementById('question-modal');
const modalTitle = document.getElementById('modal-title');
const formQuizId = document.getElementById('form-quiz-id');
const bulkModal = document.getElementById('bulk-modal');
const bulkQuizId = document.getElementById('bulk-quiz-id');
const bulkInput = document.getElementById('bulk-input');
const bulkPreviewStatus = document.getElementById('bulk-preview-status');

// DOM Elements - Quizzes & Topics
const quizzesTableBody = document.getElementById('quizzes-table-body');
const topicsTableBody = document.getElementById('topics-table-body');
const quizModal = document.getElementById('quiz-modal');
const quizModalTitle = document.getElementById('quiz-modal-title');
const formQuizTopic = document.getElementById('form-quiz-topic');
const topicModal = document.getElementById('topic-modal');
const topicModalTitle = document.getElementById('topic-modal-title');

// DOM Elements - Games
const gamesTableBody = document.getElementById('games-table-body');

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

    // Load initial metadata
    await loadInitialData();
    loadDashboardStats();
});

async function loadInitialData() {
    await Promise.all([loadAdminTopics(), loadAdminQuizzes()]);
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-btn-${tabName}`).classList.add('active');

    const tabs = ['stats', 'questions', 'quizzes', 'games'];
    tabs.forEach(t => {
        document.getElementById(`tab-content-${t}`).style.display = (t === tabName) ? 'block' : 'none';
    });

    if (tabName === 'stats') loadDashboardStats();
    else if (tabName === 'questions') loadQuestions();
    else if (tabName === 'quizzes') { loadAdminQuizzes(); loadAdminTopics(); }
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

// ==========================================
// 1. QUẢN LÝ CÂU HỎI (QUESTIONS)
// ==========================================

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
                <div style="font-weight: 700; color: var(--color-skyblue); font-size: 0.9rem; margin-bottom: 4px;">
                    ${escapeHtml(q.quiz_title || 'One Piece Grand Test')}
                </div>
                <div>
                    <span class="badge badge-category">${escapeHtml(q.category || q.topic_name || 'Chung')}</span>
                    <span class="badge badge-difficulty">Lv.${q.difficulty || 1}</span>
                </div>
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
    const quizFilterId = filterQuizSelect.value;

    let filtered = allQuestions;

    if (quizFilterId) {
        filtered = filtered.filter(q => String(q.quiz_id) === String(quizFilterId));
    }

    if (term) {
        filtered = filtered.filter(q => 
            q.question_text.toLowerCase().includes(term) ||
            (q.category && q.category.toLowerCase().includes(term)) ||
            (q.quiz_title && q.quiz_title.toLowerCase().includes(term)) ||
            q.option_a.toLowerCase().includes(term) ||
            q.option_b.toLowerCase().includes(term) ||
            q.option_c.toLowerCase().includes(term) ||
            q.option_d.toLowerCase().includes(term)
        );
    }

    renderQuestionsTable(filtered);
}

function openAddModal() {
    modalTitle.innerText = 'Thêm Câu Hỏi Mới';
    document.getElementById('question-form').reset();
    document.getElementById('form-question-id').value = '';
    document.getElementById('form-correct-answer').value = 'A';
    document.getElementById('form-difficulty').value = '1';

    // Populate quiz options
    populateQuizDropdowns();
    questionModal.classList.add('open');
}

function openEditModal(id) {
    const question = allQuestions.find(q => q.id === id);
    if (!question) return;

    modalTitle.innerText = `Chỉnh Sửa Câu Hỏi #${id}`;
    populateQuizDropdowns();

    document.getElementById('form-question-id').value = question.id;
    if (formQuizId) formQuizId.value = question.quiz_id || (allQuizzes[0] ? allQuizzes[0].id : '1');
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
        quiz_id: parseInt(formQuizId.value, 10) || 1,
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
            loadAdminQuizzes();
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
            loadAdminQuizzes();
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
    populateQuizDropdowns();
    bulkModal.classList.add('open');
}

function closeBulkModal() {
    bulkModal.classList.remove('open');
}

async function handleProcessBulk() {
    const rawInput = bulkInput.value.trim();
    const targetQuizId = parseInt(bulkQuizId.value, 10) || 1;

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
            body: JSON.stringify({
                quiz_id: targetQuizId,
                questions: parsedQuestions
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showAlert(result.message, 'success');
            closeBulkModal();
            loadQuestions();
            loadAdminQuizzes();
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

// ==========================================
// 2. QUẢN LÝ BỘ ĐỀ (QUIZZES CRUD)
// ==========================================

async function loadAdminQuizzes() {
    try {
        const res = await fetch('/api/admin/quizzes', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
            allQuizzes = data.data;
            renderQuizzesTable(allQuizzes);
            populateQuizDropdowns();
        }
    } catch (e) {
        console.error('Lỗi tải quizzes:', e);
    }
}

function renderQuizzesTable(quizzes) {
    if (quizzes.length === 0) {
        quizzesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">Chưa có bộ đề nào. Hãy bấm "Thêm Bộ Đề Mới"!</td></tr>';
        return;
    }

    quizzesTableBody.innerHTML = quizzes.map(q => {
        const statusBadge = q.status === 'PUBLISHED' 
            ? '<span class="badge badge-category">Công Khai</span>' 
            : '<span class="badge badge-difficulty">Bản Nháp</span>';

        return `
            <tr>
                <td style="font-weight: 700; color: var(--color-skyblue);">#${q.id}</td>
                <td>
                    <strong style="color: var(--text-main); font-size: 1rem;">${escapeHtml(q.title)}</strong>
                    <div style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(q.description || '')}</div>
                </td>
                <td>
                    <span class="badge badge-category">${escapeHtml(q.topic_icon || '⚓')} ${escapeHtml(q.topic_name || 'Chung')}</span>
                </td>
                <td style="text-align: center; font-weight: 800; color: var(--color-skyblue); font-size: 1rem;">
                    ${q.question_count || 0} câu
                </td>
                <td style="text-align: center; font-weight: 700;">${q.time_per_question || 15}s</td>
                <td style="text-align: center;">${statusBadge}</td>
                <td style="text-align: center;">
                    <div class="admin-actions" style="justify-content: center;">
                        <button class="btn btn-secondary btn-sm" onclick="openEditQuizModal(${q.id})">Sửa</button>
                        <button class="btn btn-danger btn-sm" onclick="handleDeleteQuiz(${q.id})">Xóa</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function populateQuizDropdowns() {
    // 1. Filter dropdown
    if (filterQuizSelect) {
        const currentVal = filterQuizSelect.value;
        filterQuizSelect.innerHTML = '<option value="">-- Tất cả bộ đề --</option>' + 
            allQuizzes.map(q => `<option value="${q.id}">${q.topic_icon || '⚓'} ${q.title} (${q.question_count || 0} câu)</option>`).join('');
        filterQuizSelect.value = currentVal;
    }

    // 2. Question Form dropdown
    if (formQuizId) {
        formQuizId.innerHTML = allQuizzes.map(q => `<option value="${q.id}">${q.topic_icon || '⚓'} ${q.title}</option>`).join('');
    }

    // 3. Bulk import dropdown
    if (bulkQuizId) {
        bulkQuizId.innerHTML = allQuizzes.map(q => `<option value="${q.id}">${q.topic_icon || '⚓'} ${q.title}</option>`).join('');
    }
}

function openAddQuizModal() {
    quizModalTitle.innerText = 'Thêm Bộ Đề Thi Mới';
    document.getElementById('quiz-form').reset();
    document.getElementById('form-quiz-edit-id').value = '';
    document.getElementById('form-quiz-time').value = '15';
    document.getElementById('form-quiz-total').value = '20';
    document.getElementById('form-quiz-status').value = 'PUBLISHED';

    populateTopicDropdown();
    quizModal.classList.add('open');
}

function openEditQuizModal(id) {
    const q = allQuizzes.find(item => item.id === id);
    if (!q) return;

    quizModalTitle.innerText = `Chỉnh Sửa Bộ Đề #${id}`;
    populateTopicDropdown();

    document.getElementById('form-quiz-edit-id').value = q.id;
    document.getElementById('form-quiz-title').value = q.title;
    document.getElementById('form-quiz-topic').value = q.topic_id;
    document.getElementById('form-quiz-time').value = q.time_per_question || 15;
    document.getElementById('form-quiz-total').value = q.total_questions || 20;
    document.getElementById('form-quiz-status').value = q.status || 'PUBLISHED';
    document.getElementById('form-quiz-desc').value = q.description || '';

    quizModal.classList.add('open');
}

function closeQuizModal() {
    quizModal.classList.remove('open');
}

async function handleSaveQuiz(e) {
    e.preventDefault();
    const id = document.getElementById('form-quiz-edit-id').value;
    const isEdit = Boolean(id);

    const quizData = {
        title: document.getElementById('form-quiz-title').value.trim(),
        topic_id: parseInt(document.getElementById('form-quiz-topic').value, 10) || 1,
        time_per_question: parseInt(document.getElementById('form-quiz-time').value, 10) || 15,
        total_questions: parseInt(document.getElementById('form-quiz-total').value, 10) || 20,
        status: document.getElementById('form-quiz-status').value,
        description: document.getElementById('form-quiz-desc').value.trim()
    };

    try {
        const url = isEdit ? `/api/admin/quizzes/${id}` : '/api/admin/quizzes';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(quizData)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showAlert(result.message || 'Lưu bộ đề thành công!', 'success');
            closeQuizModal();
            loadAdminQuizzes();
        } else {
            alert(result.error || 'Không thể lưu bộ đề.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

async function handleDeleteQuiz(id) {
    if (!confirm(`Bạn có chắc chắn muốn xóa bộ đề #${id}? (Các câu hỏi sẽ tự động được gán về bộ đề mặc định)`)) return;

    try {
        const res = await fetch(`/api/admin/quizzes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showAlert('Đã xóa bộ đề thành công!', 'success');
            loadAdminQuizzes();
            loadQuestions();
        } else {
            alert(result.error || 'Lỗi khi xóa bộ đề.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

// ==========================================
// 3. QUẢN LÝ CHỦ ĐỀ (TOPICS CRUD)
// ==========================================

async function loadAdminTopics() {
    try {
        const res = await fetch('/api/admin/topics', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
            allTopics = data.data;
            renderTopicsTable(allTopics);
            populateTopicDropdown();
        }
    } catch (e) {
        console.error('Lỗi tải topics:', e);
    }
}

function renderTopicsTable(topics) {
    if (topics.length === 0) {
        topicsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">Chưa có chủ đề nào.</td></tr>';
        return;
    }

    topicsTableBody.innerHTML = topics.map(t => `
        <tr>
            <td style="font-weight: 700; color: var(--color-skyblue);">#${t.id}</td>
            <td>
                <span style="font-size: 1.2rem; margin-right: 6px;">${escapeHtml(t.icon || '⚓')}</span>
                <strong style="color: var(--text-main); font-size: 1rem;">${escapeHtml(t.name)}</strong>
            </td>
            <td style="color: var(--text-muted); font-size: 0.88rem;">${escapeHtml(t.description || 'Không có mô tả')}</td>
            <td style="text-align: center; font-weight: 700; color: var(--color-skyblue);">${t.total_quizzes || 0} bộ đề</td>
            <td style="text-align: center;">
                <div class="admin-actions" style="justify-content: center;">
                    <button class="btn btn-secondary btn-sm" onclick="openEditTopicModal(${t.id})">Sửa</button>
                    ${t.id !== 1 ? `<button class="btn btn-danger btn-sm" onclick="handleDeleteTopic(${t.id})">Xóa</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function populateTopicDropdown() {
    if (formQuizTopic) {
        formQuizTopic.innerHTML = allTopics.map(t => `<option value="${t.id}">${t.icon || '⚓'} ${t.name}</option>`).join('');
    }
}

function openAddTopicModal() {
    topicModalTitle.innerText = 'Thêm Chủ Đề Mới';
    document.getElementById('topic-form').reset();
    document.getElementById('form-topic-edit-id').value = '';
    document.getElementById('form-topic-icon').value = '⚓';
    topicModal.classList.add('open');
}

function openEditTopicModal(id) {
    const t = allTopics.find(item => item.id === id);
    if (!t) return;

    topicModalTitle.innerText = `Chỉnh Sửa Chủ Đề #${id}`;
    document.getElementById('form-topic-edit-id').value = t.id;
    document.getElementById('form-topic-name').value = t.name;
    document.getElementById('form-topic-icon').value = t.icon || '⚓';
    document.getElementById('form-topic-desc').value = t.description || '';
    topicModal.classList.add('open');
}

function closeTopicModal() {
    topicModal.classList.remove('open');
}

async function handleSaveTopic(e) {
    e.preventDefault();
    const id = document.getElementById('form-topic-edit-id').value;
    const isEdit = Boolean(id);

    const topicData = {
        name: document.getElementById('form-topic-name').value.trim(),
        icon: document.getElementById('form-topic-icon').value.trim() || '⚓',
        description: document.getElementById('form-topic-desc').value.trim()
    };

    try {
        const url = isEdit ? `/api/admin/topics/${id}` : '/api/admin/topics';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(topicData)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showAlert(result.message || 'Lưu chủ đề thành công!', 'success');
            closeTopicModal();
            loadAdminTopics();
        } else {
            alert(result.error || 'Không thể lưu chủ đề.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

async function handleDeleteTopic(id) {
    if (!confirm(`Bạn có chắc chắn muốn xóa chủ đề #${id}?`)) return;

    try {
        const res = await fetch(`/api/admin/topics/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showAlert('Đã xóa chủ đề thành công!', 'success');
            loadAdminTopics();
            loadAdminQuizzes();
        } else {
            alert(result.error || 'Lỗi khi xóa chủ đề.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

// ==========================================
// 4. LỊCH SỬ TRẬN ĐẤU (GAME HISTORY)
// ==========================================

async function loadAdminGames() {
    try {
        const res = await fetch('/api/admin/games', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (res.ok && data.success && data.data.length > 0) {
            gamesTableBody.innerHTML = data.data.map(g => `
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
            gamesTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Chưa có trận đấu nào được lưu trong hệ thống.</td></tr>';
        }
    } catch (e) {
        gamesTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-wrong);">Không thể tải lịch sử trận đấu.</td></tr>';
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

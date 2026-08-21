/**
 * Admin Control Center - Categorized Navigation & Full Customization
 */

let allQuestions = [];
let allQuizzes = [];
let allTopics = [];
let allMusic = [];
let allAvatars = [];
const authToken = localStorage.getItem('admin_token');

// DOM Elements
const adminAlert = document.getElementById('admin-alert');
const totalCountSpan = document.getElementById('total-count');
const searchInput = document.getElementById('search-input');
const filterQuizSelect = document.getElementById('filter-quiz');

const questionsTableBody = document.getElementById('questions-table-body');
const quizzesTableBody = document.getElementById('quizzes-table-body');
const topicsTableBody = document.getElementById('topics-table-body');
const gamesTableBody = document.getElementById('games-table-body');

const questionModal = document.getElementById('question-modal');
const modalTitle = document.getElementById('modal-title');
const formQuizId = document.getElementById('form-quiz-id');
const bulkModal = document.getElementById('bulk-modal');
const bulkQuizId = document.getElementById('bulk-quiz-id');
const bulkInput = document.getElementById('bulk-input');

const quizModal = document.getElementById('quiz-modal');
const quizModalTitle = document.getElementById('quiz-modal-title');
const formQuizTopic = document.getElementById('form-quiz-topic');

const topicModal = document.getElementById('topic-modal');
const topicModalTitle = document.getElementById('topic-modal-title');

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

    // Load initial settings and data
    await Promise.all([
        loadSiteSettingsAdmin(),
        loadAdminTopics(),
        loadAdminQuizzes()
    ]);
});

// ==========================================
// 1. DANH MỤC LỚN & ĐIỀU HƯỚNG
// ==========================================

function switchCategory(catName) {
    document.querySelectorAll('.admin-category-card').forEach(c => c.classList.remove('active'));
    const targetCard = document.getElementById(`cat-card-${catName}`);
    if (targetCard) targetCard.classList.add('active');

    const sections = ['settings', 'quiz-engine', 'music', 'avatars', 'analytics'];
    sections.forEach(sec => {
        const el = document.getElementById(`section-${sec}`);
        if (el) el.style.display = (sec === catName) ? 'block' : 'none';
    });

    if (catName === 'settings') loadSiteSettingsAdmin();
    else if (catName === 'quiz-engine') loadQuestions();
    else if (catName === 'music') loadAdminMusic();
    else if (catName === 'avatars') loadAdminAvatars();
    else if (catName === 'analytics') { loadDashboardStats(); loadAdminGames(); }
}

function switchQuizSubTab(subTab) {
    document.querySelectorAll('.admin-sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`subtab-btn-${subTab}`);
    if (targetBtn) targetBtn.classList.add('active');

    const subTabs = ['questions', 'quizzes', 'topics'];
    subTabs.forEach(st => {
        const el = document.getElementById(`subcontent-${st}`);
        if (el) el.style.display = (st === subTab) ? 'block' : 'none';
    });

    if (subTab === 'questions') loadQuestions();
    else if (subTab === 'quizzes') loadAdminQuizzes();
    else if (subTab === 'topics') loadAdminTopics();
}

// ==========================================
// 2. GIAO DIỆN & CẤU HÌNH BANNER
// ==========================================

async function loadSiteSettingsAdmin() {
    try {
        const res = await fetch('/api/admin/settings', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await res.json();
        if (res.ok && result.success && result.data) {
            const s = result.data;
            if (s.site_name) document.getElementById('setting-site-name').value = s.site_name;
            if (s.hero_title) document.getElementById('setting-hero-title').value = s.hero_title;
            if (s.hero_subtitle) document.getElementById('setting-hero-subtitle').value = s.hero_subtitle;
            if (s.banner_image) {
                document.getElementById('setting-banner-url').value = s.banner_image;
                document.getElementById('preview-banner-img').src = s.banner_image;
                const bg = document.getElementById('site-bg-img');
                if (bg) bg.src = s.banner_image;
            }

            // Options A, B, C, D
            ['a', 'b', 'c', 'd'].forEach(letter => {
                const key = `icon_option_${letter}`;
                const urlInput = document.getElementById(`setting-opt-${letter}-url`);
                const previewImg = document.getElementById(`preview-opt-${letter}`);
                if (s[key]) {
                    if (urlInput) urlInput.value = s[key];
                    if (previewImg) previewImg.src = s[key];
                }
            });

            // GIFs
            ['correct', 'wrong', 'loading'].forEach(type => {
                const key = `gif_${type}`;
                const urlInput = document.getElementById(`setting-gif-${type}-url`);
                const previewImg = document.getElementById(`preview-gif-${type}`);
                if (s[key]) {
                    if (urlInput) urlInput.value = s[key];
                    if (previewImg) previewImg.src = s[key];
                }
            });
        }
    } catch (e) {
        console.warn('Lỗi load settings:', e);
    }
}

async function handleSaveOptionAsset(letter) {
    const l = letter.toLowerCase();
    const fileInput = document.getElementById(`file-opt-${l}`);
    const urlInput = document.getElementById(`setting-opt-${l}-url`);
    const previewImg = document.getElementById(`preview-opt-${l}`);
    const targetKey = `icon_option_${l}`;

    if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('asset_file', fileInput.files[0]);
        formData.append('target_key', targetKey);

        try {
            const res = await fetch('/api/admin/settings/upload-asset', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
                body: formData
            });
            const result = await res.json();
            if (res.ok && result.success) {
                showAlert(`Tải lên Icon ${letter} thành công!`, 'success');
                if (urlInput) urlInput.value = result.asset_url;
                if (previewImg) previewImg.src = result.asset_url;
                fileInput.value = '';
            } else {
                alert(result.error || 'Lỗi upload ảnh.');
            }
        } catch (err) {
            alert('Lỗi kết nối máy chủ.');
        }
    } else if (urlInput && urlInput.value.trim()) {
        const payload = {};
        payload[targetKey] = urlInput.value.trim();

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (res.ok && result.success) {
                showAlert(`Cập nhật Icon ${letter} thành công!`, 'success');
                if (previewImg) previewImg.src = payload[targetKey];
            } else {
                alert(result.error || 'Lỗi khi lưu.');
            }
        } catch (err) {
            alert('Lỗi kết nối máy chủ.');
        }
    } else {
        alert(`Vui lòng chọn file hoặc nhập URL ảnh cho Icon ${letter}.`);
    }
}

async function handleSaveGifAsset(type) {
    const fileInput = document.getElementById(`file-gif-${type}`);
    const urlInput = document.getElementById(`setting-gif-${type}-url`);
    const previewImg = document.getElementById(`preview-gif-${type}`);
    const targetKey = `gif_${type}`;

    if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('asset_file', fileInput.files[0]);
        formData.append('target_key', targetKey);

        try {
            const res = await fetch('/api/admin/settings/upload-asset', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
                body: formData
            });
            const result = await res.json();
            if (res.ok && result.success) {
                showAlert(`Tải lên GIF ${type} thành công!`, 'success');
                if (urlInput) urlInput.value = result.asset_url;
                if (previewImg) previewImg.src = result.asset_url;
                fileInput.value = '';
            } else {
                alert(result.error || 'Lỗi upload GIF.');
            }
        } catch (err) {
            alert('Lỗi kết nối máy chủ.');
        }
    } else if (urlInput && urlInput.value.trim()) {
        const payload = {};
        payload[targetKey] = urlInput.value.trim();

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (res.ok && result.success) {
                showAlert(`Cập nhật GIF ${type} thành công!`, 'success');
                if (previewImg) previewImg.src = payload[targetKey];
            } else {
                alert(result.error || 'Lỗi khi lưu.');
            }
        } catch (err) {
            alert('Lỗi kết nối máy chủ.');
        }
    } else {
        alert(`Vui lòng chọn file GIF hoặc nhập URL GIF.`);
    }
}

async function handleSaveSiteSettings(e) {
    e.preventDefault();
    const payload = {
        site_name: document.getElementById('setting-site-name').value.trim(),
        hero_title: document.getElementById('setting-hero-title').value.trim(),
        hero_subtitle: document.getElementById('setting-hero-subtitle').value.trim(),
        banner_image: document.getElementById('setting-banner-url').value.trim()
    };

    try {
        const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showAlert('Lưu cài đặt giao diện thành công!', 'success');
            if (payload.banner_image) {
                document.getElementById('preview-banner-img').src = payload.banner_image;
                const bg = document.getElementById('site-bg-img');
                if (bg) bg.src = payload.banner_image;
            }
        } else {
            alert(result.error || 'Lỗi khi lưu cài đặt.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

async function handleUploadBanner(e) {
    e.preventDefault();
    const fileInput = document.getElementById('banner-file-input');
    const submitBtn = document.getElementById('btn-upload-banner');

    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Vui lòng chọn file hình ảnh từ máy.');
        return;
    }

    const formData = new FormData();
    formData.append('banner_file', fileInput.files[0]);

    submitBtn.disabled = true;
    submitBtn.innerText = 'Đang tải lên...';

    try {
        const res = await fetch('/api/admin/settings/upload-banner', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showAlert('Tải lên ảnh nền trang chủ thành công!', 'success');
            document.getElementById('setting-banner-url').value = result.banner_url;
            document.getElementById('preview-banner-img').src = result.banner_url;
            const bg = document.getElementById('site-bg-img');
            if (bg) bg.src = result.banner_url;
            document.getElementById('banner-upload-form').reset();
        } else {
            alert(result.error || 'Lỗi khi upload ảnh nền.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ khi tải ảnh lên.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Tải Lên Ảnh Nền Máy Tính';
    }
}

// ==========================================
// 3. QUẢN LÝ AVATAR CHIẾN BINH (100% FREEDOM)
// ==========================================

async function loadAdminAvatars() {
    const grid = document.getElementById('admin-avatar-grid');
    try {
        const res = await fetch('/api/admin/avatars', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await res.json();
        if (res.ok && result.success) {
            allAvatars = result.data;
            renderAdminAvatars(allAvatars);
        } else {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--game-danger);">${result.error || 'Lỗi khi tải avatar.'}</div>`;
        }
    } catch (err) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--game-danger);">Lỗi kết nối máy chủ.</div>';
    }
}

function renderAdminAvatars(avatars) {
    const grid = document.getElementById('admin-avatar-grid');
    if (!grid) return;

    if (avatars.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--game-text-muted); padding: 24px;">Chưa có avatar nào trong hệ thống. Hãy tải lên avatar đầu tiên!</div>';
        return;
    }

    grid.innerHTML = avatars.map(av => `
        <div class="avatar-admin-card">
            <img src="${av.image_url}" class="avatar-admin-img" alt="${escapeHtml(av.name)}" onerror="this.src='/images/A.jpg'">
            <strong style="font-size: 0.9rem; color: var(--game-text-primary); margin-bottom: 4px;">${escapeHtml(av.name)}</strong>
            <button class="btn btn-danger btn-sm" onclick="handleDeleteAvatar(${av.id})" style="width: 100%; margin-top: 6px;">
                Xóa Avatar
            </button>
        </div>
    `).join('');
}

async function handleUploadAvatar(e) {
    e.preventDefault();
    const nameInput = document.getElementById('avatar-name-input');
    const fileInput = document.getElementById('avatar-file-input');
    const submitBtn = document.getElementById('btn-upload-avatar');

    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Vui lòng chọn file hình ảnh từ máy tính.');
        return;
    }

    const formData = new FormData();
    formData.append('avatar_name', nameInput.value.trim());
    formData.append('avatar_file', fileInput.files[0]);

    submitBtn.disabled = true;
    submitBtn.innerText = 'Đang tải lên...';

    try {
        const res = await fetch('/api/admin/avatars/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showAlert('Tải lên avatar mới thành công!', 'success');
            document.getElementById('avatar-upload-form').reset();
            loadAdminAvatars();
        } else {
            alert(result.error || 'Lỗi khi tải lên avatar.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Tải Lên Avatar';
    }
}

async function handleDeleteAvatar(id) {
    if (!confirm(`Bạn có chắc chắn muốn xóa avatar này khỏi hệ thống?`)) return;

    try {
        const res = await fetch(`/api/admin/avatars/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showAlert('Đã xóa avatar thành công!', 'success');
            loadAdminAvatars();
        } else {
            alert(result.error || 'Lỗi khi xóa avatar.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

// ==========================================
// 4. QUẢN LÝ CÂU HỎI (QUESTIONS CRUD)
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
        }
    } catch (error) {
        console.error('Lỗi load câu hỏi:', error);
    }
}

function renderQuestionsTable(questions) {
    if (questions.length === 0) {
        questionsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--game-text-muted);">Chưa có câu hỏi nào.</td></tr>';
        updateSelectedQuestionsCount();
        return;
    }

    questionsTableBody.innerHTML = questions.map(q => `
        <tr>
            <td style="text-align: center;">
                <input type="checkbox" class="q-checkbox" value="${q.id}" onchange="updateSelectedQuestionsCount()">
            </td>
            <td style="font-weight: 700; color: var(--game-primary);">#${q.id}</td>
            <td>
                <div style="font-weight: 600; color: var(--game-text-primary); margin-bottom: 4px;">
                    ${escapeHtml(q.question_text)}
                </div>
                <div style="font-size: 0.8rem; color: var(--game-text-muted); display: flex; gap: 8px; flex-wrap: wrap;">
                    <span>A: ${escapeHtml(q.option_a)}</span>
                    <span>B: ${escapeHtml(q.option_b)}</span>
                    <span>C: ${escapeHtml(q.option_c)}</span>
                    <span>D: ${escapeHtml(q.option_d)}</span>
                </div>
            </td>
            <td>
                <strong style="color: var(--game-primary); font-size: 0.88rem;">${escapeHtml(q.quiz_title || 'One Piece Grand Test')}</strong>
                <div style="font-size: 0.78rem; color: var(--game-text-secondary); margin-top: 2px;">
                    Arc: <strong>${escapeHtml(q.arc || 'Chung')}</strong> • <strong>${escapeHtml(q.chapter || 'Chung')}</strong>
                </div>
            </td>
            <td style="text-align: center; font-weight: 800; color: #10b981;">${q.correct_answer}</td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 6px; justify-content: center;">
                    <button class="btn btn-secondary btn-sm" onclick="openEditModal(${q.id})">Sửa</button>
                    <button class="btn btn-danger btn-sm" onclick="handleDeleteQuestion(${q.id})">Xóa</button>
                </div>
            </td>
        </tr>
    `).join('');

    updateSelectedQuestionsCount();
}

function toggleSelectAllQuestions(checked) {
    document.querySelectorAll('.q-checkbox').forEach(cb => {
        cb.checked = checked;
    });
    updateSelectedQuestionsCount();
}

function updateSelectedQuestionsCount() {
    const checkedBoxes = document.querySelectorAll('.q-checkbox:checked');
    const count = checkedBoxes.length;
    const btnBulk = document.getElementById('btn-bulk-delete');
    const spanCount = document.getElementById('selected-q-count');
    const thSelectAll = document.getElementById('th-select-all');

    if (spanCount) spanCount.innerText = count;
    if (btnBulk) {
        btnBulk.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    const allBoxes = document.querySelectorAll('.q-checkbox');
    if (thSelectAll && allBoxes.length > 0) {
        thSelectAll.checked = (count === allBoxes.length);
    }
}

async function handleBulkDeleteQuestions() {
    const checkedBoxes = document.querySelectorAll('.q-checkbox:checked');
    const ids = Array.from(checkedBoxes).map(cb => parseInt(cb.value, 10));

    if (ids.length === 0) {
        alert('Vui lòng chọn ít nhất 1 câu hỏi để xóa.');
        return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa ${ids.length} câu hỏi đã chọn? Thao tác này không thể hoàn tác!`)) return;

    try {
        const res = await fetch('/api/admin/questions/bulk-delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ question_ids: ids })
        });
        const result = await res.json();
        if (res.ok && result.success) {
            showAlert(result.message || `Đã xóa thành công ${ids.length} câu hỏi!`, 'success');
            loadQuestions();
            loadAdminQuizzes();
        } else {
            alert(result.error || 'Lỗi khi xóa hàng loạt câu hỏi.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

async function handleDeleteAllQuizQuestions() {
    const quizFilterId = filterQuizSelect ? filterQuizSelect.value : '';
    const selectedQuizName = filterQuizSelect && filterQuizSelect.options[filterQuizSelect.selectedIndex] ? filterQuizSelect.options[filterQuizSelect.selectedIndex].text : '';

    if (!quizFilterId) {
        alert('Vui lòng chọn một bộ đề cụ thể trong dropdown lọc bộ đề trước khi thực hiện xóa toàn bộ câu hỏi của bộ đề đó.');
        return;
    }

    if (!confirm(`CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn XÓA TẤT CẢ câu hỏi trong bộ đề "${selectedQuizName}" không?`)) return;

    try {
        const res = await fetch(`/api/admin/quizzes/${quizFilterId}/questions`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await res.json();
        if (res.ok && result.success) {
            showAlert(result.message || 'Đã xóa toàn bộ câu hỏi trong bộ đề thành công!', 'success');
            loadQuestions();
            loadAdminQuizzes();
        } else {
            alert(result.error || 'Lỗi khi xóa câu hỏi bộ đề.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
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
            q.option_a.toLowerCase().includes(term) ||
            q.option_b.toLowerCase().includes(term) ||
            q.option_c.toLowerCase().includes(term) ||
            q.option_d.toLowerCase().includes(term) ||
            (q.arc && q.arc.toLowerCase().includes(term)) ||
            (q.chapter && q.chapter.toLowerCase().includes(term))
        );
    }
    renderQuestionsTable(filtered);
}

function openAddModal() {
    modalTitle.innerText = 'Thêm Câu Hỏi Mới';
    document.getElementById('question-form').reset();
    document.getElementById('form-question-id').value = '';
    if (document.getElementById('form-arc')) document.getElementById('form-arc').value = '';
    if (document.getElementById('form-chapter')) document.getElementById('form-chapter').value = '';
    populateQuizDropdowns();
    questionModal.classList.add('open');
}

function openEditModal(id) {
    const q = allQuestions.find(item => item.id === id);
    if (!q) return;

    modalTitle.innerText = `Chỉnh Sửa Câu Hỏi #${id}`;
    populateQuizDropdowns();

    document.getElementById('form-question-id').value = q.id;
    if (formQuizId) formQuizId.value = q.quiz_id || '1';
    document.getElementById('form-question-text').value = q.question_text;
    document.getElementById('form-opt-a').value = q.option_a;
    document.getElementById('form-opt-b').value = q.option_b;
    document.getElementById('form-opt-c').value = q.option_c;
    document.getElementById('form-opt-d').value = q.option_d;
    document.getElementById('form-correct-answer').value = q.correct_answer;
    document.getElementById('form-difficulty').value = q.difficulty || '1';
    if (document.getElementById('form-arc')) document.getElementById('form-arc').value = q.arc || '';
    if (document.getElementById('form-chapter')) document.getElementById('form-chapter').value = q.chapter || '';
    document.getElementById('form-explanation').value = q.explanation || '';

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
        difficulty: parseInt(document.getElementById('form-difficulty').value, 10) || 1,
        arc: (document.getElementById('form-arc') ? document.getElementById('form-arc').value.trim() : '') || 'Chung',
        chapter: (document.getElementById('form-chapter') ? document.getElementById('form-chapter').value.trim() : '') || 'Chung',
        explanation: document.getElementById('form-explanation').value.trim()
    };

    try {
        const url = isEdit ? `/api/admin/questions/${id}` : '/api/admin/questions';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(questionData)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showAlert(result.message || 'Lưu câu hỏi thành công!', 'success');
            closeModal();
            loadQuestions();
            loadAdminQuizzes();
        } else {
            alert(result.error || 'Lỗi khi lưu câu hỏi.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

async function handleDeleteQuestion(id) {
    if (!confirm(`Bạn có chắc chắn muốn xóa câu hỏi #${id}?`)) return;

    try {
        const res = await fetch(`/api/admin/questions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showAlert('Đã xóa câu hỏi thành công!', 'success');
            loadQuestions();
            loadAdminQuizzes();
        } else {
            alert(result.error || 'Lỗi khi xóa câu hỏi.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

function openBulkModal() {
    bulkInput.value = '';
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
    try {
        let json = JSON.parse(rawInput);
        if (!Array.isArray(json) && json && Array.isArray(json.questions)) json = json.questions;
        if (Array.isArray(json)) {
            parsedQuestions = json.map(q => ({
                question_text: q.question_text || q.question || '',
                option_a: q.option_a || (q.options ? q.options.A : '') || '',
                option_b: q.option_b || (q.options ? q.options.B : '') || '',
                option_c: q.option_c || (q.options ? q.options.C : '') || '',
                option_d: q.option_d || (q.options ? q.options.D : '') || '',
                correct_answer: (q.correct_answer || q.answer || 'A').toUpperCase().trim(),
                difficulty: parseInt(q.difficulty, 10) || 1,
                arc: q.arc || 'Chung',
                chapter: q.chapter || 'Chung',
                explanation: q.explanation || ''
            })).filter(q => q.question_text && q.option_a && q.option_b && q.option_c && q.option_d);
        }
    } catch (e) {
        parsedQuestions = parsePlainTextQuestions(rawInput);
    }

    if (parsedQuestions.length === 0) {
        alert('Không tìm thấy câu hỏi hợp lệ.');
        return;
    }

    try {
        const res = await fetch('/api/admin/questions/bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ quiz_id: targetQuizId, questions: parsedQuestions })
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showAlert(result.message, 'success');
            closeBulkModal();
            loadQuestions();
            loadAdminQuizzes();
        } else {
            alert(result.error || 'Lỗi khi nhập hàng loạt.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

function parsePlainTextQuestions(text) {
    const list = [];
    const blocks = text.split(/\n\s*---\s*\n|\n\s*={3,}\s*\n/);
    for (const block of blocks) {
        if (!block.trim()) continue;
        const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let qText = '', optA = '', optB = '', optC = '', optD = '', correctAns = '', exp = '', arc = 'Chung', chap = 'Chung';
        for (const line of lines) {
            if (/^(Câu\s*\d*[:.]?|Q\s*\d*[:.]?)/i.test(line)) qText = line.replace(/^(Câu\s*\d*[:.]?|Q\s*\d*[:.]?)\s*/i, '').trim();
            else if (/^[A][:.)]\s*/i.test(line)) optA = line.replace(/^[A][:.)]\s*/i, '').trim();
            else if (/^[B][:.)]\s*/i.test(line)) optB = line.replace(/^[B][:.)]\s*/i, '').trim();
            else if (/^[C][:.)]\s*/i.test(line)) optC = line.replace(/^[C][:.)]\s*/i, '').trim();
            else if (/^[D][:.)]\s*/i.test(line)) optD = line.replace(/^[D][:.)]\s*/i, '').trim();
            else if (/^(Đáp án|Answer|Key)[:.]?\s*/i.test(line)) {
                const match = line.match(/[A-D]/i);
                if (match) correctAns = match[0].toUpperCase();
            } else if (/^(Arc|Cốt truyện)[:.]?\s*/i.test(line)) arc = line.replace(/^(Arc|Cốt truyện)[:.]?\s*/i, '').trim();
            else if (/^(Chapter|Chương|Tập)[:.]?\s*/i.test(line)) chap = line.replace(/^(Chapter|Chương|Tập)[:.]?\s*/i, '').trim();
            else if (/^(Giải thích|Explanation)[:.]?\s*/i.test(line)) exp = line.replace(/^(Giải thích|Explanation)[:.]?\s*/i, '').trim();
            else if (!qText) qText = line;
        }
        if (qText && optA && optB && optC && optD && correctAns) {
            list.push({ question_text: qText, option_a: optA, option_b: optB, option_c: optC, option_d: optD, correct_answer: correctAns, difficulty: 1, arc, chapter: chap, explanation: exp });
        }
    }
    return list;
}

// ==========================================
// 5. QUẢN LÝ BỘ ĐỀ (QUIZZES) & CHỦ ĐỀ (TOPICS)
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
        quizzesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--game-text-muted);">Chưa có bộ đề nào.</td></tr>';
        return;
    }

    quizzesTableBody.innerHTML = quizzes.map(q => `
        <tr>
            <td style="font-weight: 700; color: var(--game-primary);">#${q.id}</td>
            <td><strong style="color: var(--game-text-primary); font-size: 0.95rem;">${escapeHtml(q.title)}</strong></td>
            <td><span class="quiz-card-topic">${escapeHtml(q.topic_icon || '⚓')} ${escapeHtml(q.topic_name || 'Chung')}</span></td>
            <td style="text-align: center; font-weight: 800; color: var(--game-primary);">${q.question_count || 0} câu</td>
            <td style="text-align: center;">${q.time_per_question || 15}s</td>
            <td style="text-align: center;"><span style="font-size: 0.78rem; font-weight: 700; color: #10b981;">${q.status}</span></td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 6px; justify-content: center;">
                    <button class="btn btn-secondary btn-sm" onclick="openEditQuizModal(${q.id})">Sửa</button>
                    <button class="btn btn-danger btn-sm" onclick="handleDeleteQuiz(${q.id})">Xóa</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function populateQuizDropdowns() {
    if (filterQuizSelect) {
        const cur = filterQuizSelect.value;
        filterQuizSelect.innerHTML = '<option value="">-- Tất cả bộ đề --</option>' + allQuizzes.map(q => `<option value="${q.id}">${q.topic_icon || '⚓'} ${q.title} (${q.question_count || 0} câu)</option>`).join('');
        filterQuizSelect.value = cur;
    }
    if (formQuizId) formQuizId.innerHTML = allQuizzes.map(q => `<option value="${q.id}">${q.topic_icon || '⚓'} ${q.title}</option>`).join('');
    if (bulkQuizId) bulkQuizId.innerHTML = allQuizzes.map(q => `<option value="${q.id}">${q.topic_icon || '⚓'} ${q.title}</option>`).join('');
}

function openAddQuizModal() {
    quizModalTitle.innerText = 'Thêm Bộ Đề Mới';
    document.getElementById('quiz-form').reset();
    document.getElementById('form-quiz-edit-id').value = '';
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

    const payload = {
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
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showAlert(result.message || 'Lưu bộ đề thành công!', 'success');
            closeQuizModal();
            loadAdminQuizzes();
        } else {
            alert(result.error || 'Lỗi khi lưu bộ đề.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

async function handleDeleteQuiz(id) {
    if (!confirm(`Bạn có chắc chắn muốn xóa bộ đề #${id}?`)) return;
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
            alert(result.error || 'Lỗi khi xóa.');
        }
    } catch (err) {
        alert('Lỗi máy chủ.');
    }
}

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
        topicsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--game-text-muted);">Chưa có chủ đề nào.</td></tr>';
        return;
    }
    topicsTableBody.innerHTML = topics.map(t => `
        <tr>
            <td style="font-weight: 700; color: var(--game-primary);">#${t.id}</td>
            <td><strong>${escapeHtml(t.icon || '⚓')} ${escapeHtml(t.name)}</strong></td>
            <td style="color: var(--game-text-muted); font-size: 0.85rem;">${escapeHtml(t.description || '')}</td>
            <td style="text-align: center; font-weight: 700; color: var(--game-primary);">${t.total_quizzes || 0} bộ đề</td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 6px; justify-content: center;">
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

    const payload = {
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
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showAlert(result.message || 'Lưu chủ đề thành công!', 'success');
            closeTopicModal();
            loadAdminTopics();
        } else {
            alert(result.error || 'Lỗi khi lưu chủ đề.');
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
            alert(result.error || 'Lỗi khi xóa.');
        }
    } catch (err) {
        alert('Lỗi kết nối.');
    }
}

// ==========================================
// 6. QUẢN LÝ KHO NHẠC NỀN YOUTUBE & THỂ LOẠI NHẠC
// ==========================================

let allMusicCategories = [];

function switchMusicSubTab(subTab) {
    document.querySelectorAll('#section-music .admin-sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`musictab-btn-${subTab}`);
    if (targetBtn) targetBtn.classList.add('active');

    const tracksEl = document.getElementById('subcontent-music-tracks');
    const catsEl = document.getElementById('subcontent-music-categories');

    if (tracksEl) tracksEl.style.display = (subTab === 'tracks') ? 'block' : 'none';
    if (catsEl) catsEl.style.display = (subTab === 'categories') ? 'block' : 'none';

    if (subTab === 'tracks') loadAdminMusic();
    else if (subTab === 'categories') loadAdminMusicCategories();
}

async function loadAdminMusic() {
    const tbody = document.getElementById('music-table-body');
    try {
        const [resTracks, resCats] = await Promise.all([
            fetch('/api/admin/music', { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch('/api/admin/music-categories', { headers: { 'Authorization': `Bearer ${authToken}` } })
        ]);

        const dataTracks = await resTracks.json();
        const dataCats = await resCats.json();

        if (resCats.ok && dataCats.success) {
            allMusicCategories = dataCats.data;
            const catCountSpan = document.getElementById('music-cats-count');
            if (catCountSpan) catCountSpan.innerText = allMusicCategories.length;
            populateMusicCategoryDropdown();
        }

        if (resTracks.ok && dataTracks.success) {
            allMusic = dataTracks.data;
            const trackCountSpan = document.getElementById('music-tracks-count');
            if (trackCountSpan) trackCountSpan.innerText = allMusic.length;
            renderMusicTable(allMusic);
        }
    } catch (err) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--game-danger); padding: 20px;">Lỗi kết nối máy chủ.</td></tr>';
    }
}

async function loadAdminMusicCategories() {
    const tbody = document.getElementById('music-categories-table-body');
    try {
        const res = await fetch('/api/admin/music-categories', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await res.json();
        if (res.ok && result.success) {
            allMusicCategories = result.data;
            const catCountSpan = document.getElementById('music-cats-count');
            if (catCountSpan) catCountSpan.innerText = allMusicCategories.length;
            renderMusicCategoriesTable(allMusicCategories);
            populateMusicCategoryDropdown();
        } else {
            if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--game-danger); padding: 20px;">${result.error || 'Lỗi tải thể loại nhạc.'}</td></tr>`;
        }
    } catch (err) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--game-danger); padding: 20px;">Lỗi kết nối máy chủ.</td></tr>';
    }
}

function renderMusicCategoriesTable(cats) {
    const tbody = document.getElementById('music-categories-table-body');
    if (!tbody) return;

    if (cats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--game-text-muted);">Chưa có thể loại nhạc nào. Hãy thêm thể loại mới bên trên!</td></tr>';
        return;
    }

    tbody.innerHTML = cats.map(c => `
        <tr>
            <td style="font-weight: 700; color: var(--game-primary);">#${c.id}</td>
            <td><strong style="color: var(--game-text-primary); font-size: 0.95rem;">${escapeHtml(c.name)}</strong></td>
            <td style="text-align: center; font-weight: 800; color: var(--game-primary);">${c.track_count || 0} bài</td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 6px; justify-content: center;">
                    <button class="btn btn-secondary btn-sm" onclick="handleEditMusicCategory(${c.id}, '${escapeHtml(c.name).replace(/'/g, "\\'")}')">Sửa Tên</button>
                    <button class="btn btn-danger btn-sm" onclick="handleDeleteMusicCategory(${c.id}, '${escapeHtml(c.name).replace(/'/g, "\\'")}')">Xóa</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function populateMusicCategoryDropdown() {
    const selectEl = document.getElementById('form-music-category');
    if (!selectEl) return;

    if (allMusicCategories.length === 0) {
        selectEl.innerHTML = `
            <option value="Epic">Epic</option>
            <option value="Anime / One Piece">Anime / One Piece</option>
            <option value="Gaming">Gaming</option>
            <option value="Lo-fi">Lo-fi</option>
            <option value="Chill">Chill</option>
        `;
        return;
    }

    selectEl.innerHTML = allMusicCategories.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
}

async function handleAddMusicCategory(e) {
    e.preventDefault();
    const input = document.getElementById('input-new-music-cat');
    const name = input.value.trim();
    if (!name) return;

    try {
        const res = await fetch('/api/admin/music-categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name })
        });
        const result = await res.json();
        if (res.ok && result.success) {
            showAlert(`Thêm thể loại "${name}" thành công!`, 'success');
            input.value = '';
            loadAdminMusicCategories();
        } else {
            alert(result.error || 'Lỗi khi thêm thể loại nhạc.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

async function handleEditMusicCategory(id, currentName) {
    const newName = prompt('Nhập tên mới cho thể loại nhạc:', currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;

    try {
        const res = await fetch(`/api/admin/music-categories/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name: newName.trim() })
        });
        const result = await res.json();
        if (res.ok && result.success) {
            showAlert('Cập nhật tên thể loại nhạc thành công!', 'success');
            loadAdminMusicCategories();
        } else {
            alert(result.error || 'Lỗi khi cập nhật thể loại nhạc.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

async function handleDeleteMusicCategory(id, name) {
    if (!confirm(`Bạn có chắc chắn muốn xóa thể loại nhạc "${name}"? Các bài hát thuộc thể loại này sẽ được chuyển về "Chung".`)) return;

    try {
        const res = await fetch(`/api/admin/music-categories/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await res.json();
        if (res.ok && result.success) {
            showAlert('Đã xóa thể loại nhạc thành công!', 'success');
            loadAdminMusicCategories();
            loadAdminMusic();
        } else {
            alert(result.error || 'Lỗi khi xóa thể loại nhạc.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

function renderMusicTable(tracks) {
    const tbody = document.getElementById('music-table-body');
    if (!tbody) return;

    if (tracks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--game-text-muted);">Chưa có bài hát nào.</td></tr>';
        return;
    }

    tbody.innerHTML = tracks.map(t => `
        <tr>
            <td style="font-weight: 700; color: var(--game-primary);">#${t.id}</td>
            <td><img src="${t.thumbnail_url || `https://img.youtube.com/vi/${t.youtube_video_id}/hqdefault.jpg`}" style="width: 60px; height: 36px; object-fit: cover; border-radius: 4px;" onerror="this.src='/favicon.svg'"></td>
            <td><strong style="color: var(--game-text-primary); font-size: 0.9rem;">${escapeHtml(t.title)}</strong></td>
            <td><span class="quiz-card-topic">${escapeHtml(t.category || 'Gaming')}</span></td>
            <td><a href="${escapeHtml(t.youtube_url)}" target="_blank" style="color: var(--game-primary); font-size: 0.82rem; text-decoration: none;">Link YouTube</a></td>
            <td style="text-align: center;"><span style="color: #10b981; font-weight: 700; font-size: 0.78rem;">${t.status}</span></td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 6px; justify-content: center;">
                    <button class="btn btn-secondary btn-sm" onclick="openEditMusicModal(${t.id})">Sửa</button>
                    <button class="btn btn-danger btn-sm" onclick="handleDeleteMusic(${t.id})">Xóa</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openAddMusicModal() {
    document.getElementById('music-modal-title').innerText = 'Thêm Bài Hát Mới';
    document.getElementById('music-form').reset();
    document.getElementById('form-music-edit-id').value = '';
    populateMusicCategoryDropdown();
    document.getElementById('music-modal').classList.add('open');
}

function openEditMusicModal(id) {
    const track = allMusic.find(m => m.id === id);
    if (!track) return;
    document.getElementById('music-modal-title').innerText = `Chỉnh Sửa Bài Hát #${id}`;
    populateMusicCategoryDropdown();
    document.getElementById('form-music-edit-id').value = track.id;
    document.getElementById('form-music-title').value = track.title;
    document.getElementById('form-music-url').value = track.youtube_url;
    document.getElementById('form-music-category').value = track.category || (allMusicCategories[0] ? allMusicCategories[0].name : 'Gaming');
    document.getElementById('form-music-status').value = track.status || 'PUBLISHED';
    document.getElementById('music-modal').classList.add('open');
}

function closeMusicModal() {
    document.getElementById('music-modal').classList.remove('open');
}

async function handleSaveMusic(e) {
    e.preventDefault();
    const id = document.getElementById('form-music-edit-id').value;
    const isEdit = Boolean(id);

    const payload = {
        title: document.getElementById('form-music-title').value.trim(),
        youtube_url: document.getElementById('form-music-url').value.trim(),
        category: document.getElementById('form-music-category').value,
        status: document.getElementById('form-music-status').value
    };

    try {
        const url = isEdit ? `/api/admin/music/${id}` : '/api/admin/music';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showAlert(result.message || 'Lưu bài hát thành công!', 'success');
            closeMusicModal();
            loadAdminMusic();
        } else {
            alert(result.error || 'Lỗi khi lưu.');
        }
    } catch (err) {
        alert('Lỗi kết nối.');
    }
}

async function handleDeleteMusic(id) {
    if (!confirm(`Bạn có chắc chắn muốn xóa bài hát #${id}?`)) return;
    try {
        const res = await fetch(`/api/admin/music/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await res.json();
        if (res.ok && result.success) {
            showAlert('Đã xóa bài hát thành công!', 'success');
            loadAdminMusic();
        } else {
            alert(result.error || 'Lỗi khi xóa.');
        }
    } catch (err) {
        alert('Lỗi máy chủ.');
    }
}

// ==========================================
// 7. THỐNG KÊ & LỊCH SỬ TRẬN ĐẤU
// ==========================================

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

async function loadAdminGames() {
    try {
        const res = await fetch('/api/admin/games', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (res.ok && data.success && data.data.length > 0) {
            gamesTableBody.innerHTML = data.data.map(g => `
                <tr>
                    <td style="font-weight: 700; color: var(--game-primary);">#${g.id}</td>
                    <td><strong style="color: var(--game-text-primary);">${escapeHtml(g.quiz_title || 'One Piece Grand Test')}</strong></td>
                    <td><span style="font-size: 0.78rem; font-weight: 700; color: var(--game-primary);">${g.mode}</span></td>
                    <td style="text-align: center; font-weight: 700;">${g.player_count || 1}</td>
                    <td style="font-weight: 700; color: #ffd700;">${g.winner ? `👑 ${escapeHtml(g.winner)}` : 'Chưa có'}</td>
                    <td style="font-size: 0.82rem; color: var(--game-text-muted);">${new Date(g.started_at).toLocaleString('vi-VN')}</td>
                </tr>
            `).join('');
        } else {
            gamesTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--game-text-muted); padding: 24px;">Chưa có trận đấu nào.</td></tr>';
        }
    } catch (e) {
        gamesTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--game-danger);">Lỗi tải lịch sử trận đấu.</td></tr>';
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

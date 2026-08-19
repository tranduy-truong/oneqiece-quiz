/**
 * Global Light/Dark Theme Controller (Facebook Light vs Deep Dark)
 */

(function () {
    const savedTheme = localStorage.getItem('app_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('app_theme', next);
    updateThemeToggleButtons();
}

function updateThemeToggleButtons() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        if (current === 'dark') {
            btn.innerHTML = '☀️ <span class="theme-btn-text">Sáng</span>';
            btn.setAttribute('title', 'Chuyển sang giao diện Sáng (Facebook Style)');
        } else {
            btn.innerHTML = '🌙 <span class="theme-btn-text">Tối</span>';
            btn.setAttribute('title', 'Chuyển sang giao diện Tối (Gaming Dark)');
        }
    });
}

document.addEventListener('DOMContentLoaded', updateThemeToggleButtons);

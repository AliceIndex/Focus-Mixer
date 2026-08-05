/**
 * Focus Mixer - Theme Manager
 * 全ページ共通：ダーク・ライトモードの管理
 * Copyright (c) 2026 AliceIndex. All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // 1. 保存されたテーマを復元（DOMContentLoadedより前でも実行可能）
    const savedTheme = localStorage.getItem('focusMixerTheme');
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        if (themeToggleBtn) themeToggleBtn.textContent = '🌙 Dark';
    }

    // 2. ボタンが存在する場合のみイベントリスナーを登録
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            body.classList.toggle('light-mode');
            const isLight = body.classList.contains('light-mode');
            
            // 状態の保存
            localStorage.setItem('focusMixerTheme', isLight ? 'light' : 'dark');
            
            // ボタンのラベル更新
            themeToggleBtn.textContent = isLight ? '🌙 Dark' : '☀️ Light';
        });
    }
}

function initLanguage() {
    const langBtn = document.querySelector('.lang-btn');
    if (!langBtn) return;

    const savedLang = localStorage.getItem('focusMixerLanguage');
    const currentPath = window.location.pathname;

    if (savedLang === 'ja' && !currentPath.startsWith('/jp')) {
        const targetPath = currentPath === '/' ? '/jp/' : '/jp' + currentPath;
        window.location.replace(targetPath + window.location.search + window.location.hash);
        return;
    }

    if (savedLang === 'en' && currentPath.startsWith('/jp')) {
        const targetPath = currentPath === '/jp/' ? '/' : currentPath.replace(/^\/jp/, '') || '/';
        window.location.replace(targetPath + window.location.search + window.location.hash);
        return;
    }

    langBtn.addEventListener('click', () => {
        const href = langBtn.getAttribute('href') || '';
        const selectedLang = href.startsWith('/jp') ? 'ja' : 'en';
        localStorage.setItem('focusMixerLanguage', selectedLang);
    });
}

function runInitializers() {
    initTheme();
    initLanguage();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInitializers);
} else {
    runInitializers();
}
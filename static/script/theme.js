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

// 実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}
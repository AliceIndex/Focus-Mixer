/**
 * Focus Mixer - i18n
 * Copyright (c) 2026 AliceIndex. All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

export const LANG = document.documentElement.lang === 'ja' ? 'ja' : 'en';

const i18n = {
    ja: {
        cookieAccepted: 'クッキーの使用に同意しました 🍪',
        cookieDeclined: 'クッキーの使用を拒否しました 🛡️',
        muteAll: 'すべての音をミュートしました 🔇',
        presetSaved: '設定を保存しました 💾',
        presetNotFound: '保存された設定がありません ⚠️',
        presetLoaded: '設定を読み込みました 🎶',
        timerRestorePrompt: '保存されたタイマー設定を読み込みますか？ ⏱️',
        timerRestored: 'タイマー設定を復元しました ✅',
        breakStart: 'お疲れ様です！休憩しましょう。',
        focusStart: 'さあ！集中しましょう。',
        yesBtn: 'はい',
        noBtn: 'いいえ',
    },
    en: {
        cookieAccepted: 'Cookie consent accepted 🍪',
        cookieDeclined: 'Cookie usage declined 🛡️',
        muteAll: 'All sounds muted 🔇',
        presetSaved: 'Preset saved 💾',
        presetNotFound: 'No saved preset found ⚠️',
        presetLoaded: 'Preset loaded 🎶',
        timerRestorePrompt: 'Restore saved timer settings? ⏱️',
        timerRestored: 'Timer settings restored ✅',
        breakStart: 'Good work! Time for a break.',
        focusStart: "Let's focus!",
        yesBtn: 'Yes',
        noBtn: 'No',
    }
};

export const t = i18n[LANG] || i18n.ja;

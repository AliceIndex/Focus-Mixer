/**
 * Focus Mixer - Main Entry Point
 * 各モジュールを統合し、HTMLのDOMイベントとバインドする
 * Copyright (c) 2026 AliceIndex. All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import { LANG, t } from './i18n.js';
import {
    addDebouncedClick,
    showToast,
    showConfirmToast,
    setActiveSessionChecker,
    requestWakeLock
} from './uiController.js';
import {
    SOUND_LIST,
    initAudio,
    handleVolumeInput,
    applyVolumeFromPreset,
    muteAll,
    isAudioPlaying,
    setMediaSessionHandlers,
    resumeContext
} from './audioController.js';
import {
    initTimer,
    start as startTimer,
    pause as pauseTimer,
    reset as resetTimer,
    setDurations,
    getDurations,
    isRunning as isTimerRunning,
    getIsFocusMode
} from './timerController.js';

const CURRENT_VERSION = '505075a';

document.addEventListener('DOMContentLoaded', () => {

    setActiveSessionChecker(() => isTimerRunning() || isAudioPlaying());

    // ==========================================
    // 0. クッキー同意管理
    // ==========================================
    const cookieBanner = document.getElementById('cookie-banner');
    const btnAcceptCookie = document.getElementById('btn-accept-cookie');
    const btnDeclineCookie = document.getElementById('btn-decline-cookie');

    if (!localStorage.getItem('cookie-consent')) {
        setTimeout(() => cookieBanner.classList.remove('hidden'), 1000);
    }

    addDebouncedClick(btnAcceptCookie, () => {
        localStorage.setItem('cookie-consent', 'accepted');
        cookieBanner.classList.add('hidden');
        showToast(t.cookieAccepted);
    });

    addDebouncedClick(btnDeclineCookie, () => {
        localStorage.setItem('cookie-consent', 'declined');
        cookieBanner.classList.add('hidden');
        showToast(t.cookieDeclined);
    });

    // ==========================================
    // 1. ミキサーUI動的生成
    // ==========================================
    function initMixerUI() {
        SOUND_LIST.forEach(sound => {
            const grid = document.getElementById(`grid-${sound.category}`);
            if (!grid) return;

            const item = document.createElement('div');
            item.className = 'sound-item';
            item.innerHTML = `
                <div class="sound-icon">${sound.icon}</div>
                <label>${sound.label[LANG] || sound.label.ja}</label>
                <input type="range" class="volume-slider" data-sound="${sound.id}" min="0" max="100" value="0">
            `;
            grid.appendChild(item);

            const sliderInput = item.querySelector('input');
            sliderInput.addEventListener('input', (e) => handleVolumeInput(e, sound.id));
        });
    }

    // ==========================================
    // 2. カルーセル（スライド）制御
    // ==========================================
    let currentPage = 0;
    const slider = document.getElementById('mixer-slider');
    const dots = document.querySelectorAll('.dot');

    function updateSlider() {
        const offset = currentPage * -33.3333;
        slider.style.transform = `translateX(${offset}%)`;
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentPage);
        });
    }

    addDebouncedClick(document.getElementById('next-page'), () => {
        if (currentPage < 2) { currentPage++; updateSlider(); }
    }, 300);

    addDebouncedClick(document.getElementById('prev-page'), () => {
        if (currentPage > 0) { currentPage--; updateSlider(); }
    }, 300);

    // ==========================================
    // 3. ミュート全停止
    // ==========================================
    addDebouncedClick(document.getElementById('btn-mute-all'), () => {
        muteAll();
        showToast(t.muteAll);
    });

    // ==========================================
    // 4. タイマー操作
    // ==========================================
    initTimer(CURRENT_VERSION);

    addDebouncedClick(document.getElementById('btn-start'), () => startTimer());
    addDebouncedClick(document.getElementById('btn-pause'), () => pauseTimer());
    addDebouncedClick(document.getElementById('btn-reset'), () => resetTimer());

    // ==========================================
    // 5. タイマー設定モーダル
    // ==========================================
    const settingsModal = document.getElementById('settings-modal');
    const focusMinInput = document.getElementById('focus-min-input');
    const focusSecInput = document.getElementById('focus-sec-input');
    const breakMinInput = document.getElementById('break-min-input');
    const breakSecInput = document.getElementById('break-sec-input');

    addDebouncedClick(document.getElementById('settings-toggle'), () => {
        const { focus, break: brk } = getDurations();
        focusMinInput.value = Math.floor(focus / 60);
        focusSecInput.value = focus % 60;
        breakMinInput.value = Math.floor(brk / 60);
        breakSecInput.value = brk % 60;
        settingsModal.classList.remove('hidden');
    });

    addDebouncedClick(document.getElementById('btn-apply-settings'), () => {
        const fMin = parseInt(focusMinInput.value) || 0;
        const fSec = parseInt(focusSecInput.value) || 0;
        const bMin = parseInt(breakMinInput.value) || 0;
        const bSec = parseInt(breakSecInput.value) || 0;
        const focusSec = (fMin * 60) + fSec;
        const breakSec = (bMin * 60) + bSec;

        setDurations(focusSec, breakSec);
        localStorage.setItem('focusMixerTimer', JSON.stringify({ focus: focusSec, break: breakSec }));
        resetTimer();
        settingsModal.classList.add('hidden');
    });

    addDebouncedClick(document.getElementById('btn-cancel-settings'), () => {
        settingsModal.classList.add('hidden');
    });

    // ==========================================
    // 6. タイマー終了モーダル
    // ==========================================
    const timerModal = document.getElementById('timer-modal');
    const modalMessage = document.getElementById('modal-message');

    addDebouncedClick(document.getElementById('modal-close-btn'), () => {
        modalMessage.textContent = getIsFocusMode() ? t.breakStart : t.focusStart;
        timerModal.classList.add('hidden');
    });

    // ==========================================
    // 7. プリセット保存・読込
    // ==========================================
    addDebouncedClick(document.getElementById('btn-save'), () => {
        const preset = {};
        document.querySelectorAll('.volume-slider').forEach(s => {
            preset[s.dataset.sound] = s.value;
        });
        localStorage.setItem('focusMixerPreset', JSON.stringify(preset));
        showToast(t.presetSaved);
    });

    addDebouncedClick(document.getElementById('btn-load'), async () => {
        const saved = localStorage.getItem('focusMixerPreset');
        if (!saved) {
            showToast(t.presetNotFound);
            return;
        }

        await initAudio();
        resumeContext();

        const preset = JSON.parse(saved);
        SOUND_LIST.forEach(sound => {
            const volume = preset[sound.id];
            if (volume !== undefined) {
                const input = document.querySelector(`input[data-sound="${sound.id}"]`);
                if (input) input.value = volume;
                applyVolumeFromPreset(sound.id, volume / 100);
            }
        });
        showToast(t.presetLoaded);
    }, 1000);

    // ==========================================
    // 8. Media Session ハンドラ（OSコントロール連動）
    // ==========================================
    setMediaSessionHandlers(
        () => {
            if (!isTimerRunning()) startTimer();
        },
        () => {
            if (isTimerRunning()) pauseTimer();
        }
    );

    // ==========================================
    // 9. Visibility Change （Wake Lock 復帰）
    // ==========================================
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' &&
            (isTimerRunning() || isAudioPlaying())) {
            requestWakeLock();
        }
    });

    // ==========================================
    // 10. ページ読み込み時のタイマー設定復元
    // ==========================================
    function checkAndRestoreTimerSettings() {
        const saved = localStorage.getItem('focusMixerTimer');
        if (!saved) return;

        try {
            const data = JSON.parse(saved);
            showConfirmToast(t.timerRestorePrompt, () => {
                setDurations(data.focus, data.break);
                resetTimer();
                showToast(t.timerRestored);
            });
        } catch (e) {
            console.error('Timer settings restore failed', e);
        }
    }

    // ==========================================
    // 初期化実行
    // ==========================================
    initMixerUI();
    checkAndRestoreTimerSettings();
});

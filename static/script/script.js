/**
 * Focus Mixer
 * Copyright (c) 2026 AliceIndex. All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

const CURRENT_VERSION = '3bf635a';

// ==========================================
// i18n: 言語検出と文字列定義
// ==========================================
const LANG = document.documentElement.lang === 'ja' ? 'ja' : 'en';

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

const t = i18n[LANG] || i18n.ja;

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. クッキー同意管理
    // ==========================================
    const cookieBanner = document.getElementById('cookie-banner');
    const btnAcceptCookie = document.getElementById('btn-accept-cookie');
    const btnDeclineCookie = document.getElementById('btn-decline-cookie');

    const consentStatus = localStorage.getItem('cookie-consent');
    if (!consentStatus) {
        setTimeout(() => {
            cookieBanner.classList.remove('hidden');
        }, 1000);
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
    // 1. 定数・データ定義（12音源・3カテゴリ）
    // ==========================================
    const SOUND_LIST = [
        // Page 1: Nature
        { id: 'rain',    label: { ja: '雨音',      en: 'Rain'        }, icon: '🌧️', file: 'rain.ogg',       category: 'nature' },
        { id: 'bonfire', label: { ja: '焚き火',    en: 'Bonfire'     }, icon: '🔥', file: 'bonfire.ogg',    category: 'nature' },
        { id: 'waves',   label: { ja: '波打ち際',  en: 'Waves'       }, icon: '🌊', file: 'waves.ogg',      category: 'nature' },
        { id: 'birds',   label: { ja: '野鳥',      en: 'Birds'       }, icon: '🐦', file: 'birds-opt.ogg',  category: 'nature' },
        // Page 2: Ambient & Tech
        { id: 'server',  label: { ja: 'サーバー室', en: 'Server Room' }, icon: '🖥️', file: 'server.ogg',     category: 'tech' },
        { id: 'cafe',    label: { ja: 'カフェ',    en: 'Cafe'        }, icon: '☕', file: 'cafe-opt.ogg',   category: 'tech' },
        { id: 'train',   label: { ja: '電車内',    en: 'Train'       }, icon: '🚃', file: 'train.ogg',      category: 'tech' },
        { id: 'fan',     label: { ja: '換気扇',    en: 'Fan'         }, icon: '🌀', file: 'fan.ogg',        category: 'tech' },
        // Page 3: Focus
        { id: 'white',   label: { ja: 'White',     en: 'White Noise' }, icon: '⚪', file: 'white-opt.ogg',  category: 'focus' },
        { id: 'pink',    label: { ja: 'Pink',      en: 'Pink Noise'  }, icon: '🌸', file: 'pink-opt.ogg',   category: 'focus' },
        { id: 'brown',   label: { ja: 'Brown',     en: 'Brown Noise' }, icon: '🟤', file: 'brown-opt.ogg',  category: 'focus' },
        { id: 'clock',   label: { ja: '時計',      en: 'Clock'       }, icon: '⏱️', file: 'clock.ogg',      category: 'focus' }
    ];

    // ==========================================
    // 2. グローバル変数 ＆ DOM要素
    // ==========================================
    let focusTotalSeconds = 25 * 60;
    let breakTotalSeconds = 5 * 60;
    let timeLeft = focusTotalSeconds;
    let timerInterval = null;
    let isFocusMode = true;
    let currentPage = 0;

    const timeDisplay = document.getElementById('time-display');
    const modeDisplay = document.getElementById('timer-mode');
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');

    const slider = document.getElementById('mixer-slider');
    const dots = document.querySelectorAll('.dot');
    const btnPrev = document.getElementById('prev-page');
    const btnNext = document.getElementById('next-page');

    const settingsModal = document.getElementById('settings-modal');
    const btnSettingsOpen = document.getElementById('settings-toggle');
    const btnApplySettings = document.getElementById('btn-apply-settings');
    const btnCancelSettings = document.getElementById('btn-cancel-settings');
    const focusMinInput = document.getElementById('focus-min-input');
    const focusSecInput = document.getElementById('focus-sec-input');
    const breakMinInput = document.getElementById('break-min-input');
    const breakSecInput = document.getElementById('break-sec-input');
    const timerModal = document.getElementById('timer-modal');
    const btnCloseTimer = document.getElementById('modal-close-btn');
    const modalMessage = document.getElementById('modal-message');
    const legalModal = document.getElementById('legal-modal');
    const btnOpenLegal = document.getElementById('btn-open-legal');
    const btnCloseLegal = document.getElementById('btn-close-legal');
    const bellSound = new Audio('/assets/sounds/bell.ogg');

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const btnMuteAll = document.getElementById('btn-mute-all');
    let audioCtx = null;
    const audioBuffers = {};
    const audioSources = {};
    const gainNodes = {};

    // ==========================================
    // 3. UIの動的生成
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
    // 4. カルーセル（スライド）制御
    // ==========================================
    function updateSlider() {
        const offset = currentPage * -33.3333;
        slider.style.transform = `translateX(${offset}%)`;
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentPage);
        });
    }

    addDebouncedClick(btnNext, () => {
        if (currentPage < 2) { currentPage++; updateSlider(); }
    }, 300);

    addDebouncedClick(btnPrev, () => {
        if (currentPage > 0) { currentPage--; updateSlider(); }
    }, 300);

    // ==========================================
    // 5. 音響エンジン (Web Audio API)
    // ==========================================
    async function initAudio() {
        if (audioCtx) return;
        audioCtx = new AudioContext();

        const loadPromises = SOUND_LIST.map(async (sound) => {
            try {
                const response = await fetch(`/assets/sounds/${sound.file}`);
                const arrayBuffer = await response.arrayBuffer();
                audioBuffers[sound.id] = await audioCtx.decodeAudioData(arrayBuffer);

                const gainNode = audioCtx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(audioCtx.destination);
                gainNodes[sound.id] = gainNode;
            } catch (e) {
                console.error(`Sound load failed: ${sound.id}`, e);
            }
        });
        await Promise.all(loadPromises);

        await audioCtx.resume();
        document.getElementById('silent-track').play().catch(() => { });
        updateMediaSession();
    }

    async function handleVolumeInput(e, id) {
        if (!audioCtx) await initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const volume = e.target.value / 100;
        if (!gainNodes[id]) return;

        gainNodes[id].gain.setTargetAtTime(volume, audioCtx.currentTime, 0.05);

        if (volume > 0 && !audioSources[id]) {
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffers[id];
            source.loop = true;
            source.connect(gainNodes[id]);
            source.start(0);
            audioSources[id] = source;
        } else if (volume === 0 && audioSources[id]) {
            audioSources[id].stop();
            audioSources[id] = null;
        }
    }

    addDebouncedClick(btnMuteAll, () => {
        SOUND_LIST.forEach(sound => {
            const id = sound.id;

            const input = document.querySelector(`input[data-sound="${id}"]`);
            if (input) {
                input.value = 0;
            }

            if (audioCtx && gainNodes[id]) {
                gainNodes[id].gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
            }

            if (audioSources[id]) {
                audioSources[id].stop();
                audioSources[id] = null;
            }
        });
        showToast(t.muteAll);
    });

    // ==========================================
    // 6. タイマー動作・時間設定モーダル
    // ==========================================
    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.title = `${timeDisplay.textContent} - Focus Mixer`;
    }

    function resetTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        isFocusMode = true;
        timeLeft = focusTotalSeconds;
        modeDisplay.textContent = "Focus Time";
        updateDisplay();
    }

    addDebouncedClick(btnStart, () => {
        if (timerInterval) return;
        timerInterval = setInterval(() => {
            timeLeft--;
            updateDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                isFocusMode = !isFocusMode;
                timeLeft = isFocusMode ? focusTotalSeconds : breakTotalSeconds;
                modeDisplay.textContent = isFocusMode ? "Focus Time" : "Break Time";
                updateDisplay();
                bellSound.play();
                timerModal.classList.remove('hidden');
            }
        }, 1000);
    });

    addDebouncedClick(btnPause, () => { clearInterval(timerInterval); timerInterval = null; });

    addDebouncedClick(btnReset, () => {
        resetTimer();
    });

    addDebouncedClick(btnSettingsOpen, () => {
        focusMinInput.value = Math.floor(focusTotalSeconds / 60);
        focusSecInput.value = focusTotalSeconds % 60;
        breakMinInput.value = Math.floor(breakTotalSeconds / 60);
        breakSecInput.value = breakTotalSeconds % 60;
        settingsModal.classList.remove('hidden');
    });

    addDebouncedClick(btnApplySettings, () => {
        const fMin = parseInt(focusMinInput.value) || 0;
        const fSec = parseInt(focusSecInput.value) || 0;
        const bMin = parseInt(breakMinInput.value) || 0;
        const bSec = parseInt(breakSecInput.value) || 0;

        focusTotalSeconds = (fMin * 60) + fSec;
        breakTotalSeconds = (bMin * 60) + bSec;

        localStorage.setItem('focusMixerTimer', JSON.stringify({ focus: focusTotalSeconds, break: breakTotalSeconds }));
        resetTimer();
        settingsModal.classList.add('hidden');
    });

    addDebouncedClick(btnCancelSettings, () => {
        settingsModal.classList.add('hidden');
    });

    addDebouncedClick(btnCloseTimer, () => {
        modalMessage.textContent = isFocusMode ? t.breakStart : t.focusStart;
        timerModal.classList.add('hidden');
    });

    // ==========================================
    // 7. ユーザー設定の保存・読込
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

        if (!audioCtx) {
            await initAudio();
        }
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        const preset = JSON.parse(saved);

        SOUND_LIST.forEach(sound => {
            const volume = preset[sound.id];
            if (volume !== undefined) {
                const input = document.querySelector(`input[data-sound="${sound.id}"]`);
                if (input) {
                    input.value = volume;
                }
                applyVolumeFromPreset(sound.id, volume / 100);
            }
        });

        showToast(t.presetLoaded);
    }, 1000);

    function applyVolumeFromPreset(id, volume) {
        if (!gainNodes[id]) return;

        gainNodes[id].gain.setTargetAtTime(volume, audioCtx.currentTime, 0.05);

        if (volume > 0 && !audioSources[id]) {
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffers[id];
            source.loop = true;
            source.connect(gainNodes[id]);
            source.start(0);
            audioSources[id] = source;
        } else if (volume === 0 && audioSources[id]) {
            audioSources[id].stop();
            audioSources[id] = null;
        }
    }

    // ==========================================
    // 5b. iOS バックグラウンド再生 / ノイズ対策
    // ==========================================
    function updateMediaSession() {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Focus Mixer',
            artist: 'Focus Mixer Team',
            artwork: [
                { src: '/assets/images/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: '/assets/images/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' }
            ]
        });
        navigator.mediaSession.setActionHandler('play', () => {
            if (audioCtx) audioCtx.resume();
            document.getElementById('silent-track').play().catch(() => { });
            if (!timerInterval) btnStart.click();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            if (timerInterval) btnPause.click();
            if (audioCtx) audioCtx.suspend();
        });
    }

    document.addEventListener('visibilitychange', () => {
        if (!audioCtx) return;
        if (document.visibilityState === 'hidden') {
            SOUND_LIST.forEach(sound => {
                const input = document.querySelector(`input[data-sound="${sound.id}"]`);
                const volume = input ? parseFloat(input.value) / 100 : 0;
                if (gainNodes[sound.id] && volume > 0) {
                    gainNodes[sound.id].gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
                }
            });
        } else {
            SOUND_LIST.forEach(sound => {
                const input = document.querySelector(`input[data-sound="${sound.id}"]`);
                const volume = input ? parseFloat(input.value) / 100 : 0;
                if (gainNodes[sound.id] && volume > 0) {
                    gainNodes[sound.id].gain.exponentialRampToValueAtTime(volume, audioCtx.currentTime + 0.2);
                }
            });
        }
    });

    // 初期化実行
    initMixerUI();
    updateDisplay();
    checkAndRestoreTimerSettings();

    // ==========================================
    // 8. 規約用モーダル
    // ==========================================
    addDebouncedClick(btnOpenLegal, () => {
        legalModal.classList.remove('hidden');
    });

    addDebouncedClick(btnCloseLegal, () => {
        legalModal.classList.add('hidden');
    });

    legalModal.addEventListener('click', (e) => {
        if (e.target === legalModal) {
            legalModal.classList.add('hidden');
        }
    });

    // ==========================================
    // 9. 通知・ユーティリティ
    // ==========================================
    function showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    function showConfirmToast(message, onConfirm) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast toast-confirm';
        toast.innerHTML = `
            <span>${message}</span>
            <div class="toast-actions">
                <button class="btn-toast-yes">${t.yesBtn}</button>
                <button class="btn-toast-no">${t.noBtn}</button>
            </div>
        `;
        container.appendChild(toast);

        const cleanup = () => toast.remove();
        addDebouncedClick(toast.querySelector('.btn-toast-yes'), () => { onConfirm(); cleanup(); });
        addDebouncedClick(toast.querySelector('.btn-toast-no'), cleanup);

        setTimeout(cleanup, 8000);
    }

    function addDebouncedClick(element, handler, delay = 500) {
        let busy = false;
        element.addEventListener('click', async (e) => {
            if (busy) return;
            busy = true;
            try {
                await handler(e);
            } finally {
                setTimeout(() => { busy = false; }, delay);
            }
        });
    }

    // ==========================================
    // 10. ページ読み込み時のタイマー設定復元
    // ==========================================
    function checkAndRestoreTimerSettings() {
        const saved = localStorage.getItem('focusMixerTimer');
        if (!saved) return;

        try {
            const data = JSON.parse(saved);
            showConfirmToast(t.timerRestorePrompt, () => {
                focusTotalSeconds = data.focus;
                breakTotalSeconds = data.break;
                resetTimer();
                showToast(t.timerRestored);
            });
        } catch (e) {
            console.error('Timer settings restore failed', e);
        }
    }
});

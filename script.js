/**
 * Focus Mixer
 * Copyright (c) 2026 [あなたの名前]. All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. グローバル変数 ＆ DOM要素の取得
    // ==========================================
    let focusTotalSeconds = 25 * 60;
    let breakTotalSeconds = 5 * 60;
    let timeLeft = focusTotalSeconds;
    let timerInterval = null;
    let isFocusMode = true;

    const timeDisplay = document.getElementById('time-display');
    const modeDisplay = document.getElementById('timer-mode');
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');

    // モーダル関連
    const settingsModal = document.getElementById('settings-modal');
    const settingsToggle = document.getElementById('settings-toggle');
    const focusMinInput = document.getElementById('focus-min-input');
    const focusSecInput = document.getElementById('focus-sec-input');
    const breakMinInput = document.getElementById('break-min-input');
    const breakSecInput = document.getElementById('break-sec-input');
    const btnApply = document.getElementById('btn-apply-settings');
    const btnCancel = document.getElementById('btn-cancel-settings');

    // アラート音はシームレスループ不要なので、手軽なHTMLAudioElementのままでOK
    const bellSound = new Audio('./assets/sounds/bell.mp3');

    const timerModal = document.getElementById('timer-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    const sliders = document.querySelectorAll('.volume-slider');
    const soundFiles = {
        rain: './assets/sounds/rain.mp3',
        cafe: './assets/sounds/cafe.mp3',
        keyboard: './assets/sounds/keyboard.mp3',
        server: './assets/sounds/server.mp3'
    };

    const themeToggleBtn = document.getElementById('theme-toggle');

    // ==========================================
    // 2. 初期ロード時の復元
    // ==========================================
    const savedTheme = localStorage.getItem('focusMixerTheme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggleBtn.textContent = '🌙 Dark';
    }

    const savedTimer = localStorage.getItem('focusMixerTimer');
    if (savedTimer) {
        const config = JSON.parse(savedTimer);
        focusTotalSeconds = config.focus || (25 * 60);
        breakTotalSeconds = config.break || (5 * 60);
        timeLeft = focusTotalSeconds;
    }

    // ==========================================
    // 3. タイマー & 通知モーダル
    // ==========================================
    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function startTimer() {
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

                bellSound.play().catch(e => console.log("音声再生エラー:", e));
                modalTitle.textContent = isFocusMode ? "Focus Time!" : "Break Time!";
                modalMessage.textContent = isFocusMode ? "休憩終了！集中しましょう！" : "お疲れ様です！休憩しましょう。";
                timerModal.classList.remove('hidden');
            }
        }, 1000);
    }

    btnStart.addEventListener('click', startTimer);
    btnPause.addEventListener('click', () => { clearInterval(timerInterval); timerInterval = null; });
    btnReset.addEventListener('click', resetTimer);
    modalCloseBtn.addEventListener('click', () => timerModal.classList.add('hidden'));

    function resetTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        isFocusMode = true;
        timeLeft = focusTotalSeconds;
        modeDisplay.textContent = "Focus Time";
        updateDisplay();
    }

    // ==========================================
    // 4. 設定モーダル
    // ==========================================
    settingsToggle.addEventListener('click', () => {
        focusMinInput.value = Math.floor(focusTotalSeconds / 60);
        focusSecInput.value = focusTotalSeconds % 60;
        breakMinInput.value = Math.floor(breakTotalSeconds / 60);
        breakSecInput.value = breakTotalSeconds % 60;
        settingsModal.classList.remove('hidden');
    });

    btnApply.addEventListener('click', () => {
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

    btnCancel.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    // ==========================================
    // 5. 環境音ミキサー (Web Audio API) & 保存
    // ==========================================
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    const audioBuffers = {};
    const audioSources = {}; // 再生中のSourceNodeを管理
    const gainNodes = {};    // 音量制御用Node

    // 音声ファイルをバッファとしてメモリに事前読み込み
    async function preloadSounds() {
        for (const [type, url] of Object.entries(soundFiles)) {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                audioBuffers[type] = await audioCtx.decodeAudioData(arrayBuffer);

                // 各音源用のボリュームコントローラーを作成し、最終出力(destination)に接続
                const gainNode = audioCtx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(audioCtx.destination);
                gainNodes[type] = gainNode;
            } catch (error) {
                console.error(`${type}の音声読み込みに失敗しました:`, error);
            }
        }
    }
    preloadSounds();

    // 再生用関数
    function playSound(type) {
        if (audioSources[type] || !audioBuffers[type]) return;

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffers[type];
        source.loop = true; // メモリからの直接ループにより無音の隙間がゼロになります
        source.connect(gainNodes[type]);
        source.start(0);
        audioSources[type] = source;
    }

    // 停止用関数
    function stopSound(type) {
        if (audioSources[type]) {
            audioSources[type].stop();
            audioSources[type].disconnect();
            audioSources[type] = null;
        }
    }

    sliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
            // ブラウザの自動再生ブロックを解除するため、ユーザー操作時にContextを起動
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const type = e.target.dataset.sound;
            const volume = e.target.value / 100;

            if (!gainNodes[type]) return;

            // setTargetAtTimeを使うことで、音量を急に変更した際の「プチッ」というノイズを防ぐ
            gainNodes[type].gain.setTargetAtTime(volume, audioCtx.currentTime, 0.05);

            if (volume > 0 && !audioSources[type]) {
                playSound(type);
            } else if (volume === 0 && audioSources[type]) {
                stopSound(type); // ボリューム0ならリソースを解放して軽くする
            }
        });
    });

    document.getElementById('btn-save').addEventListener('click', () => {
        const preset = {};
        sliders.forEach(s => preset[s.dataset.sound] = s.value);
        localStorage.setItem('focusMixerPreset', JSON.stringify(preset));
        alert('設定を保存しました');
    });

    document.getElementById('btn-load').addEventListener('click', () => {
        const saved = localStorage.getItem('focusMixerPreset');
        if (saved) {
            const preset = JSON.parse(saved);
            sliders.forEach(s => {
                if (preset[s.dataset.sound]) {
                    s.value = preset[s.dataset.sound];
                    s.dispatchEvent(new Event('input'));
                }
            });
        }
    });

    // ==========================================
    // 6. テーマ切り替え
    // ==========================================
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        themeToggleBtn.textContent = isLight ? '🌙 Dark' : '☀️ Light';
        localStorage.setItem('focusMixerTheme', isLight ? 'light' : 'dark');
    });

    updateDisplay();
});
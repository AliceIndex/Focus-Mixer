/**
 * Focus Mixer
 * Copyright (c) 2026 AliceIndex. All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. クッキー同意管理
    // ==========================================
    // --- クッキー同意管理 ---
    const cookieBanner = document.getElementById('cookie-banner');
    const btnAcceptCookie = document.getElementById('btn-accept-cookie');
    const btnDeclineCookie = document.getElementById('btn-decline-cookie');

    // 1. 同意ステータスの確認
    // 'accepted' または 'declined' が保存されていれば表示しない
    const consentStatus = localStorage.getItem('cookie-consent');
    if (!consentStatus) {
        setTimeout(() => {
            cookieBanner.classList.remove('hidden');
        }, 1000);
    }

    // 2. 「同意する」ボタン
    btnAcceptCookie.addEventListener('click', () => {
        localStorage.setItem('cookie-consent', 'accepted');
        cookieBanner.classList.add('hidden');
        showToast('クッキーの使用に同意しました 🍪');
        // ここでAdSenseのスクリプトをロードする等の処理を将来的に追加
    });

    // 3. 「同意しない」ボタン
    btnDeclineCookie.addEventListener('click', () => {
        localStorage.setItem('cookie-consent', 'declined');
        cookieBanner.classList.add('hidden');
        showToast('クッキーの使用を拒否しました 🛡️');
        // 非同意の場合はパーソナライズ広告を無効にするなどの配慮を行う
    });

    // ==========================================
    // 1. 定数・データ定義（12音源・3カテゴリ）
    // ==========================================
    const SOUND_LIST = [
        // Page 1: Nature
        { id: 'rain', label: '雨音', icon: '🌧️', file: 'rain.mp3', category: 'nature' },
        { id: 'bonfire', label: '焚き火', icon: '🔥', file: 'bonfire.mp3', category: 'nature' },
        { id: 'waves', label: '波打ち際', icon: '🌊', file: 'waves.mp3', category: 'nature' },
        { id: 'birds', label: '小鳥', icon: '🐦', file: 'birds.mp3', category: 'nature' },
        // Page 2: Ambient & Tech
        { id: 'server', label: 'サーバー室', icon: '🖥️', file: 'server.mp3', category: 'tech' },
        { id: 'cafe', label: 'カフェ', icon: '☕', file: 'cafe.mp3', category: 'tech' },
        { id: 'train', label: '電車内', icon: '🚃', file: 'train.mp3', category: 'tech' },
        { id: 'fan', label: '換気扇', icon: '🌀', file: 'fan.mp3', category: 'tech' },
        // Page 3: Focus
        { id: 'white', label: 'White', icon: '⚪', file: 'white.mp3', category: 'focus' },
        { id: 'pink', label: 'Pink', icon: '🌸', file: 'pink.mp3', category: 'focus' },
        { id: 'brown', label: 'Brown', icon: '🟤', file: 'brown.mp3', category: 'focus' },
        { id: 'clock', label: '時計', icon: '⏱️', file: 'clock.mp3', category: 'focus' }
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

    // カルーセル関連
    const slider = document.getElementById('mixer-slider');
    const dots = document.querySelectorAll('.dot');
    const btnPrev = document.getElementById('prev-page');
    const btnNext = document.getElementById('next-page');

    // モーダル・その他
    const settingsModal = document.getElementById('settings-modal');
    const timerModal = document.getElementById('timer-modal');
    const legalModal = document.getElementById('legal-modal');
    const btnOpenLegal = document.getElementById('btn-open-legal');
    const btnCloseLegal = document.getElementById('btn-close-legal');
    const bellSound = new Audio('./assets/sounds/bell.mp3');

    // Web Audio API
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const btnMuteAll = document.getElementById('btn-mute-all');
    let audioCtx = null; // ユーザー操作まで未初期化
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
                <label>${sound.label}</label>
                <input type="range" class="volume-slider" data-sound="${sound.id}" min="0" max="100" value="0">
            `;
            grid.appendChild(item);

            // スライダーにイベント登録
            const sliderInput = item.querySelector('input');
            sliderInput.addEventListener('input', (e) => handleVolumeInput(e, sound.id));
        });
    }

    // ==========================================
    // 4. カルーセル（スライド）制御
    // ==========================================
    function updateSlider() {
        const offset = currentPage * -33.3333; // 3ページなので
        slider.style.transform = `translateX(${offset}%)`;
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentPage);
        });
    }

    btnNext.addEventListener('click', () => {
        if (currentPage < 2) { currentPage++; updateSlider(); }
    });

    btnPrev.addEventListener('click', () => {
        if (currentPage > 0) { currentPage--; updateSlider(); }
    });

    // ==========================================
    // 5. 音響エンジン (Web Audio API)
    // ==========================================
    async function initAudio() {
        if (audioCtx) return;
        audioCtx = new AudioContext();

        // 全音源を並列でプリロード
        const loadPromises = SOUND_LIST.map(async (sound) => {
            try {
                const response = await fetch(`./assets/sounds/${sound.file}`);
                const arrayBuffer = await response.arrayBuffer();
                audioBuffers[sound.id] = await audioCtx.decodeAudioData(arrayBuffer);

                const gainNode = audioCtx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(audioCtx.destination);
                gainNodes[sound.id] = gainNode;
            } catch (e) {
                console.error(`音源ロード失敗: ${sound.id}`, e);
            }
        });
        await Promise.all(loadPromises);
    }

    async function handleVolumeInput(e, id) {
        if (!audioCtx) await initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const volume = e.target.value / 100;
        if (!gainNodes[id]) return;

        // ノイズ防止のため緩やかに音量変更
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

    btnMuteAll.addEventListener('click', () => {
        SOUND_LIST.forEach(sound => {
            const id = sound.id;

            // 1. スライダーの表示を0にする
            const input = document.querySelector(`input[data-sound="${id}"]`);
            if (input) {
                input.value = 0;
            }

            // 2. Web Audio APIの音量をフェードアウト（ノイズ防止）
            if (gainNodes[id]) {
                // 0.1秒かけて滑らかに消す
                gainNodes[id].gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
            }

            // 3. 再生リソースを解放する
            if (audioSources[id]) {
                audioSources[id].stop();
                audioSources[id] = null;
            }
        });
        showToast('すべての音をミュートしました 🔇');
    });

    // ==========================================
    // 6. タイマー・設定・保存（既存ロジック統合）
    // ==========================================
    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.title = `${timeDisplay.textContent} - Focus Mixer`;
    }

    btnStart.addEventListener('click', () => {
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

    btnPause.addEventListener('click', () => { clearInterval(timerInterval); timerInterval = null; });

    btnReset.addEventListener('click', () => {
        clearInterval(timerInterval);
        timerInterval = null;
        isFocusMode = true;
        timeLeft = focusTotalSeconds;
        modeDisplay.textContent = "Focus Time";
        updateDisplay();
    });

    // 設定保存・読み込み
    document.getElementById('btn-save').addEventListener('click', () => {
        const preset = {};
        document.querySelectorAll('.volume-slider').forEach(s => {
            preset[s.dataset.sound] = s.value;
        });
        localStorage.setItem('focusMixerPreset', JSON.stringify(preset));
        showToast('設定を保存しました 💾');
    });

    document.getElementById('btn-load').addEventListener('click', async () => {
        const saved = localStorage.getItem('focusMixerPreset');
        if (!saved) {
            showToast('保存された設定がありません ⚠️');
            return;
        }

        // 1. ユーザーのクリック操作直後に AudioContext を確実に初期化・再開
        if (!audioCtx) {
            await initAudio(); // 音源のロードとコンテキスト作成
        }
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        const preset = JSON.parse(saved);

        // 2. 各音源の設定を復元
        SOUND_LIST.forEach(sound => {
            const volume = preset[sound.id];
            if (volume !== undefined) {
                // スライダーの見た目を更新
                const input = document.querySelector(`input[data-sound="${sound.id}"]`);
                if (input) {
                    input.value = volume;
                }

                // 音量適用と再生開始ロジックを直接呼び出す
                // dispatchEventを使わず、定義済みの handleVolumeInput を直接叩くのが確実です
                applyVolumeFromPreset(sound.id, volume / 100);
            }
        });

        showToast('設定を読み込みました 🎶');
    });

    /**
     * プリセットからの適用専用関数
     * handleVolumeInput と同様のロジックを、イベントオブジェクトなしで実行
     */
    function applyVolumeFromPreset(id, volume) {
        if (!gainNodes[id]) return;

        // 音量の適用
        gainNodes[id].gain.setTargetAtTime(volume, audioCtx.currentTime, 0.05);

        // 再生状態の制御
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

    // 初期化実行
    initMixerUI();
    updateDisplay();

    // ==========================================
    // 6. 規約用モーダル
    // ==========================================
    // モーダルを開く
    btnOpenLegal.addEventListener('click', () => {
        legalModal.classList.remove('hidden');
    });

    // モーダルを閉じる
    btnCloseLegal.addEventListener('click', () => {
        legalModal.classList.add('hidden');
    });

    // 背景クリックで閉じる（おまけのUX向上）
    legalModal.addEventListener('click', (e) => {
        if (e.target === legalModal) {
            legalModal.classList.add('hidden');
        }
    });

    // ==========================================
    // 7. 指定したメッセージを画面右上に通知として表示
    // ==========================================
    function showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        container.appendChild(toast);

        // 3秒後に要素をDOMから完全に削除
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
});

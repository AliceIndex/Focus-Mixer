/**
 * Focus Mixer - Timer Controller
 * timerWorker と通信し、タイマーUIの更新と状態管理を行う
 * Copyright (c) 2026 AliceIndex. All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import { updateWakeLock } from './uiController.js';
import {
    ensureAudioStarted,
    isAudioPlaying,
    setMediaSessionPlaybackState
} from './audioController.js';

let focusTotalSeconds = 25 * 60;
let breakTotalSeconds = 5 * 60;
let timeLeft = focusTotalSeconds;
let timerRunning = false;
let isFocusMode = true;

let timerWorker = null;
let timeDisplay = null;
let modeDisplay = null;
let timerModal = null;
const bellSound = new Audio('/assets/sounds/bell.ogg');

export function initTimer(version) {
    timeDisplay = document.getElementById('time-display');
    modeDisplay = document.getElementById('timer-mode');
    timerModal = document.getElementById('timer-modal');

    timerWorker = new Worker(`/static/script/timerWorker.js?v=${version}`);
    timerWorker.onmessage = (e) => {
        const { type, remaining } = e.data || {};
        if (type === 'tick') {
            timeLeft = remaining;
            updateDisplay();
        } else if (type === 'end') {
            timerRunning = false;
            isFocusMode = !isFocusMode;
            timeLeft = isFocusMode ? focusTotalSeconds : breakTotalSeconds;
            modeDisplay.textContent = isFocusMode ? "Focus Time" : "Break Time";
            updateDisplay();
            bellSound.play().catch(() => { });
            timerModal.classList.remove('hidden');
            updateWakeLock();
            if (!isAudioPlaying()) {
                setMediaSessionPlaybackState('paused');
            }
        }
    };

    updateDisplay();
}

export function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.title = `${timeDisplay.textContent} - Focus Mixer`;
}

export function start() {
    if (timerRunning) return;
    timerRunning = true;
    timerWorker.postMessage({ type: 'start', duration: timeLeft });
    ensureAudioStarted();
    setMediaSessionPlaybackState('playing');
    updateWakeLock();
}

export function pause() {
    if (!timerRunning) return;
    timerWorker.postMessage({ type: 'pause' });
    timerRunning = false;
    if (!isAudioPlaying()) {
        setMediaSessionPlaybackState('paused');
    }
    updateWakeLock();
}

export function reset() {
    timerWorker.postMessage({ type: 'stop' });
    timerRunning = false;
    isFocusMode = true;
    timeLeft = focusTotalSeconds;
    modeDisplay.textContent = "Focus Time";
    updateDisplay();
    updateWakeLock();
}

export function setDurations(focusSec, breakSec) {
    focusTotalSeconds = focusSec;
    breakTotalSeconds = breakSec;
}

export function getDurations() {
    return { focus: focusTotalSeconds, break: breakTotalSeconds };
}

export function isRunning() {
    return timerRunning;
}

export function getIsFocusMode() {
    return isFocusMode;
}

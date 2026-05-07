/**
 * Focus Mixer - Audio Controller
 * Web Audio API による環境音の再生・停止・ボリューム制御
 * Copyright (c) 2026 AliceIndex. All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import { isIOS, updateWakeLock } from './uiController.js';

export const SOUND_LIST = [
    // Page 1: Nature
    { id: 'rain', label: { ja: '雨音', en: 'Rain' }, icon: '🌧️', file: 'rain.ogg', category: 'nature' },
    { id: 'bonfire', label: { ja: '焚き火', en: 'Bonfire' }, icon: '🔥', file: 'bonfire.ogg', category: 'nature' },
    { id: 'waves', label: { ja: '波打ち際', en: 'Waves' }, icon: '🌊', file: 'waves.ogg', category: 'nature' },
    { id: 'birds', label: { ja: '野鳥', en: 'Birds' }, icon: '🐦', file: 'birds-opt.ogg', category: 'nature' },
    // Page 2: Ambient & Tech
    { id: 'server', label: { ja: 'サーバー室', en: 'Server Room' }, icon: '🖥️', file: 'server.ogg', category: 'tech' },
    { id: 'cafe', label: { ja: 'カフェ', en: 'Cafe' }, icon: '☕', file: 'cafe-opt.ogg', category: 'tech' },
    { id: 'train', label: { ja: '電車内', en: 'Train' }, icon: '🚃', file: 'train.ogg', category: 'tech' },
    { id: 'fan', label: { ja: '換気扇', en: 'Fan' }, icon: '🌀', file: 'fan.ogg', category: 'tech' },
    // Page 3: Focus
    { id: 'white', label: { ja: 'White', en: 'White Noise' }, icon: '⚪', file: 'white-opt.ogg', category: 'focus' },
    { id: 'pink', label: { ja: 'Pink', en: 'Pink Noise' }, icon: '🌸', file: 'pink-opt.ogg', category: 'focus' },
    { id: 'brown', label: { ja: 'Brown', en: 'Brown Noise' }, icon: '🟤', file: 'brown-opt.ogg', category: 'focus' },
    { id: 'clock', label: { ja: '時計', en: 'Clock' }, icon: '⏱️', file: 'clock.ogg', category: 'focus' }
];

const AudioContextClass = window.AudioContext || window.webkitAudioContext;

let audioCtx = null;
const audioBuffers = {};
const audioSources = {};
const gainNodes = {};

let mediaSessionPlayHandler = null;
let mediaSessionPauseHandler = null;

function createAudibleSilentWav() {
    const sampleRate = 22050;
    const duration = 30;
    const numSamples = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    const writeString = (offset, str) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        const sample = Math.floor((Math.random() - 0.5) * 16);
        view.setInt16(offset, sample, true);
        offset += 2;
    }
    return new Blob([buffer], { type: 'audio/wav' });
}

const silentTrackEl = document.getElementById('silent-track');
silentTrackEl.src = URL.createObjectURL(createAudibleSilentWav());

export async function initAudio() {
    if (audioCtx) return;
    audioCtx = new AudioContextClass();

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
    silentTrackEl.play().catch(() => { });
    updateMediaSessionMetadata();
}

export async function handleVolumeInput(e, id) {
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
    updateWakeLock();
}

export function applyVolumeFromPreset(id, volume) {
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
    updateWakeLock();
}

export function muteAll() {
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
    updateWakeLock();
}

export function isAudioPlaying() {
    for (const id in audioSources) {
        if (audioSources[id]) return true;
    }
    return false;
}

export function playSilentTrack() {
    silentTrackEl.play().catch(() => { });
}

export function resumeContext() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

export function suspendContext() {
    if (audioCtx) audioCtx.suspend();
}

export function ensureAudioStarted() {
    playSilentTrack();
    if (!audioCtx) {
        initAudio();
    } else {
        resumeContext();
    }
}

export function handleVisibilityChangeForIOS() {
    if (!audioCtx) return;
    if (!isIOS) return;

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
}

export function setMediaSessionHandlers(playFn, pauseFn) {
    mediaSessionPlayHandler = playFn;
    mediaSessionPauseHandler = pauseFn;
}

export function updateMediaSessionMetadata() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Focus Mixer - Deep Work',
        artist: 'Pomodoro Timer',
        artwork: [
            { src: '/assets/images/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/assets/images/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
    });
    navigator.mediaSession.setActionHandler('play', () => {
        resumeContext();
        playSilentTrack();
        if (mediaSessionPlayHandler) mediaSessionPlayHandler();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
        if (mediaSessionPauseHandler) mediaSessionPauseHandler();
        suspendContext();
    });
}

export function setMediaSessionPlaybackState(state) {
    if (!('mediaSession' in navigator)) return;
    if (!navigator.mediaSession.metadata) updateMediaSessionMetadata();
    navigator.mediaSession.playbackState = state;
}

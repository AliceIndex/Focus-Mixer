/**
 * Focus Mixer - UI Controller
 * Wake Lock / Toast / Debounced Click などのドメイン非依存ユーティリティ
 * Copyright (c) 2026 AliceIndex. All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import { t } from './i18n.js';

export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function addDebouncedClick(element, handler, delay = 500) {
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

export function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

export function showConfirmToast(message, onConfirm) {
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

let wakeLock = null;
let isActiveCheck = () => false;

export function setActiveSessionChecker(fn) {
    isActiveCheck = fn;
}

export async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    if (wakeLock !== null) return;
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (err) {
        console.error('Wake Lock request failed:', err);
    }
}

export async function releaseWakeLock() {
    if (wakeLock === null) return;
    try {
        await wakeLock.release();
    } catch (err) {
        console.error('Wake Lock release failed:', err);
    }
    wakeLock = null;
}

export function updateWakeLock() {
    if (isActiveCheck()) {
        requestWakeLock();
    } else {
        releaseWakeLock();
    }
}

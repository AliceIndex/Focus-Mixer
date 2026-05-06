/**
 * Focus Mixer - Timer Worker
 * Copyright (c) 2026 AliceIndex. All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

let intervalId = null;
let targetTime = 0;

self.onmessage = (e) => {
    const { type, duration } = e.data || {};

    if (type === 'start') {
        if (intervalId) clearInterval(intervalId);
        targetTime = Date.now() + (duration || 0) * 1000;

        intervalId = setInterval(() => {
            const remaining = Math.max(0, Math.round((targetTime - Date.now()) / 1000));
            self.postMessage({ type: 'tick', remaining });
            if (remaining <= 0) {
                clearInterval(intervalId);
                intervalId = null;
                self.postMessage({ type: 'end' });
            }
        }, 1000);
    } else if (type === 'pause' || type === 'stop') {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
};

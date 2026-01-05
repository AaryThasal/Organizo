// useRefreshOnFocus - refreshes data when page gains focus

import { useEffect, useCallback, useRef } from 'react';

// Calls refresh function on window focus with throttling
export function useRefreshOnFocus(onRefresh, options = {}) {
    const { enabled = true, throttleMs = 5000 } = options;
    const lastRefreshRef = useRef(0);

    const throttledRefresh = useCallback(() => {
        const now = Date.now();
        if (now - lastRefreshRef.current >= throttleMs) {
            lastRefreshRef.current = now;
            onRefresh();
        }
    }, [onRefresh, throttleMs]);

    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                throttledRefresh();
            }
        };

        const handleFocus = () => {
            throttledRefresh();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [enabled, throttledRefresh]);
}

// Polls data at interval (only when page is visible)
export function usePolling(onPoll, intervalMs, options = {}) {
    const { enabled = true } = options;

    useEffect(() => {
        if (!enabled) return;

        let intervalId = null;

        const startPolling = () => {
            if (document.visibilityState === 'visible') {
                intervalId = setInterval(() => {
                    if (document.visibilityState === 'visible') {
                        onPoll();
                    }
                }, intervalMs);
            }
        };

        const stopPolling = () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                startPolling();
            } else {
                stopPolling();
            }
        };

        startPolling();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [enabled, intervalMs, onPoll]);
}

export default useRefreshOnFocus;

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideToast } from '../../store/uiSlice';

const icons = {
    success: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    ),
    error: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    info: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    warning: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
};

const colorClasses = {
    success: 'bg-dark-card border-success/30 text-success',
    error: 'bg-dark-card border-danger/30 text-danger',
    info: 'bg-dark-card border-info/30 text-info',
    warning: 'bg-dark-card border-warning/30 text-warning',
};

const iconColorClasses = {
    success: 'text-success',
    error: 'text-danger',
    info: 'text-info',
    warning: 'text-warning',
};

function Toast() {
    const dispatch = useDispatch();
    const toast = useSelector((state) => state.ui.toast);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                dispatch(hideToast());
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [toast, dispatch]);

    if (!toast) return null;

    const { type = 'info', message } = toast;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
            <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-medium ${colorClasses[type]}`}
            >
                <span className={iconColorClasses[type]}>
                    {icons[type]}
                </span>
                <p className="text-sm font-medium">{message}</p>
                <button
                    onClick={() => dispatch(hideToast())}
                    className="ml-2 p-1 rounded-lg hover:bg-dark-elevated transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default Toast;

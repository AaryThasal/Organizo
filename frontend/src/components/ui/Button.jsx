import React from 'react';

const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-400 hover:shadow-glow focus:ring-primary-500 shadow-soft',
    secondary: 'bg-dark-card text-text-primary hover:bg-dark-elevated focus:ring-secondary-500 border border-dark-border',
    danger: 'bg-danger text-white hover:bg-red-500 focus:ring-red-500',
    success: 'bg-success text-white hover:bg-green-400 focus:ring-green-500',
    ghost: 'bg-transparent text-text-secondary hover:bg-dark-elevated hover:text-text-primary',
    outline: 'bg-transparent border-2 border-primary-500 text-primary-400 hover:bg-primary-500/10',
};

const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
};

function Button({
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    type = 'button',
    className = '',
    onClick,
    ...props
}) {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]';
    const variantClass = variants[variant] || variants.primary;
    const sizeClass = sizes[size] || sizes.md;

    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`}
            onClick={onClick}
            {...props}
        >
            {loading && (
                <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            )}
            {children}
        </button>
    );
}

export default Button;

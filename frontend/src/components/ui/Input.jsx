// ===========================================
// Input Component
// ===========================================
// Reusable form input with label and error handling

import React from 'react';

function Input({
    label,
    type = 'text',
    name,
    value,
    onChange,
    placeholder,
    error,
    required = false,
    disabled = false,
    className = '',
    ...props
}) {
    const inputId = name || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className={`mb-4 ${className}`}>
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-secondary-700 mb-1.5">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                id={inputId}
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white text-secondary-900 placeholder:text-secondary-400 transition-all duration-200 focus:ring-2 focus:ring-offset-0 ${error
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-secondary-200 focus:border-primary-500 focus:ring-primary-500/20'
                    } ${disabled ? 'bg-secondary-50 cursor-not-allowed' : ''}`}
                {...props}
            />
            {error && (
                <p className="mt-1.5 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}

export default Input;

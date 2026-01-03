// ===========================================
// Select Component
// ===========================================
// Reusable select dropdown

import React from 'react';

function Select({
    label,
    name,
    value,
    onChange,
    options = [],
    placeholder = 'Select an option',
    error,
    required = false,
    disabled = false,
    className = '',
    ...props
}) {
    const selectId = name || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className={`mb-4 ${className}`}>
            {label && (
                <label htmlFor={selectId} className="block text-sm font-medium text-secondary-700 mb-1.5">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <select
                id={selectId}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                required={required}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white text-secondary-900 transition-all duration-200 focus:ring-2 focus:ring-offset-0 appearance-none cursor-pointer ${error
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-secondary-200 focus:border-primary-500 focus:ring-primary-500/20'
                    } ${disabled ? 'bg-secondary-50 cursor-not-allowed' : ''}`}
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.75rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem',
                }}
                {...props}
            >
                <option value="" disabled>
                    {placeholder}
                </option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && (
                <p className="mt-1.5 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}

export default Select;

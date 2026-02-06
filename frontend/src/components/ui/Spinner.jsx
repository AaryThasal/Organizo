import React from 'react';

const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
};

function Spinner({ size = 'md', className = '' }) {
    return (
        <div
            className={`${sizeClasses[size]} border-primary-600 border-t-transparent rounded-full animate-spin ${className}`}
        />
    );
}

function LoadingScreen({ message = 'Loading...' }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-dark">
            <Spinner size="xl" />
            <p className="mt-4 text-text-secondary font-medium">{message}</p>
        </div>
    );
}

export { Spinner, LoadingScreen };
export default Spinner;

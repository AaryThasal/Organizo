import React from 'react';
import Button from './Button';

function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    className = '',
}) {
    return (
        <div className={`text-center py-12 px-6 ${className}`}>
            {icon && (
                <div className="w-16 h-16 mx-auto text-text-muted mb-4">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
            {description && (
                <p className="text-text-secondary max-w-sm mx-auto mb-6">{description}</p>
            )}
            {actionLabel && onAction && (
                <Button onClick={onAction}>{actionLabel}</Button>
            )}
        </div>
    );
}

export default EmptyState;

import React from 'react';

const avatarColors = {
    A: 'bg-red-500',
    B: 'bg-orange-500',
    C: 'bg-amber-500',
    D: 'bg-yellow-500',
    E: 'bg-lime-500',
    F: 'bg-green-500',
    G: 'bg-emerald-500',
    H: 'bg-teal-500',
    I: 'bg-cyan-500',
    J: 'bg-sky-500',
    K: 'bg-blue-500',
    L: 'bg-indigo-500',
    M: 'bg-violet-500',
    N: 'bg-purple-500',
    O: 'bg-fuchsia-500',
    P: 'bg-pink-500',
    Q: 'bg-rose-500',
    R: 'bg-red-600',
    S: 'bg-orange-600',
    T: 'bg-amber-600',
    U: 'bg-green-600',
    V: 'bg-teal-600',
    W: 'bg-blue-600',
    X: 'bg-indigo-600',
    Y: 'bg-purple-600',
    Z: 'bg-pink-600',
};

const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
};

function getAvatarColor(name) {
    if (!name) return 'bg-secondary-500';
    const firstLetter = name.charAt(0).toUpperCase();
    return avatarColors[firstLetter] || 'bg-primary-500';
}

function getInitials(firstName, lastName) {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '?';
}

function Avatar({ firstName, lastName, profileImageUrl, size = 'md', className = '' }) {
    const sizeClass = sizeClasses[size] || sizeClasses.md;
    const fullName = `${firstName || ''} ${lastName || ''}`.trim();

    if (profileImageUrl) {
        return (
            <img
                src={profileImageUrl}
                alt={fullName}
                title={fullName}
                className={`inline-block rounded-full object-cover ${sizeClass} ${className}`}
            />
        );
    }

    const initials = getInitials(firstName, lastName);
    const colorClass = getAvatarColor(firstName);

    return (
        <div
            className={`inline-flex items-center justify-center rounded-full font-semibold text-white uppercase ${colorClass} ${sizeClass} ${className}`}
            title={fullName}
        >
            {initials}
        </div>
    );
}

export default Avatar;

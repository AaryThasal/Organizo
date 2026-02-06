/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            // Dark SaaS Color Palette
            colors: {
                // Dark theme backgrounds
                dark: {
                    DEFAULT: '#0F172A',      // Main page background
                    card: '#1E293B',         // Card/panel background
                    elevated: '#273549',     // Slightly elevated surfaces
                    border: '#334155',       // Borders/dividers
                },
                // Primary accent color (Violet)
                primary: {
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    200: '#ddd6fe',
                    300: '#c4b5fd',
                    400: '#a78bfa',
                    500: '#8B5CF6',           // Main primary accent
                    600: '#7c3aed',
                    700: '#6d28d9',
                    800: '#5b21b6',
                    900: '#4c1d95',
                    950: '#2e1065',
                },
                // Secondary accent (Indigo for hover/highlights)
                secondary: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366F1',           // Secondary accent
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
                // Text colors
                text: {
                    primary: '#E2E8F0',       // Primary text
                    secondary: '#94A3B8',     // Muted/secondary text
                    muted: '#64748B',         // Even more muted
                },
                // Accent color (Emerald for success/positive)
                accent: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                },
                // Status colors
                success: '#22C55E',
                warning: '#f59e0b',
                danger: '#EF4444',
                info: '#3b82f6',
            },
            // Custom font family
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            // Custom shadows for dark theme
            boxShadow: {
                'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.3), 0 10px 20px -2px rgba(0, 0, 0, 0.2)',
                'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 30px -5px rgba(0, 0, 0, 0.3)',
                'glow': '0 0 20px rgba(139, 92, 246, 0.4)',
                'glow-lg': '0 0 30px rgba(139, 92, 246, 0.5)',
                'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
            },
            // Custom border radius
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            },
            // Animations
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'spin-slow': 'spin 3s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
            },
        },
    },
    plugins: [],
}

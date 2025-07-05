/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        screens: {
            'xs': '475px',
            'sm': '640px',
            'md': '768px',
            'lg': '1024px',
            'xl': '1280px',
            '2xl': '1536px',
        },
        extend: {
            colors: {
                primary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                },
                secondary: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
            },
        },
    },
    plugins: [],
}
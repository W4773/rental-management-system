/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                cream: '#faf7f2',
                ink: '#1a1a1a',
                brand: {
                    50: '#fff8ed',
                    100: '#f6efd9',
                    200: '#e8dfc8',
                    400: '#e8c84a',
                    500: '#b8962e',
                    600: '#a07f22',
                    700: '#7d6318',
                },
                accent: { 500: '#d2622a', 600: '#b8531f' },
                'status-green': '#22C55E',
                'status-green-light': 'rgba(34, 197, 94, 0.1)',
                'status-yellow': '#EAB308',
                'status-yellow-light': 'rgba(234, 179, 8, 0.1)',
                'status-red': '#EF4444',
                'status-red-light': 'rgba(239, 68, 68, 0.1)',
                'status-gray': '#6B7280',
                'status-gray-light': 'rgba(107, 114, 128, 0.1)',
            },
        },
    },
    plugins: [],
}

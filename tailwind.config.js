/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
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

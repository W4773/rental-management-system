/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
            },
            colors: {
                cream: '#F8F6F0',
                ink: '#26221C',
                brand: {
                    50: '#FBF7EA',
                    100: '#F5ECC9',
                    200: '#EBD98F',
                    400: '#D4B94F',
                    500: '#B8993A',
                    600: '#9A7D24',
                    700: '#7D641A',
                },
                accent: { 500: '#D2622A', 600: '#B8531F' },
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

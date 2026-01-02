/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#18181b", // darker zinc
                primary: "#6366f1", // indigo-500
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                handwriting: ['Kalam', 'cursive'],
            },
        },
    },
    plugins: [],
}

const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './vendor/laravel/jetstream/**/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            colors: {
                ink: {
                    DEFAULT: '#0B1F1A',
                    muted: '#3D524B',
                },
                emerald: {
                    DEFAULT: '#0D7A5F',
                    deep: '#075A46',
                },
                mint: '#D8F3E7',
                paper: '#F4FAF7',
                sand: '#E8F0EC',
                accent: '#C8F542',
            },
            fontFamily: {
                sans: [
                    'Inter',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    '"Segoe UI"',
                    'Roboto',
                    'Helvetica',
                    'Arial',
                    ...defaultTheme.fontFamily.sans,
                ],
                display: [
                    'Inter',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    '"Segoe UI"',
                    'Roboto',
                    'Helvetica',
                    'Arial',
                    ...defaultTheme.fontFamily.sans,
                ],
            },
            boxShadow: {
                soft: '0 18px 40px rgba(11, 31, 26, 0.08)',
            },
        },
    },

    plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};

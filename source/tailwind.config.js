const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'src/ui/**/*.{ts,tsx}'),
    path.join(__dirname, 'pages/*.html'),
  ],
  theme: {
    extend: {
      colors: {
        ink: '#020617',
      },
    },
  },
  plugins: [],
};

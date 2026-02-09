import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Jake's western color palette
        saloon: {
          50: '#fef9f3',
          100: '#fdf3e7',
          200: '#fae6cf',
          300: '#f6d6ad',
          400: '#f0bc7d',
          500: '#e89f4d',
          600: '#d67d28',
          700: '#b66420',
          800: '#94501e',
          900: '#78421d',
        },
        dusty: {
          50: '#f7f6f4',
          100: '#edebe6',
          200: '#dbd6cc',
          300: '#c3bbad',
          400: '#a89d8a',
          500: '#938673',
          600: '#867a67',
          700: '#706557',
          800: '#5d544a',
          900: '#4c463d',
        },
      },
      fontFamily: {
        western: ['var(--font-western)', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'bounce-subtle': 'bounceSubtle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;

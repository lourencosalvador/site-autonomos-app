/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#03475E',
          dark2: '#023A4D',
          dark3: '#062B3A',
          cyan: '#02E6FF',
          cyan2: '#0AC8E0',
          cyanDim: '#0A9DB5',
          white: '#FFFFFF',
        },
        // Light canvas tones
        cloud: {
          50: '#FBFDFE',
          100: '#F4F9FC',
          200: '#EAF2F7',
          300: '#DCE9F1',
        },
        // Soft pastel accent (echoes the reference's lavender wash)
        lilac: {
          100: '#EFEDFF',
          200: '#E1DCFF',
          300: '#C9C2FF',
        },
        peach: {
          100: '#FFF0E9',
          200: '#FFE0D2',
        },
        ink: {
          950: '#04161D',
          900: '#0A1F2A',
          800: '#0E2A38',
          700: '#143645',
          500: '#3A5765',
          400: '#5E7C8A',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '7xl': ['4.5rem', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
        '8xl': ['6rem', { lineHeight: '0.98', letterSpacing: '-0.035em' }],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(2,230,255,0.25), 0 8px 40px -8px rgba(2,230,255,0.35)',
        glowSoft: '0 10px 50px -12px rgba(2,230,255,0.45)',
        card: '0 10px 40px -12px rgba(3,71,94,0.18)',
        cardHover: '0 24px 70px -20px rgba(3,71,94,0.30)',
        cardDark: '0 20px 60px -20px rgba(0,0,0,0.45)',
        soft: '0 4px 24px -8px rgba(3,71,94,0.14)',
        pill: '0 10px 30px -10px rgba(3,71,94,0.45)',
        phone: '0 50px 110px -30px rgba(3,71,94,0.45), 0 30px 60px -30px rgba(2,230,255,0.25)',
        float: '0 18px 50px -16px rgba(3,71,94,0.30)',
        innerline: 'inset 0 0 0 1px rgba(255,255,255,0.6)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
        '5xl': '2.75rem',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeLeft: {
          '0%': { opacity: '0', transform: 'translateX(-28px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeRight: {
          '0%': { opacity: '0', transform: 'translateX(28px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        floatY: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        floatY2: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(12px)' },
        },
        floatY3: {
          '0%,100%': { transform: 'translateY(0) rotate(-3deg)' },
          '50%': { transform: 'translateY(-10px) rotate(3deg)' },
        },
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(2,230,255,0.40)' },
          '50%': { boxShadow: '0 0 0 16px rgba(2,230,255,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.6)' },
          '70%': { opacity: '1', transform: 'scale(1.06)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        gradientShift: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        blob: {
          '0%,100%': { borderRadius: '42% 58% 63% 37% / 41% 44% 56% 59%' },
          '50%': { borderRadius: '58% 42% 38% 62% / 56% 58% 42% 44%' },
        },
        waveBar: {
          '0%,100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both',
        fadeIn: 'fadeIn 0.6s ease both',
        fadeLeft: 'fadeLeft 0.7s cubic-bezier(0.22,1,0.36,1) both',
        fadeRight: 'fadeRight 0.7s cubic-bezier(0.22,1,0.36,1) both',
        floatY: 'floatY 6s ease-in-out infinite',
        floatY2: 'floatY2 7s ease-in-out infinite',
        floatY3: 'floatY3 8s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2.6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        marquee: 'marquee 40s linear infinite',
        scaleIn: 'scaleIn 0.55s cubic-bezier(0.22,1,0.36,1) both',
        popIn: 'popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
        spinSlow: 'spinSlow 22s linear infinite',
        gradientShift: 'gradientShift 8s ease infinite',
        blob: 'blob 12s ease-in-out infinite',
        waveBar: 'waveBar 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

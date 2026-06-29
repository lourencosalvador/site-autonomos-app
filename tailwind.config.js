/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Single refined teal accent — used sparingly, never neon.
        accent: {
          50: '#F1F7F8',
          100: '#DDEBEE',
          200: '#BCD8DD',
          300: '#90BDC6',
          400: '#5E99A6',
          500: '#3D7C8B',
          600: '#2E6373',
          700: '#28505D', // primary accent
          800: '#24424D',
          900: '#102A31',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '7xl': ['4.5rem', { lineHeight: '1.03', letterSpacing: '-0.035em' }],
        '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        // Intentionally subtle — elevation comes from borders + spacing, not glow.
        xs: '0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        sm: '0 1px 3px 0 rgba(16, 24, 40, 0.06), 0 1px 2px -1px rgba(16, 24, 40, 0.04)',
        md: '0 4px 12px -2px rgba(16, 24, 40, 0.06), 0 2px 6px -2px rgba(16, 24, 40, 0.04)',
        lg: '0 12px 28px -6px rgba(16, 24, 40, 0.10)',
        float: '0 16px 38px -12px rgba(16, 24, 40, 0.22)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
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
        accordionDown: {
          '0%': { height: '0', opacity: '0' },
          '100%': { height: 'var(--accordion-height)', opacity: '1' },
        },
        accordionUp: {
          '0%': { height: 'var(--accordion-height)', opacity: '1' },
          '100%': { height: '0', opacity: '0' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both',
        fadeIn: 'fadeIn 0.5s ease both',
        scaleIn: 'scaleIn 0.6s cubic-bezier(0.22,1,0.36,1) both',
        marquee: 'marquee 38s linear infinite',
        floatY: 'floatY 6s ease-in-out infinite',
        floatY2: 'floatY2 7s ease-in-out infinite',
        floatY3: 'floatY3 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

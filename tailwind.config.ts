import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        card: {
          DEFAULT: 'var(--color-card)',
          foreground: 'var(--color-card-foreground)',
        },
        border: 'var(--color-border)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-on-primary)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-on-secondary)',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-on-accent)',
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',
          foreground: 'var(--color-on-destructive)',
        },
        ring: 'var(--color-ring)',
        hud: {
          bg: '#0B0B10',
          card: '#1E1E23',
          border: '#1E293B',
          text: '#F8FAFC',
          muted: '#94A3B8',
          accent: '#3B82F6',
          glow: 'rgba(59, 130, 246, 0.25)',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          cyan: '#06B6D4',
          teal: '#14B8A6',
        },
        night: {
          bg: '#000000',
          card: '#080000',
          border: '#3B0808',
          text: '#F87171',
          muted: '#991B1B',
          accent: '#EF4444',
          alert: '#DC2626',
        },
      },
      fontFamily: {
        heading: ['var(--font-exo)', 'Exo', 'sans-serif'],
        mono: ['var(--font-roboto-mono)', 'Roboto Mono', 'monospace'],
        body: ['var(--font-roboto-mono)', 'Roboto Mono', 'monospace'],
        sans: ['var(--font-exo)', 'Exo', 'sans-serif'],
      },
      boxShadow: {
        'hud-sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'hud-md': '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 1px 1px rgba(30, 41, 59, 0.8)',
        'hud-lg': '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 15px rgba(59, 130, 246, 0.1)',
        'hud-glow': '0 0 20px rgba(59, 130, 246, 0.35)',
        'hud-alert': '0 0 20px rgba(239, 68, 68, 0.4)',
      },
      spacing: {
        'space-xs': '4px',
        'space-sm': '8px',
        'space-md': '16px',
        'space-lg': '24px',
        'space-xl': '32px',
        'space-2xl': '48px',
        'space-3xl': '64px',
      },
    },
  },
  plugins: [],
};

export default config;

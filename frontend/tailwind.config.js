/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      'var(--color-bg)',
        surface: 'var(--color-surface)',
        ink:     'var(--color-ink)',
        muted:   'var(--color-muted)',
        owed:    'var(--color-owed)',
        owe:     'var(--color-owe)',
        rule:    'var(--color-rule)'
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body:    ['"IBM Plex Sans"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace']
      }
    }
  },
  plugins: []
};

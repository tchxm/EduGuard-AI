import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#1e40af',
        accent: '#06b6d4',
        background: '#f8fafc',
        foreground: '#0f172a',
        muted: '#94a3b8',
        border: '#cbd5e1',
      },
    },
  },
  plugins: [],
};

export default config;

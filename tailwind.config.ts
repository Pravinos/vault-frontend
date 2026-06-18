import defaultTheme from 'tailwindcss/defaultTheme';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx,js,jsx}',
    './src/components/**/*.{ts,tsx,js,jsx}',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-space-grotesk)', ...defaultTheme.fontFamily.sans as string[]],
      },
      colors: {
        vault: {
          green: '#1D9E75',
          'green-muted': 'rgba(29, 158, 117, 0.15)',
          surface: '#0f1923',
          bg: '#0d1520',
        },
      },
    },
  },
  plugins: [],
};

export default config;

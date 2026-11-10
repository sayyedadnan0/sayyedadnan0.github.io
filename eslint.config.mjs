import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts', '.local-archive/**', '.chrome-temp/**', '.venv/**', 'node_modules/**']),
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['@/server', '@/server/**'], message: 'Feature UI must receive server data through props. Keep database, auth, and storage in src/server.' }] }],
    },
  },
]);

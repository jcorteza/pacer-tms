import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// The repo-root .env, shared with docker compose.
const repoRoot = fileURLToPath(new URL('..', import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    // The '' prefix reads every variable for this config only; the browser bundle still gets just VITE_*.
    const env = loadEnv(mode, repoRoot, '')
    // The backend requires this key on every route. Adding it here keeps it out of the browser.
    if (!env.API_KEY && !process.env.VITEST) throw new Error('API_KEY must be set: the backend requires it on every request.')

    return {
        plugins: [react()],
        server: {
            host: "0.0.0.0",
            // The app calls /api/...; the backend serves the same paths without the prefix.
            proxy: {
                '/api': {
                    target: env.API_URL ?? 'http://localhost:3000',
                    rewrite: (path: string) => path.replace(/^\/api/, ''),
                    headers: { 'x-api-key': env.API_KEY ?? '' },
                },
            },
        },
        test: {
            environment: 'jsdom',
            setupFiles: ['./src/test/setup.ts'],
            // Specs live beside the code they cover.
            include: ['src/**/*.test.{ts,tsx}'],
        },
    }
})

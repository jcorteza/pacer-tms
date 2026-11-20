import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: "0.0.0.0",
        // The app calls /api/...; the backend serves the same paths without the prefix.
        proxy: {
            '/api': {
                target: process.env.API_URL ?? 'http://localhost:3000',
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        // Specs live beside the code they cover.
        include: ['src/**/*.test.{ts,tsx}'],
    },
})

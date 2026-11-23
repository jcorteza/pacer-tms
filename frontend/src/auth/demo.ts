/** Demo mode: the app skips the login page and signs in as the demo user. Read per call so tests can flip it. */
export const isDemoMode = () => import.meta.env.VITE_DEMO_MODE === 'true'

export const DEMO_DISABLED = 'Disabled in demo mode'

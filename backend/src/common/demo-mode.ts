/** Demo mode: login is bypassed and every visitor gets a session as a throwaway Demo User. Read per call so tests can flip it. */
export const isDemoMode = () => process.env.DEMO_MODE === 'true';

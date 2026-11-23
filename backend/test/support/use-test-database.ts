import { testDatabaseUrl } from '../../src/db/test/test-database-url.js';

// AppModule reads DATABASE_URL when it is imported, so this runs first (setupFiles).
process.env.DATABASE_URL = testDatabaseUrl();

// The developer's .env may turn demo mode on; specs run with it off unless they stub it on.
process.env.DEMO_MODE = 'false';

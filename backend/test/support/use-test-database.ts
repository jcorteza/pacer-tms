import { testDatabaseUrl } from '../../src/db/test/test-database-url.js';

// AppModule reads DATABASE_URL when it is imported, so this runs first (setupFiles).
process.env.DATABASE_URL = testDatabaseUrl();

// Every route requires this key; specs send it through apiClient.
process.env.API_KEY = 'test-api-key';

// Specs make more than the default limit from one user (one creates 51 rows, and counters last 5 minutes); rate-limit.e2e-spec.ts unsets this.
process.env.RATE_LIMIT_DEFAULT = '100000';

// The developer's .env may turn demo mode on; specs run with it off unless they stub it on.
process.env.DEMO_MODE = 'false';

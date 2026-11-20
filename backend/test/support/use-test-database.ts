import { testDatabaseUrl } from '../../src/db/test/test-database-url.js';

// AppModule reads DATABASE_URL when it is imported, so this runs first (setupFiles).
process.env.DATABASE_URL = testDatabaseUrl();

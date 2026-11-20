import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { clients } from '../schema.js';
import { closeDatabase, createClient, db, expectPgError, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('clients', () => {
  it('given a client name, when the client is saved, then the name is stored', async () => {
    expect((await createClient({ name: 'Acme Pipe Co' })).name).toBe('Acme Pipe Co');
  });

  it('given no client name, when the client is saved, then it is rejected', async () => {
    await expectPgError(
      db.insert(clients).values({
        billingAddress: '1 Billing St',
        billingContact: { name: 'Bill', email: 'bill@c.test', phone: '555-0100' },
        shippingContact: { name: 'Ship', email: 'ship@c.test', phone: '555-0101' },
      } as never),
      '23502',
    );
  });
});

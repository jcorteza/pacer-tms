import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { carriers } from '../schema.js';
import { closeDatabase, createCarrier, db, expectPgError, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('carriers', () => {
  it.each(['usdot', 'mc'] as const)(
    'given a %s carrier number, when the carrier is saved, then the number and its type are stored',
    async (carrierNumberType) => {
      const carrier = await createCarrier({ carrierNumber: '998877', carrierNumberType });
      expect(carrier.carrierNumber).toBe('998877');
      expect(carrier.carrierNumberType).toBe(carrierNumberType);
    },
  );

  it('given a carrier number type other than usdot or mc, when saved, then it is rejected', async () => {
    await expectPgError(createCarrier({ carrierNumberType: 'scac' as never }), '23514');
  });

  it('given no carrier number, when a carrier is saved, then it is rejected', async () => {
    await expectPgError(
      db.insert(carriers).values({
        name: 'No Number Freight',
        contactName: 'C',
        contactPhone: '1',
        contactEmail: 'c@c.test',
        carrierNumberType: 'mc',
      } as never),
      '23502',
    );
  });
});

import { sql } from 'drizzle-orm';
import { char, check, integer, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { deletedAt, intId } from './columns.js';
import { items } from './items.js';
import { users } from './users.js';

/** Site, building and location codes are 2–4 chars and unique across all sites. */
const code = () => varchar('code', { length: 4 }).notNull().unique();
const codeIsTwoToFourChars = (table: string, c: { name: string }) =>
  check(`${table}_code_length`, sql`char_length(${sql.identifier(c.name)}) >= 2`);

export const warehouseCodes = pgTable(
  'warehouse_codes',
  {
    id: intId(),
    deletedAt: deletedAt(),
    code: code(),
    managerId: uuid('manager_id')
      .notNull()
      .references(() => users.id),
    phone: text('phone').notNull(),
    address: text('address').notNull(),
    city: text('city').notNull(),
    state: text('state').notNull(),
    zip: text('zip').notNull(),
  },
  (t) => [codeIsTwoToFourChars('warehouse_codes', t.code)],
);

export const buildingCodes = pgTable(
  'building_codes',
  {
    id: intId(),
    deletedAt: deletedAt(),
    code: code(),
    warehouseId: integer('warehouse_id')
      .notNull()
      .references(() => warehouseCodes.id),
    /** The building's letter or number in the site address, separate from the shorthand code. */
    building: char('building', { length: 1 }).notNull(),
    description: text('description'),
  },
  (t) => [codeIsTwoToFourChars('building_codes', t.code)],
);

export const itemLocations = pgTable(
  'item_locations',
  {
    id: intId(),
    deletedAt: deletedAt(),
    code: code(),
    buildingId: integer('building_id')
      .notNull()
      .references(() => buildingCodes.id),
    /** Unique: an item has one location (Decision Log #30). */
    itemId: integer('item_id')
      .unique()
      .references(() => items.id),
    description: text('description'),
  },
  (t) => [codeIsTwoToFourChars('item_locations', t.code)],
);

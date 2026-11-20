import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { ROLES, type Role } from '../../users/roles.js';
import { hashPassword } from '../../users/password.js';
import type { Tx } from '../db.js';
import { buildingCodes, itemLocations, users, warehouseCodes } from '../schema.js';

export const DEMO_USER_EMAIL = 'demo@larkspurfreight.test';

type Person = { first: string; last: string; roles: Role[] };

const STAFF: Person[] = [
  { first: 'Marcus', last: 'Webb', roles: ['Operations Management'] },
  { first: 'Priya', last: 'Nair', roles: ['Warehouse Management'] },
  { first: 'Gareth', last: 'Lindqvist', roles: ['Warehouse Management'] },
  { first: 'Dana', last: 'Kowalski', roles: ['Dispatcher'] },
  { first: 'Luis', last: 'Ortega', roles: ['Accounting Operations'] },
  { first: 'Hannah', last: 'Cho', roles: ['Accounting Management'] },
  { first: 'Tessa', last: 'Ruiz', roles: ['Customer Service'] },
  { first: 'Omar', last: 'Haddad', roles: ['Customer Service'] },
  ...[
    ['Ben', 'Carter'], ['Alina', 'Petrov'], ['Jamal', 'Brooks'], ['Sofia', 'Marin'], ['Kenji', 'Tanaka'],
    ['Rosa', 'Delgado'], ['Evan', 'Holt'], ['Mei', 'Lin'], ['Tobias', 'Reed'], ['Nadia', 'Farouk'],
  ].map(([first, last]): Person => ({ first, last, roles: ['Warehouse'] })),
  { first: 'Demo', last: 'User', roles: [...ROLES] },
];

const email = ({ first, last, roles }: Person) =>
  roles.length === ROLES.length ? DEMO_USER_EMAIL : `${first}.${last}@larkspurfreight.test`.toLowerCase();

/** A hash of a password nobody ever sees: seeded users can't be logged into. */
const unknowablePasswordHash = () => hashPassword(randomBytes(24).toString('hex'));

export async function seedUsers(tx: Tx) {
  const rows = await Promise.all(
    STAFF.map(async (p) => ({
      firstName: p.first,
      lastName: p.last,
      email: email(p),
      roles: p.roles,
      passwordHash: await unknowablePasswordHash(),
    })),
  );
  const all = await tx.insert(users).values(rows).returning();
  const withRole = (role: Role) => all.filter((u) => u.roles.length === 1 && u.roles[0] === role);
  return {
    all,
    demo: all.find((u) => u.email === DEMO_USER_EMAIL)!,
    /** One per site, in the same order as SITES. */
    warehouseManagers: withRole('Warehouse Management'),
    dispatcher: withRole('Dispatcher')[0],
    customerService: withRole('Customer Service'),
    warehouseStaff: withRole('Warehouse'),
  };
}

/** Site A has a single building; site B has three, so the UI can show both layouts. */
const SITES = [
  {
    code: 'RNO1', phone: '775-555-0141', address: '1200 Depot Way', city: 'Reno', state: 'NV', zip: '89502',
    buildings: [
      { code: 'RN1A', building: 'A', description: 'Main building', locations: ['A101', 'A102', 'A103', 'A104', 'A105', 'A106', 'A107', 'A108'] },
    ],
  },
  {
    code: 'SLC1', phone: '801-555-0172', address: '455 Rail Spur Rd', city: 'Salt Lake City', state: 'UT', zip: '84104',
    buildings: [
      { code: 'SL1A', building: 'A', description: 'Cold storage', locations: ['B101', 'B102', 'B103', 'B104'] },
      { code: 'SL1B', building: 'B', description: 'General goods', locations: ['B201', 'B202', 'B203', 'B204'] },
      { code: 'SL1C', building: 'C', description: 'Cross-dock', locations: ['C101', 'C102', 'C103', 'C104'] },
    ],
  },
];

/** `managers[i]` runs `SITES[i]`. */
export async function seedWarehouses(tx: Tx, managers: { id: string }[]) {
  const warehouses = await tx
    .insert(warehouseCodes)
    .values(SITES.map(({ buildings: _b, ...site }, i) => ({ ...site, managerId: managers[i].id })))
    .returning();

  const buildings = [];
  const locations = [];
  for (const [i, site] of SITES.entries()) {
    const warehouse = warehouses[i];
    const inserted = await tx
      .insert(buildingCodes)
      .values(site.buildings.map(({ locations: _l, ...b }) => ({ ...b, warehouseId: warehouse.id })))
      .returning();
    buildings.push(...inserted.map((b) => ({ ...b, warehouse })));
    for (const [j, building] of inserted.entries()) {
      const rows = site.buildings[j].locations.map((code) => ({ code, buildingId: building.id }));
      locations.push(...(await tx.insert(itemLocations).values(rows).returning()));
    }
  }
  return { warehouses, buildings, locations };
}

/** Each item gets one location; there are a few spare. */
export async function assignItemLocations(tx: Tx, itemIds: number[], locations: { id: number }[]) {
  for (const [i, itemId] of itemIds.entries()) {
    await tx.update(itemLocations).set({ itemId }).where(eq(itemLocations.id, locations[i].id));
  }
}

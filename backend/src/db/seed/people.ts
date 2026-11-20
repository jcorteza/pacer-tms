import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { nextCode } from '../../common/codes.js';
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
    name: 'Reno Distribution Center', phone: '775-555-0141', address: '1200 Depot Way', city: 'Reno', state: 'NV', zip: '89502',
    buildings: [{ name: 'Main building', type: 'storage' as const, locations: 8 }],
  },
  {
    name: 'Salt Lake Cross-Dock', phone: '801-555-0172', address: '455 Rail Spur Rd', city: 'Salt Lake City', state: 'UT', zip: '84104',
    buildings: [
      { name: 'Cold storage', type: 'storage' as const, locations: 4 },
      { name: 'General goods', type: 'storage' as const, locations: 4 },
      { name: 'Cross-dock', type: 'transport' as const, locations: 4 },
    ],
  },
];

/** `managers[i]` runs `SITES[i]`. Codes follow the same A1, A2, ... sequence the API generates. */
export async function seedWarehouses(tx: Tx, managers: { id: string }[]) {
  const nextSiteCode = codeSequence();
  const nextBuildingCode = codeSequence();
  const nextLocationCode = codeSequence();

  const warehouses = await tx
    .insert(warehouseCodes)
    .values(SITES.map(({ buildings: _b, ...site }, i) => ({ ...site, code: nextSiteCode(), managerId: managers[i].id })))
    .returning();

  const buildings = [];
  const locations = [];
  for (const [i, site] of SITES.entries()) {
    const warehouse = warehouses[i];
    const inserted = await tx
      .insert(buildingCodes)
      .values(site.buildings.map(({ locations: _l, ...b }) => ({ ...b, code: nextBuildingCode(), warehouseId: warehouse.id })))
      .returning();
    buildings.push(...inserted.map((b) => ({ ...b, warehouse })));
    for (const [j, building] of inserted.entries()) {
      const rows = Array.from({ length: site.buildings[j].locations }, () => ({ code: nextLocationCode(), buildingId: building.id }));
      locations.push(...(await tx.insert(itemLocations).values(rows).returning()));
    }
  }
  return { warehouses, buildings, locations };
}

/** A counter that hands out A1, A2, ... one per call. */
function codeSequence() {
  let last: string | undefined;
  return () => (last = nextCode(last));
}

/** Each item gets one location; there are a few spare. */
export async function assignItemLocations(tx: Tx, itemIds: number[], locations: { id: number }[]) {
  for (const [i, itemId] of itemIds.entries()) {
    await tx.update(itemLocations).set({ itemId }).where(eq(itemLocations.id, locations[i].id));
  }
}

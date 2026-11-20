/** Rows shaped like the backend's responses. */

export const dana = {
  id: '6f1c2f0e-8f3b-4d57-9a38-3f1d2f9a0c11',
  firstName: 'Dana',
  lastName: 'Whitfield',
  email: 'dana.whitfield@larkspurfreight.test',
  roles: ['Dispatcher'],
}

export const session = {
  id: '0a7a2c64-3b1f-4c0e-8a55-0d9f3d2b7e10',
  userId: dana.id,
  expiresAt: '2099-01-01T00:00:00.000Z',
  user: dana,
}

export const managers = [
  { id: 'u-priya', firstName: 'Priya', lastName: 'Nair', email: 'priya@larkspurfreight.test', roles: ['Warehouse Management'] },
  { id: 'u-gareth', firstName: 'Gareth', lastName: 'Lindqvist', email: 'gareth@larkspurfreight.test', roles: ['Warehouse Management'] },
]

export const sites = [
  { id: 1, code: 'A1', name: 'Central DC', address: '1200 Industrial Pkwy', city: 'Columbus', state: 'OH', zip: '43228', phone: '614-555-0100', managerId: 'u-priya' },
  { id: 2, code: 'A2', name: 'Northgate Depot', address: '88 Harbor Rd', city: 'Cleveland', state: 'OH', zip: '44113', phone: '216-555-0111', managerId: 'u-gareth' },
]

export const buildings = [
  { id: 1, code: 'A1', warehouseId: 1, name: 'Building A', type: 'storage', building: null, description: null },
  { id: 2, code: 'A2', warehouseId: 1, name: 'Building B', type: 'storage', building: null, description: null },
  { id: 3, code: 'A3', warehouseId: 1, name: 'Building C', type: 'transport', building: null, description: null },
  { id: 4, code: 'A4', warehouseId: 2, name: 'Main building', type: 'storage', building: null, description: null },
]

export const clients = [
  { id: 'c-summit', name: 'Summit Outdoor Supply' },
  { id: 'c-harbor', name: 'Harbor & Pine Furniture' },
]

const dims = { weightLbs: '8.50', lengthIn: '24.00', widthIn: '8.00', heightIn: '8.00', cost: '89.00', stock: 40, description: null }
export const items = [
  { id: 1, clientId: 'c-summit', sku: 'SUM-100', name: 'Alpine 2-Person Tent', ...dims },
  { id: 2, clientId: 'c-summit', sku: 'SUM-101', name: 'Trail Backpack 45L', ...dims },
  { id: 3, clientId: 'c-harbor', sku: 'HAR-100', name: 'Oak Dining Table', ...dims },
]

/** Item 1 is in Building A, item 2 in Main building, item 3 has none; location 3 is free. */
export const itemLocations = [
  { id: 1, code: 'A1', buildingId: 1, itemId: 1, description: 'Aisle 4 · Rack C · Shelf 2' },
  { id: 2, code: 'A2', buildingId: 4, itemId: 2, description: 'Aisle 2 · Rack F · Shelf 3' },
  { id: 3, code: 'A3', buildingId: 2, itemId: null, description: 'Aisle 1 · Rack A · Shelf 1' },
]

import type { Tx } from '../db.js';
import { clients, items, shippingAddresses } from '../schema.js';

const contact = (name: string, domain: string, phone: string) => ({
  name,
  email: `${name.split(' ')[0].toLowerCase()}@${domain}`,
  phone,
});

type ItemSeed = { name: string; description: string; weightLbs: string; lengthIn: string; widthIn: string; heightIn: string; cost: string };

const CLIENTS = [
  {
    name: 'Summit Outdoor Supply', domain: 'summitoutdoor.test', billingAddress: '310 Bannock St, Boise, ID 83702',
    billing: ['Carla Mendez', '208-555-0111'], shipping: ['Reid Parker', '208-555-0112'],
    addresses: [['Boise Retail Store', '310 Bannock St', 'Boise', 'ID', '83702'], ['Spokane Outlet', '88 Division St', 'Spokane', 'WA', '99202']],
    items: [
      { name: 'Alpine 2-Person Tent', description: 'Three-season backpacking tent', weightLbs: '8.50', lengthIn: '24.00', widthIn: '8.00', heightIn: '8.00', cost: '89.00' },
      { name: 'Trail Backpack 45L', description: 'Ventilated frame pack', weightLbs: '3.20', lengthIn: '22.00', widthIn: '12.00', heightIn: '10.00', cost: '64.00' },
      { name: 'Insulated Water Bottle', description: '32oz stainless steel', weightLbs: '1.10', lengthIn: '11.00', widthIn: '4.00', heightIn: '4.00', cost: '9.50' },
      { name: 'Camp Stove', description: 'Two-burner propane stove', weightLbs: '11.00', lengthIn: '24.00', widthIn: '14.00', heightIn: '5.00', cost: '48.00' },
    ],
  },
  {
    name: 'Harbor & Pine Furniture', domain: 'harborpine.test', billingAddress: '75 NW Front Ave, Portland, OR 97209',
    billing: ['Ingrid Larsen', '503-555-0121'], shipping: ['Tom Becker', '503-555-0122'],
    addresses: [['Portland Showroom', '75 NW Front Ave', 'Portland', 'OR', '97209'], ['Bend Showroom', '210 NE Greenwood Ave', 'Bend', 'OR', '97701']],
    items: [
      { name: 'Oak Dining Table', description: '72in solid oak, flat-pack', weightLbs: '95.00', lengthIn: '76.00', widthIn: '40.00', heightIn: '8.00', cost: '410.00' },
      { name: 'Dining Chair (set of 4)', description: 'Matching oak chairs', weightLbs: '48.00', lengthIn: '40.00', widthIn: '22.00', heightIn: '20.00', cost: '220.00' },
      { name: 'Pine Bookshelf', description: 'Five-shelf, flat-pack', weightLbs: '54.00', lengthIn: '74.00', widthIn: '14.00', heightIn: '6.00', cost: '135.00' },
      { name: 'Walnut Side Table', description: 'Assembled', weightLbs: '22.00', lengthIn: '22.00', widthIn: '22.00', heightIn: '24.00', cost: '98.00' },
    ],
  },
  {
    name: 'Cascade Ceramics', domain: 'cascadeceramics.test', billingAddress: '1402 Western Ave, Seattle, WA 98101',
    billing: ['Yuki Sato', '206-555-0131'], shipping: ['Marta Quinn', '206-555-0132'],
    addresses: [['Seattle Studio', '1402 Western Ave', 'Seattle', 'WA', '98101'], ['Tacoma Market Stall', '9 Pacific Ave', 'Tacoma', 'WA', '98402']],
    items: [
      { name: 'Stoneware Mug Case', description: '24 mugs, padded', weightLbs: '28.00', lengthIn: '20.00', widthIn: '14.00', heightIn: '12.00', cost: '120.00' },
      { name: 'Serving Platter Crate', description: '6 large platters', weightLbs: '34.00', lengthIn: '24.00', widthIn: '18.00', heightIn: '10.00', cost: '168.00' },
      { name: 'Glazed Vase Set', description: '3 vases, boxed', weightLbs: '16.00', lengthIn: '18.00', widthIn: '12.00', heightIn: '14.00', cost: '75.00' },
      { name: 'Dinner Plate Stack', description: '12 plates', weightLbs: '26.00', lengthIn: '14.00', widthIn: '14.00', heightIn: '12.00', cost: '96.00' },
    ],
  },
  {
    name: 'Redwood Hardware Co.', domain: 'redwoodhardware.test', billingAddress: '2201 Del Paso Blvd, Sacramento, CA 95815',
    billing: ['Walt Jensen', '916-555-0141'], shipping: ['Lena Ortiz', '916-555-0142'],
    addresses: [['Sacramento Warehouse', '2201 Del Paso Blvd', 'Sacramento', 'CA', '95815'], ['Fresno Branch', '640 E Olive Ave', 'Fresno', 'CA', '93728']],
    items: [
      { name: 'Cordless Drill Kit', description: '18V with two batteries', weightLbs: '7.50', lengthIn: '16.00', widthIn: '12.00', heightIn: '5.00', cost: '79.00' },
      { name: 'Socket Set 120pc', description: 'Metric and SAE, case', weightLbs: '14.00', lengthIn: '18.00', widthIn: '12.00', heightIn: '4.00', cost: '58.00' },
      { name: 'Steel Pipe 10ft', description: 'Schedule 40 steel pipe', weightLbs: '25.00', lengthIn: '120.00', widthIn: '4.00', heightIn: '4.00', cost: '40.00' },
      { name: 'Hex Bolt Assortment', description: '500-piece bin', weightLbs: '9.00', lengthIn: '14.00', widthIn: '10.00', heightIn: '6.00', cost: '22.00' },
    ],
  },
  {
    name: 'Mesa Verde Foods', domain: 'mesaverdefoods.test', billingAddress: '900 S 7th Ave, Phoenix, AZ 85007',
    billing: ['Elena Torres', '602-555-0151'], shipping: ['Gabe Navarro', '602-555-0152'],
    addresses: [['Phoenix Distribution', '900 S 7th Ave', 'Phoenix', 'AZ', '85007'], ['Tucson Grocer', '44 E Congress St', 'Tucson', 'AZ', '85701']],
    items: [
      { name: 'Salsa Case (12 jars)', description: 'Medium, 16oz jars', weightLbs: '22.00', lengthIn: '16.00', widthIn: '12.00', heightIn: '8.00', cost: '38.00' },
      { name: 'Tortilla Chips Layer', description: 'One pallet layer, 40 bags', weightLbs: '30.00', lengthIn: '40.00', widthIn: '24.00', heightIn: '20.00', cost: '64.00' },
      { name: 'Hot Sauce Variety Pack', description: '24 bottles, 3 flavors', weightLbs: '18.00', lengthIn: '15.00', widthIn: '11.00', heightIn: '9.00', cost: '52.00' },
    ],
  },
] satisfies {
  name: string; domain: string; billingAddress: string; billing: string[]; shipping: string[];
  addresses: string[][]; items: ItemSeed[];
}[];

export async function seedCustomers(tx: Tx) {
  const insertedClients = await tx
    .insert(clients)
    .values(
      CLIENTS.map((c) => ({
        name: c.name,
        billingAddress: c.billingAddress,
        billingContact: contact(c.billing[0], c.domain, c.billing[1]),
        shippingContact: contact(c.shipping[0], c.domain, c.shipping[1]),
      })),
    )
    .returning();

  const addressRows = CLIENTS.flatMap((c, i) =>
    c.addresses.map(([nickname, address, city, state, zip]) => ({ clientId: insertedClients[i].id, nickname, address, city, state, zip })),
  );
  const addresses = await tx.insert(shippingAddresses).values(addressRows).returning();

  const itemRows = CLIENTS.flatMap((c, i) =>
    c.items.map((item, n) => ({ ...item, clientId: insertedClients[i].id, sku: `${c.name.slice(0, 3).toUpperCase()}-${100 + n}`, stock: 40 + n * 25 })),
  );
  const insertedItems = await tx.insert(items).values(itemRows).returning();

  return { clients: insertedClients, addresses, items: insertedItems };
}

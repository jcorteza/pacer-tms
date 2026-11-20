/** The one list of user roles; schemas, validation and tests all import it from here. */
export const ROLES = [
  'Operations Management',
  'Warehouse Management',
  'Warehouse',
  'Dispatcher',
  'Customer Service',
  'Accounting Operations',
  'Accounting Management',
] as const;

export type Role = (typeof ROLES)[number];

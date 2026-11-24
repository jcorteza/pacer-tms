import type { Role } from '../users/roles.js';

/** The Configuration page's resources: sites, buildings, items and item locations are edited by warehouse and operations management. */
export const CONFIGURATION_WRITERS: readonly Role[] = ['Warehouse Management', 'Operations Management'];

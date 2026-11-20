import { z } from 'zod';
import { pageQuery } from '../common/crud/crud.schemas.js';
import { ROLES } from './roles.js';

const role = z.enum(ROLES);
const password = z.string().min(8);
const hasFields = (body: object) => Object.keys(body).length > 0;

export const createUserBody = z.strictObject({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  password,
  roles: z.array(role).min(1),
});

/** Profile fields only: passwords go through their own endpoint, roles through theirs. */
export const updateUserBody = z
  .strictObject({ firstName: z.string().min(1), lastName: z.string().min(1), email: z.email() })
  .partial()
  .refine(hasFields, 'Provide at least one field to update');

export const changePasswordBody = z.strictObject({ currentPassword: z.string().min(1), newPassword: password });

export const settingsBody = z.record(z.string(), z.unknown());

export const addRoleBody = z.strictObject({ role });

export const roleParam = role;

/** `?page=` plus an optional `?role=` that keeps only users holding that role. */
export const listUsersQuery = pageQuery.extend({ role: role.optional() });

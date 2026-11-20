const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** Dates are relative to the moment of seeding, so "late" and "overdue" stay true whenever you run it. */
export const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * DAY);
export const daysAhead = (now: Date, days: number) => new Date(now.getTime() + days * DAY);
export const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * HOUR);
export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY);

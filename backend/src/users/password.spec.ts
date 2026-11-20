import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('never stores the plain password', async () => {
    const hash = await hashPassword('correct horse');

    expect(hash).not.toContain('correct horse');
  });

  it('given the right password, verifies', async () => {
    const hash = await hashPassword('correct horse');

    expect(await verifyPassword('correct horse', hash)).toBe(true);
  });

  it('given the wrong password, rejects', async () => {
    const hash = await hashPassword('correct horse');

    expect(await verifyPassword('battery staple', hash)).toBe(false);
  });

  it('salts, so the same password hashes differently each time', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });
});

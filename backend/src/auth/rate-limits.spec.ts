import { defaultLimit } from './rate-limits.js';

describe('defaultLimit', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([undefined, '', '   '])('given RATE_LIMIT_DEFAULT is unset or empty (%j), allows 150', (value) => {
    vi.stubEnv('RATE_LIMIT_DEFAULT', value);

    expect(defaultLimit()).toBe(150);
  });

  it('given a positive whole number, uses it', () => {
    vi.stubEnv('RATE_LIMIT_DEFAULT', '25');

    expect(defaultLimit()).toBe(25);
  });

  it.each(['0', '-5', '1.5', 'many'])('given %j, refuses to start', (value) => {
    vi.stubEnv('RATE_LIMIT_DEFAULT', value);

    expect(() => defaultLimit()).toThrow('RATE_LIMIT_DEFAULT');
  });
});

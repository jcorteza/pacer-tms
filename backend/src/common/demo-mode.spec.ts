import { isDemoMode } from './demo-mode.js';

afterEach(() => vi.unstubAllEnvs());

describe('isDemoMode', () => {
  it('given DEMO_MODE=true, is on', () => {
    vi.stubEnv('DEMO_MODE', 'true');
    expect(isDemoMode()).toBe(true);
  });

  it.each(['false', '', '1', 'yes', 'TRUE'])('given DEMO_MODE=%j, is off', (value) => {
    vi.stubEnv('DEMO_MODE', value);
    expect(isDemoMode()).toBe(false);
  });

  it('given DEMO_MODE is not set, is off', () => {
    vi.stubEnv('DEMO_MODE', undefined);
    expect(isDemoMode()).toBe(false);
  });
});

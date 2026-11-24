import { throttleTracker } from './throttle-tracker.js';

describe('throttleTracker', () => {
  it('given a signed-in request, tracks the user', () => {
    expect(throttleTracker({ userId: 'user-1', ip: '10.0.0.5' })).toBe('user:user-1');
  });

  it('given a signed-in request whose body also has an email, the user wins', () => {
    expect(throttleTracker({ userId: 'user-1', body: { email: 'new@larkspur.test' } })).toBe('user:user-1');
  });

  it('given a login body, tracks the email whatever its letter case or surrounding spaces', () => {
    const tracked = throttleTracker({ body: { email: 'Ada@Larkspur.test', password: 'x' } });

    expect(throttleTracker({ body: { email: '  ada@larkspur.test ' } })).toBe(tracked);
    expect(tracked).toBe('email:ada@larkspur.test');
  });

  it.each([undefined, null, {}, { email: 42 }, { email: '' }, 'not an object'])(
    'given a body without a usable email (%j), falls back to the IP',
    (body) => {
      expect(throttleTracker({ body, ip: '10.0.0.5' })).toBe('ip:10.0.0.5');
    },
  );
});

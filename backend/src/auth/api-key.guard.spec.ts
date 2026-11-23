import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { API_KEY_HEADER, ApiKeyGuard } from './api-key.guard.js';

const contextWith = (headers: Record<string, string>) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as ExecutionContext;

beforeEach(() => vi.stubEnv('API_KEY', 'right-key'));
afterEach(() => vi.unstubAllEnvs());

describe('ApiKeyGuard', () => {
  it('given the right key, lets the request through', () => {
    const guard = new ApiKeyGuard();

    expect(guard.canActivate(contextWith({ [API_KEY_HEADER]: 'right-key' }))).toBe(true);
  });

  it('given a wrong key, rejects with 401', () => {
    const guard = new ApiKeyGuard();

    expect(() => guard.canActivate(contextWith({ [API_KEY_HEADER]: 'wrong-key' }))).toThrow(UnauthorizedException);
  });

  it('given no key, rejects with 401', () => {
    const guard = new ApiKeyGuard();

    expect(() => guard.canActivate(contextWith({}))).toThrow(UnauthorizedException);
  });

  it.each([undefined, ''])('given API_KEY is %j, refuses to be created so the app cannot start open', (value) => {
    vi.stubEnv('API_KEY', value);

    expect(() => new ApiKeyGuard()).toThrow(/API_KEY/);
  });
});

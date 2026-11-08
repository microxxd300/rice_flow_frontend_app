import { checkResetEmail, cleanCode, firstError, resetFailureKey } from '@/utils/passwordReset';

describe('checkResetEmail', () => {
  it('accepts a real email', () => {
    expect(checkResetEmail(' juan@gmail.com ')).toBe('ok');
  });

  it('sends plain names and georice.app accounts to the agriculturist', () => {
    expect(checkResetEmail('juanfarm')).toBe('no-inbox');
    expect(checkResetEmail('Juan@GeoRice.app')).toBe('no-inbox');
  });

  it('refuses an empty or broken email', () => {
    expect(checkResetEmail('   ')).toBe('invalid');
    expect(checkResetEmail('juan@gmail')).toBe('invalid');
  });
});

describe('cleanCode', () => {
  it('keeps only the first six digits', () => {
    expect(cleanCode('12 34-56789')).toBe('123456');
  });
});

describe('resetFailureKey', () => {
  it('tells apart offline, rate limited and other failures', () => {
    expect(resetFailureKey(new Error('network'))).toBe('fpOffline');
    expect(resetFailureKey({ response: { status: 429 } })).toBe('fpTooMany');
    expect(resetFailureKey({ response: { status: 500 } })).toBe('fpFailed');
  });
});

describe('firstError', () => {
  it('reads Django REST error lists and plain strings', () => {
    expect(firstError(['Too common.', 'Too short.'])).toBe('Too common.');
    expect(firstError('Bad.')).toBe('Bad.');
    expect(firstError(undefined)).toBeUndefined();
  });
});

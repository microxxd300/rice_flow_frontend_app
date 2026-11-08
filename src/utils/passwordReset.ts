const EMAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Older and staff-made accounts can be name@georice.app, and that address has no inbox
const NO_INBOX_DOMAIN = '@georice.app';

export const CODE_LENGTH = 6;
export const RESEND_WAIT_SECONDS = 60;
export const MIN_PASSWORD_LENGTH = 8;

export type ResetEmailCheck = 'ok' | 'invalid' | 'no-inbox';

export const checkResetEmail = (value: string): ResetEmailCheck => {
  const email = value.trim().toLowerCase();
  if (!email) return 'invalid';
  if (!email.includes('@') || email.endsWith(NO_INBOX_DOMAIN)) return 'no-inbox';
  return EMAIL_FORMAT.test(email) ? 'ok' : 'invalid';
};

export const cleanCode = (value: string): string => value.replace(/\D/g, '').slice(0, CODE_LENGTH);

/** The translation key for a request that failed before the server could judge the input. */
export const resetFailureKey = (err: any): 'fpOffline' | 'fpTooMany' | 'fpFailed' => {
  if (!err?.response) return 'fpOffline';
  return err.response.status === 429 ? 'fpTooMany' : 'fpFailed';
};

/** The first message for a field in a Django REST error, if there is one. */
export const firstError = (value: unknown): string | undefined => {
  const first = Array.isArray(value) ? value[0] : value;
  return first ? String(first) : undefined;
};

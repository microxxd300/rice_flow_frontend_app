/** Sign-up takes Gmail only: forgot-password codes need an inbox the farmer can open. */
export const isGmailAddress = (value: string): boolean =>
  /^[^@\s]+@(gmail|googlemail)\.com$/i.test(value.trim());

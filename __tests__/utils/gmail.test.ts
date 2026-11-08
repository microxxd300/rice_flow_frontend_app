import { isGmailAddress } from '@/utils/gmail';

describe('isGmailAddress', () => {
  it('accepts Gmail addresses, with capitals or stray spaces', () => {
    expect(isGmailAddress('juan@gmail.com')).toBe(true);
    expect(isGmailAddress(' Juan@GMAIL.com ')).toBe(true);
    expect(isGmailAddress('juan@googlemail.com')).toBe(true);
  });

  it('refuses everything else', () => {
    expect(isGmailAddress('juanfarm')).toBe(false);
    expect(isGmailAddress('juan@yahoo.com')).toBe(false);
    expect(isGmailAddress('juan@gmail.com.ph')).toBe(false);
    expect(isGmailAddress('juan@notgmail.com')).toBe(false);
    expect(isGmailAddress('')).toBe(false);
  });
});

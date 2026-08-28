import { todayInAppTimezone } from './clock';

describe('todayInAppTimezone', () => {
  const originalTimezone = process.env.APP_TIMEZONE;

  beforeEach(() => {
    process.env.APP_TIMEZONE = 'America/Bogota';
  });

  afterAll(() => {
    process.env.APP_TIMEZONE = originalTimezone;
  });

  it('returns an ISO YYYY-MM-DD date', () => {
    expect(todayInAppTimezone()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('late-night UTC is still the previous day in Bogota (UTC-5)', () => {
    // 03:00 UTC on Aug 28 is 22:00 on Aug 27 in Bogota
    expect(todayInAppTimezone(new Date('2026-08-28T03:00:00Z'))).toBe(
      '2026-08-27',
    );
  });

  it('early morning in Bogota is already the same day as UTC', () => {
    // 12:00 UTC on Aug 28 is 07:00 on Aug 28 in Bogota
    expect(todayInAppTimezone(new Date('2026-08-28T12:00:00Z'))).toBe(
      '2026-08-28',
    );
  });

  it('fails loudly when APP_TIMEZONE is not configured', () => {
    delete process.env.APP_TIMEZONE;
    expect(() => todayInAppTimezone()).toThrow('APP_TIMEZONE');
  });
});

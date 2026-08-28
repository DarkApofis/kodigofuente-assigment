// Single source of truth for "today" in business logic.
// No other file may call `new Date()` to make business decisions.

// 'en-CA' formats dates as YYYY-MM-DD, which compares correctly as a string
const ISO_DATE_LOCALE = 'en-CA';

export function todayInAppTimezone(now: Date = new Date()): string {
  const timeZone = process.env.APP_TIMEZONE;
  if (!timeZone) {
    throw new Error('Missing required environment variable: APP_TIMEZONE');
  }
  return new Intl.DateTimeFormat(ISO_DATE_LOCALE, {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

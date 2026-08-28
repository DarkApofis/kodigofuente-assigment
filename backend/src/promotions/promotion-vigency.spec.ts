import { PromotionStatus } from './promotion.enums';
import { isActiveOn } from './promotion-vigency';

const { SCHEDULED, ACTIVE, ENDED } = PromotionStatus;

function promotion(
  status: PromotionStatus,
  startDate = '2026-08-01',
  endDate = '2026-08-31',
) {
  return { status, startDate, endDate };
}

describe('promotion vigency (derived "vigente" field)', () => {
  describe('date range borders, inclusive on both ends', () => {
    it('an active promotion is in force on its start date', () => {
      expect(isActiveOn(promotion(ACTIVE), '2026-08-01')).toBe(true);
    });

    it('an active promotion is in force on its end date', () => {
      expect(isActiveOn(promotion(ACTIVE), '2026-08-31')).toBe(true);
    });

    it('an active promotion is in force on a day inside the range', () => {
      expect(isActiveOn(promotion(ACTIVE), '2026-08-15')).toBe(true);
    });

    it('an active promotion is not in force the day before it starts', () => {
      expect(isActiveOn(promotion(ACTIVE), '2026-07-31')).toBe(false);
    });

    it('an active promotion is not in force the day after it ends', () => {
      expect(isActiveOn(promotion(ACTIVE), '2026-09-01')).toBe(false);
    });
  });

  it('an ACTIVE promotion whose date range already passed is not in force today', () => {
    const expired = promotion(ACTIVE, '2026-01-01', '2026-01-31');
    expect(isActiveOn(expired, '2026-08-27')).toBe(false);
  });

  it('a scheduled promotion is never in force, even inside its date range', () => {
    expect(isActiveOn(promotion(SCHEDULED), '2026-08-15')).toBe(false);
  });

  it('an ended promotion is never in force, even inside its date range', () => {
    expect(isActiveOn(promotion(ENDED), '2026-08-15')).toBe(false);
  });
});

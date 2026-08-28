import { PromotionStatus } from './promotion.enums';
import { canTransition } from './promotion-status.machine';

const { SCHEDULED, ACTIVE, ENDED } = PromotionStatus;

describe('promotion status machine', () => {
  describe('valid transitions', () => {
    it('a scheduled promotion can be activated', () => {
      expect(canTransition(SCHEDULED, ACTIVE)).toBe(true);
    });

    it('an active promotion can be ended', () => {
      expect(canTransition(ACTIVE, ENDED)).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    it('a promotion cannot skip activation and go straight from scheduled to ended', () => {
      expect(canTransition(SCHEDULED, ENDED)).toBe(false);
    });

    it('an active promotion cannot go back to scheduled', () => {
      expect(canTransition(ACTIVE, SCHEDULED)).toBe(false);
    });

    it('an ended promotion cannot be reactivated', () => {
      expect(canTransition(ENDED, ACTIVE)).toBe(false);
    });

    it('an ended promotion cannot go back to scheduled', () => {
      expect(canTransition(ENDED, SCHEDULED)).toBe(false);
    });

    it.each([SCHEDULED, ACTIVE, ENDED])(
      'staying in the same status (%s) is not a transition',
      (status) => {
        expect(canTransition(status, status)).toBe(false);
      },
    );
  });

  it('the whole state space allows exactly the two documented transitions', () => {
    const statuses = Object.values(PromotionStatus);
    const allowed = statuses.flatMap((from) =>
      statuses
        .filter((to) => canTransition(from, to))
        .map((to) => `${from} -> ${to}`),
    );
    expect(allowed.sort()).toEqual(['ACTIVE -> ENDED', 'SCHEDULED -> ACTIVE']);
  });
});

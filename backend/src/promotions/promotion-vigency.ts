import { PromotionStatus } from './promotion.enums';

export interface VigencyInput {
  status: PromotionStatus;
  startDate: string;
  endDate: string;
}

// "Vigente" is derived, never stored: a promotion is in force on a given day
// when it is ACTIVE and the day falls inside [startDate, endDate] (inclusive).
// ISO YYYY-MM-DD strings compare correctly with plain string comparison.
export function isActiveOn(promotion: VigencyInput, isoDate: string): boolean {
  return (
    promotion.status === PromotionStatus.ACTIVE &&
    promotion.startDate <= isoDate &&
    isoDate <= promotion.endDate
  );
}

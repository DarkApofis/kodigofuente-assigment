import { PromotionStatus } from './promotion.enums';

// The status lifecycle is strictly linear and manual:
//   SCHEDULED -> ACTIVE -> ENDED
// No skips, no going back, no self-transitions. ENDED is terminal.
const ALLOWED_TRANSITIONS: Readonly<
  Record<PromotionStatus, readonly PromotionStatus[]>
> = {
  [PromotionStatus.SCHEDULED]: [PromotionStatus.ACTIVE],
  [PromotionStatus.ACTIVE]: [PromotionStatus.ENDED],
  [PromotionStatus.ENDED]: [],
};

export function canTransition(
  from: PromotionStatus,
  to: PromotionStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

import type { PromotionStatus } from '../api/types';
import { STATUS_LABELS } from '../ui/labels';

const BADGE_CLASS: Record<PromotionStatus, string> = {
  SCHEDULED: 'badge badge-scheduled',
  ACTIVE: 'badge badge-active',
  ENDED: 'badge badge-ended',
};

export function StatusBadge({ status }: { status: PromotionStatus }) {
  return <span className={BADGE_CLASS[status]}>{STATUS_LABELS[status]}</span>;
}

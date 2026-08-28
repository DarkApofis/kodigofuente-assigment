import type { PromotionStatus } from '../api/types';
import { STATUS_LABELS } from '../ui/labels';

// Each status pairs its tint with a distinct shape (ring / filled circle /
// square) so the three remain distinguishable without reading color.
const BADGE: Record<PromotionStatus, { badge: string; shape: string }> = {
  SCHEDULED: { badge: 'badge badge-scheduled', shape: 'shape-ring' },
  ACTIVE: { badge: 'badge badge-active', shape: 'shape-dot' },
  ENDED: { badge: 'badge badge-ended', shape: 'shape-square' },
};

export function StatusBadge({ status }: { status: PromotionStatus }) {
  const { badge, shape } = BADGE[status];
  return (
    <span className={badge}>
      <span className={shape} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

import type { DiscountType, Promotion, PromotionStatus } from '../api/types';

// Enums live in English end to end; Spanish only exists here, in the UI layer
export const STATUS_LABELS: Record<PromotionStatus, string> = {
  SCHEDULED: 'Programada',
  ACTIVE: 'Activa',
  ENDED: 'Finalizada',
};

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  PERCENTAGE: 'Porcentaje',
  FIXED_AMOUNT: 'Monto fijo',
};

// Manual, linear lifecycle: SCHEDULED -> ACTIVE -> ENDED. The button always
// names the destination; there is never a skip or a rollback.
export const PROMOTION_ADVANCE: Record<
  PromotionStatus,
  { next: PromotionStatus; label: string } | null
> = {
  SCHEDULED: { next: 'ACTIVE', label: 'Activar' },
  ACTIVE: { next: 'ENDED', label: 'Finalizar' },
  ENDED: null,
};

export const READ_ONLY_LABEL = 'Histórico · solo lectura';

// Why an action is unavailable, written next to the actions (not a tooltip)
export const ACTION_BLOCKED_REASONS: Record<PromotionStatus, string | null> = {
  SCHEDULED: null,
  ACTIVE: 'No se puede eliminar: solo se eliminan promociones Programadas.',
  ENDED: 'Una promoción Finalizada no se modifica ni se elimina.',
};

export function formatDiscount(promotion: Promotion): string {
  return promotion.discountType === 'PERCENTAGE'
    ? `${promotion.discountValue}%`
    : `$${promotion.discountValue.toLocaleString('es-CO')}`;
}

const MONTHS_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

// 'YYYY-MM-DD' -> '28 ago 2026' without Date objects (timezone-safe)
export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day} ${MONTHS_ES[Number(month) - 1]} ${year}`;
}

// '25 ago – 07 sep 2026'; the start year appears only when it differs
export function formatDateRange(startIso: string, endIso: string): string {
  const start = formatShortDate(startIso);
  const end = formatShortDate(endIso);
  return startIso.slice(0, 4) === endIso.slice(0, 4)
    ? `${start.slice(0, -5)} – ${end}`
    : `${start} – ${end}`;
}

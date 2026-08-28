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

// Manual, linear lifecycle: SCHEDULED -> ACTIVE -> ENDED
export const PROMOTION_ADVANCE: Record<
  PromotionStatus,
  { next: PromotionStatus; label: string } | null
> = {
  SCHEDULED: { next: 'ACTIVE', label: 'Activar' },
  ACTIVE: { next: 'ENDED', label: 'Finalizar' },
  ENDED: null,
};

export const ENDED_TOOLTIP =
  'Una promoción finalizada no admite más cambios ni puede eliminarse';

export function formatDiscount(promotion: Promotion): string {
  return promotion.discountType === 'PERCENTAGE'
    ? `${promotion.discountValue}%`
    : `$${promotion.discountValue.toLocaleString('es-CO')}`;
}

// 'YYYY-MM-DD' -> 'DD/MM/YYYY' without Date objects (timezone-safe)
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

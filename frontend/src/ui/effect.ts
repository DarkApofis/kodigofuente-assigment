import type { Promotion } from '../api/types';
import { formatShortDate } from './labels';

// "Effect today" is DERIVED, never stored: status ACTIVE plus today inside
// [startDate, endDate]. The backend's isActiveToday flag is the authority on
// whether the promotion applies; this module only derives the explanatory
// note and the attention signal for an ACTIVE promotion whose dates expired.
export type EffectKind = 'IN_FORCE' | 'NO_EFFECT' | 'NO_EFFECT_ATTENTION';

export interface PromotionEffect {
  kind: EffectKind;
  note: string;
}

// Mirrors the backend's APP_TIMEZONE (America/Bogota) so "today" matches
// what the API used to compute isActiveToday.
const APP_TIMEZONE = 'America/Bogota';

// en-CA formats as YYYY-MM-DD
function isoDateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

export function todayIsoDate(timeZone: string = APP_TIMEZONE): string {
  return isoDateInTimeZone(new Date(), timeZone);
}

const MS_PER_DAY = 86_400_000;

// Both arguments are date-only ISO strings, so UTC parsing is exact
function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / MS_PER_DAY);
}

function days(n: number): string {
  return n === 1 ? '1 día' : `${n} días`;
}

export function promotionEffect(
  promotion: Promotion,
  today: string,
): PromotionEffect {
  const { status, startDate, endDate, isActiveToday } = promotion;

  if (isActiveToday) {
    return {
      kind: 'IN_FORCE',
      note:
        endDate === today
          ? 'Último día'
          : `Termina en ${days(daysBetween(today, endDate))}`,
    };
  }

  if (status === 'ENDED') {
    // A promotion can be ended before its planned end date, so the close date
    // comes from the transition to ENDED (its last write: nothing can change
    // after that), not from endDate.
    const closedOn = promotion.updatedAt
      ? isoDateInTimeZone(new Date(promotion.updatedAt), APP_TIMEZONE)
      : endDate;
    return {
      kind: 'NO_EFFECT',
      note: `Cerrada el ${formatShortDate(closedOn)}`,
    };
  }

  // ACTIVE with expired dates: the operator must end it or extend the range
  if (status === 'ACTIVE' && today > endDate) {
    return {
      kind: 'NO_EFFECT_ATTENTION',
      note: `Venció hace ${days(daysBetween(endDate, today))} y sigue en Activa`,
    };
  }

  if (today < startDate) {
    return {
      kind: 'NO_EFFECT',
      note: `Inicia en ${days(daysBetween(today, startDate))}`,
    };
  }

  if (today > endDate) {
    // SCHEDULED whose range passed without ever being activated
    return {
      kind: 'NO_EFFECT',
      note: `El rango venció el ${formatShortDate(endDate)} sin activarse`,
    };
  }

  // SCHEDULED with today already inside the range
  return {
    kind: 'NO_EFFECT',
    note: 'Las fechas ya empezaron: falta activarla',
  };
}

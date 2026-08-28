import { describe, expect, it } from 'vitest';
import type { Promotion } from '../api/types';
import { promotionEffect } from './effect';

const TODAY = '2026-08-28';

function promotion(overrides: Partial<Promotion>): Promotion {
  return {
    id: 'promo-1',
    name: 'Promo',
    productId: 'p1',
    categoryId: null,
    discountType: 'PERCENTAGE',
    discountValue: 10,
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    isActiveToday: false,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('promotionEffect', () => {
  it('vigente hoy: cuenta los días que faltan para terminar', () => {
    const effect = promotionEffect(
      promotion({ isActiveToday: true, endDate: '2026-09-07' }),
      TODAY,
    );
    expect(effect).toEqual({ kind: 'IN_FORCE', note: 'Termina en 10 días' });
  });

  it('vigente hoy con fin hoy: último día', () => {
    const effect = promotionEffect(
      promotion({ isActiveToday: true, endDate: TODAY }),
      TODAY,
    );
    expect(effect).toEqual({ kind: 'IN_FORCE', note: 'Último día' });
  });

  it('activa con fechas vencidas: requiere atención del operador', () => {
    const effect = promotionEffect(
      promotion({ startDate: '2026-06-29', endDate: '2026-07-29' }),
      TODAY,
    );
    expect(effect).toEqual({
      kind: 'NO_EFFECT_ATTENTION',
      note: 'Venció hace 30 días y sigue en Activa',
    });
  });

  it('activa que aún no inicia: sin efecto, sin alerta', () => {
    const effect = promotionEffect(
      promotion({ startDate: '2026-09-04', endDate: '2026-09-18' }),
      TODAY,
    );
    expect(effect).toEqual({ kind: 'NO_EFFECT', note: 'Inicia en 7 días' });
  });

  it('programada con el rango ya iniciado: falta activarla', () => {
    const effect = promotionEffect(
      promotion({
        status: 'SCHEDULED',
        startDate: TODAY,
        endDate: '2026-08-31',
      }),
      TODAY,
    );
    expect(effect).toEqual({
      kind: 'NO_EFFECT',
      note: 'Las fechas ya empezaron: falta activarla',
    });
  });

  it('programada cuyo rango pasó sin activarse', () => {
    const effect = promotionEffect(
      promotion({
        status: 'SCHEDULED',
        startDate: '2026-08-01',
        endDate: '2026-08-10',
      }),
      TODAY,
    );
    expect(effect).toEqual({
      kind: 'NO_EFFECT',
      note: 'El rango venció el 10 ago 2026 sin activarse',
    });
  });

  it('finalizada: la fecha de cierre sale de la transición a Finalizada', () => {
    const effect = promotionEffect(
      promotion({
        status: 'ENDED',
        startDate: '2026-05-30',
        endDate: '2026-06-04',
        updatedAt: '2026-06-04T21:15:00.000Z',
      }),
      TODAY,
    );
    expect(effect).toEqual({
      kind: 'NO_EFFECT',
      note: 'Cerrada el 04 jun 2026',
    });
  });

  it('finalizada antes de su fecha de fin: cerrada el día del cambio, no el del rango', () => {
    const effect = promotionEffect(
      promotion({
        status: 'ENDED',
        startDate: '2026-08-28',
        endDate: '2026-08-29',
        // 06:01 UTC = 01:01 in America/Bogota, still Aug 28
        updatedAt: '2026-08-28T06:01:37.783Z',
      }),
      TODAY,
    );
    expect(effect).toEqual({
      kind: 'NO_EFFECT',
      note: 'Cerrada el 28 ago 2026',
    });
  });
});

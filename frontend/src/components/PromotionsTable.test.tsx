import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Category, Product, Promotion } from '../api/types';
import { PromotionsTable } from './PromotionsTable';

const products: Product[] = [
  { id: 'p1', name: 'Café americano', categoryId: 'c1', createdAt: '' },
];
const categories: Category[] = [{ id: 'c1', name: 'Bebidas', createdAt: '' }];

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
    status: 'SCHEDULED',
    isActiveToday: false,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderTable(promotions: Promotion[]) {
  render(
    <PromotionsTable
      promotions={promotions}
      products={products}
      categories={categories}
      busyId={null}
      onAdvance={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

function rowOf(name: string): HTMLElement {
  const row = screen.getByText(name).closest('tr');
  if (!row) throw new Error(`Row for "${name}" not found`);
  return row;
}

describe('PromotionsTable', () => {
  it('una promoción activa no muestra el botón Eliminar (solo puede finalizarse)', () => {
    renderTable([
      promotion({ id: '1', name: 'Promo activa', status: 'ACTIVE' }),
    ]);

    const row = rowOf('Promo activa');
    expect(within(row).queryByRole('button', { name: 'Eliminar' })).toBeNull();
    expect(
      within(row).getByRole('button', { name: 'Finalizar' }),
    ).toBeEnabled();
  });

  it('una promoción programada sí puede eliminarse y su acción es Activar', () => {
    renderTable([
      promotion({ id: '2', name: 'Promo programada', status: 'SCHEDULED' }),
    ]);

    const row = rowOf('Promo programada');
    expect(
      within(row).getByRole('button', { name: 'Eliminar' }),
    ).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Activar' })).toBeEnabled();
  });

  it('una promoción finalizada deshabilita avanzar y el tooltip explica por qué', () => {
    renderTable([
      promotion({ id: '3', name: 'Promo finalizada', status: 'ENDED' }),
    ]);

    const row = rowOf('Promo finalizada');
    const advanceButton = within(row).getByRole('button', {
      name: 'Finalizar',
    });
    expect(advanceButton).toBeDisabled();
    expect(advanceButton).toHaveAttribute(
      'title',
      expect.stringContaining('finalizada no admite más cambios'),
    );
    expect(within(row).queryByRole('button', { name: 'Eliminar' })).toBeNull();
  });

  it('una promoción vigente hoy muestra el indicador «Vigente hoy»', () => {
    renderTable([
      promotion({
        id: '4',
        name: 'Promo vigente',
        status: 'ACTIVE',
        isActiveToday: true,
      }),
    ]);

    expect(
      within(rowOf('Promo vigente')).getByText('● Vigente hoy'),
    ).toBeInTheDocument();
  });
});

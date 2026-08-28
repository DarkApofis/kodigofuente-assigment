import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Category, Product, Promotion } from '../api/types';
import { PromotionsTable } from './PromotionsTable';

const TODAY = '2026-08-28';

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
      today={TODAY}
      onAdvance={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onCreate={vi.fn()}
    />,
  );
}

function rowOf(name: string): HTMLElement {
  const row = screen.getByText(name).closest('tr');
  if (!row) throw new Error(`Row for "${name}" not found`);
  return row;
}

describe('PromotionsTable', () => {
  it('una promoción activa no muestra Eliminar y explica el motivo por escrito', () => {
    renderTable([
      promotion({ id: '1', name: 'Promo activa', status: 'ACTIVE' }),
    ]);

    const row = rowOf('Promo activa');
    expect(within(row).queryByRole('button', { name: 'Eliminar' })).toBeNull();
    expect(
      within(row).getByRole('button', { name: 'Finalizar' }),
    ).toBeEnabled();
    expect(within(row).getByRole('button', { name: 'Editar' })).toBeEnabled();
    expect(
      within(row).getByText(
        'No se puede eliminar: solo se eliminan promociones Programadas.',
      ),
    ).toBeInTheDocument();
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

  it('una promoción finalizada es de solo lectura: sin acciones, con etiqueta Histórico', () => {
    renderTable([
      promotion({
        id: '3',
        name: 'Promo finalizada',
        status: 'ENDED',
        endDate: '2026-06-04',
      }),
    ]);

    const row = rowOf('Promo finalizada');
    expect(within(row).queryByRole('button')).toBeNull();
    expect(
      within(row).getByText('Histórico · solo lectura'),
    ).toBeInTheDocument();
    expect(
      within(row).getByText(
        'Una promoción Finalizada no se modifica ni se elimina.',
      ),
    ).toBeInTheDocument();
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
      within(rowOf('Promo vigente')).getByText('Vigente hoy'),
    ).toBeInTheDocument();
  });

  it('una activa con fechas vencidas queda marcada como «Requiere atención»', () => {
    renderTable([
      promotion({
        id: '5',
        name: 'Promo vencida',
        status: 'ACTIVE',
        startDate: '2026-06-29',
        endDate: '2026-07-29',
        isActiveToday: false,
      }),
    ]);

    const row = rowOf('Promo vencida');
    expect(row).toHaveClass('row-attention');
    expect(within(row).getByText('Sin efecto hoy')).toBeInTheDocument();
    expect(within(row).getByText(/Requiere atención/)).toBeInTheDocument();
    expect(
      within(row).getByText('Venció hace 30 días y sigue en Activa'),
    ).toBeInTheDocument();
  });

  it('sin promociones muestra el estado vacío con su llamada a la acción', () => {
    renderTable([]);

    expect(screen.getByText('Todavía no hay promociones')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Crear la primera promoción' }),
    ).toBeInTheDocument();
  });
});

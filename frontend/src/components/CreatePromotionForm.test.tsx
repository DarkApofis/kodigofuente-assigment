import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Category, Product } from '../api/types';
import { CreatePromotionForm } from './CreatePromotionForm';

vi.mock('../api/promotions', () => ({
  createPromotion: vi.fn(),
}));

import { createPromotion } from '../api/promotions';

const products: Product[] = [
  { id: 'p1', name: 'Café americano', categoryId: 'c1', createdAt: '' },
];
const categories: Category[] = [{ id: 'c1', name: 'Bebidas', createdAt: '' }];

function renderForm() {
  render(
    <CreatePromotionForm
      products={products}
      categories={categories}
      onClose={vi.fn()}
      onCreated={vi.fn()}
    />,
  );
}

describe('CreatePromotionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('un porcentaje de 150 no se envía: muestra el error y no llama al API', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Nombre'), 'Promo inválida');
    await user.selectOptions(screen.getByLabelText('Producto'), 'p1');
    await user.type(screen.getByLabelText('Valor del descuento'), '150');
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.change(screen.getByLabelText('Fecha de fin'), {
      target: { value: '2026-09-30' },
    });

    await user.click(screen.getByRole('button', { name: 'Crear promoción' }));

    expect(
      await screen.findByText('El porcentaje debe estar entre 1 y 100'),
    ).toBeInTheDocument();
    expect(createPromotion).not.toHaveBeenCalled();
  });

  it('el sufijo del valor cambia según el tipo de descuento (% a $)', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByText('%')).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText('Tipo de descuento'),
      'FIXED_AMOUNT',
    );
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.queryByText('%')).toBeNull();
  });

  it('cambiar el objetivo a categoría limpia la selección y muestra categorías', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Producto'), 'p1');
    await user.click(screen.getByLabelText('Por categoría'));

    const select = screen.getByLabelText('Categoría');
    expect(select).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Bebidas' })).toBeInTheDocument();
  });
});

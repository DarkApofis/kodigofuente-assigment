import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category, Product } from '../api/types';
import { PromotionFormDialog } from './PromotionFormDialog';

vi.mock('../api/promotions', () => ({
  createPromotion: vi.fn(),
  updatePromotion: vi.fn(),
}));

import { createPromotion } from '../api/promotions';

const products: Product[] = [
  { id: 'p1', name: 'Café americano', categoryId: 'c1', createdAt: '' },
];
const categories: Category[] = [{ id: 'c1', name: 'Bebidas', createdAt: '' }];

function renderForm() {
  render(
    <PromotionFormDialog
      products={products}
      categories={categories}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />,
  );
}

describe('PromotionFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('un porcentaje de 150 no se envía: resumen de errores, mensaje y sin llamada al API', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(
      screen.getByLabelText('Nombre de la promoción'),
      'Promo inválida',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Producto' }),
      'p1',
    );
    await user.type(screen.getByLabelText('Valor del descuento'), '150');
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.change(screen.getByLabelText('Fecha de fin'), {
      target: { value: '2026-09-30' },
    });

    await user.click(screen.getByRole('button', { name: 'Crear promoción' }));

    // Summary alert with a link to the field, plus the message under the field
    expect(
      await screen.findByText('No pudimos guardar: revisa 1 campo'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/El porcentaje debe estar entre 1 y 100/).length,
    ).toBeGreaterThanOrEqual(2);
    expect(createPromotion).not.toHaveBeenCalled();
  });

  it('el sufijo del valor cambia según el tipo de descuento (% a $)', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByText('%')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Monto fijo' }));
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.queryByText('%')).toBeNull();
  });

  it('cambiar el objetivo a categoría habilita su selector y deshabilita el de producto', async () => {
    const user = userEvent.setup();
    renderForm();

    const productSelect = screen.getByRole('combobox', { name: 'Producto' });
    const categorySelect = screen.getByRole('combobox', { name: 'Categoría' });

    // With a product target, the category select is disabled with its reason
    expect(categorySelect).toBeDisabled();
    expect(
      screen.getByText('Categoría — no disponible con objetivo Producto'),
    ).toBeInTheDocument();

    await user.selectOptions(productSelect, 'p1');
    await user.click(screen.getByRole('radio', { name: 'Categoría' }));

    // Switching clears the pick and flips which select is available
    expect(productSelect).toBeDisabled();
    expect(categorySelect).toBeEnabled();
    expect(categorySelect).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Bebidas' })).toBeInTheDocument();
  });
});

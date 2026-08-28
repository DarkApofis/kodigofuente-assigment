import type {
  Category,
  Product,
  Promotion,
  PromotionStatus,
} from '../api/types';
import {
  DISCOUNT_TYPE_LABELS,
  ENDED_TOOLTIP,
  formatDate,
  formatDiscount,
  PROMOTION_ADVANCE,
} from '../ui/labels';
import { StatusBadge } from './StatusBadge';

interface Props {
  promotions: Promotion[];
  products: Product[];
  categories: Category[];
  busyId: string | null;
  onAdvance: (promotion: Promotion, next: PromotionStatus) => void;
  onDelete: (promotion: Promotion) => void;
}

export function PromotionsTable({
  promotions,
  products,
  categories,
  busyId,
  onAdvance,
  onDelete,
}: Props) {
  const productNames = new Map(products.map((p) => [p.id, p.name]));
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  function targetLabel(promotion: Promotion): string {
    if (promotion.productId) {
      return `Producto: ${productNames.get(promotion.productId) ?? '—'}`;
    }
    return `Categoría: ${categoryNames.get(promotion.categoryId ?? '') ?? '—'}`;
  }

  return (
    <table className="promotions-table">
      <thead>
        <tr>
          <th scope="col">Nombre</th>
          <th scope="col">Objetivo</th>
          <th scope="col">Tipo</th>
          <th scope="col">Valor</th>
          <th scope="col">Vigencia</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {promotions.length === 0 && (
          <tr>
            <td colSpan={7} className="empty-cell">
              No hay promociones todavía. Crea la primera con «Nueva promoción».
            </td>
          </tr>
        )}
        {promotions.map((promotion) => {
          const advance = PROMOTION_ADVANCE[promotion.status];
          const busy = busyId === promotion.id;
          return (
            <tr
              key={promotion.id}
              className={promotion.isActiveToday ? 'row-live' : undefined}
            >
              <td>{promotion.name}</td>
              <td>{targetLabel(promotion)}</td>
              <td>{DISCOUNT_TYPE_LABELS[promotion.discountType]}</td>
              <td className="num">{formatDiscount(promotion)}</td>
              <td>
                {formatDate(promotion.startDate)} –{' '}
                {formatDate(promotion.endDate)}
                {promotion.isActiveToday && (
                  <span
                    className="pill-live"
                    title="Activa y dentro de su rango de fechas hoy"
                  >
                    ● Vigente hoy
                  </span>
                )}
              </td>
              <td>
                <StatusBadge status={promotion.status} />
              </td>
              <td className="actions">
                {advance ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => onAdvance(promotion, advance.next)}
                  >
                    {advance.label}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    disabled
                    title={ENDED_TOOLTIP}
                  >
                    Finalizar
                  </button>
                )}
                {promotion.status === 'SCHEDULED' && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={busy}
                    onClick={() => onDelete(promotion)}
                  >
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

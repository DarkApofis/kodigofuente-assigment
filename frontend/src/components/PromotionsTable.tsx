import type {
  Category,
  Product,
  Promotion,
  PromotionStatus,
} from '../api/types';
import { promotionEffect } from '../ui/effect';
import {
  ACTION_BLOCKED_REASONS,
  DISCOUNT_TYPE_LABELS,
  formatDateRange,
  formatDiscount,
  PROMOTION_ADVANCE,
  READ_ONLY_LABEL,
} from '../ui/labels';
import { EffectIndicator } from './EffectIndicator';
import { StatusBadge } from './StatusBadge';

interface Props {
  promotions: Promotion[];
  products: Product[];
  categories: Category[];
  busyId: string | null;
  today: string;
  onAdvance: (promotion: Promotion, next: PromotionStatus) => void;
  onEdit: (promotion: Promotion) => void;
  onDelete: (promotion: Promotion) => void;
  onCreate: () => void;
}

export function PromotionsTable({
  promotions,
  products,
  categories,
  busyId,
  today,
  onAdvance,
  onEdit,
  onDelete,
  onCreate,
}: Props) {
  const productNames = new Map(products.map((p) => [p.id, p.name]));
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  function targetName(promotion: Promotion): string {
    return promotion.productId
      ? (productNames.get(promotion.productId) ?? '—')
      : (categoryNames.get(promotion.categoryId ?? '') ?? '—');
  }

  if (promotions.length === 0) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">Todavía no hay promociones</h3>
        <p className="empty-state-body">
          Cuando crees una, queda en estado Programada y no afecta la caja hasta
          que la actives. Las promociones activas fuera de su rango de fechas
          aparecen marcadas como «Sin efecto hoy».
        </p>
        <button type="button" className="btn btn-primary" onClick={onCreate}>
          Crear la primera promoción
        </button>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="promotions-table">
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Objetivo</th>
            <th scope="col">Descuento</th>
            <th scope="col">Rango de vigencia</th>
            <th scope="col">Estado</th>
            <th scope="col" className="th-effect">
              Efecto hoy
            </th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {promotions.map((promotion) => {
            const advance = PROMOTION_ADVANCE[promotion.status];
            const effect = promotionEffect(promotion, today);
            const reason = ACTION_BLOCKED_REASONS[promotion.status];
            const busy = busyId === promotion.id;
            return (
              <tr
                key={promotion.id}
                className={
                  effect.kind === 'NO_EFFECT_ATTENTION'
                    ? 'row-attention'
                    : undefined
                }
              >
                <td>
                  <div className="cell-name">{promotion.name}</div>
                  {effect.kind === 'NO_EFFECT_ATTENTION' && (
                    <p className="attention-note">
                      Requiere atención · finalízala o extiende las fechas
                    </p>
                  )}
                </td>
                <td data-label="Objetivo">
                  <div>
                    {targetName(promotion)}
                    <p className="cell-sub">
                      {promotion.productId ? 'Producto' : 'Categoría'}
                    </p>
                  </div>
                </td>
                <td data-label="Descuento">
                  <div>
                    <span className="cell-value">
                      {formatDiscount(promotion)}
                    </span>
                    <p className="cell-sub-sans">
                      {DISCOUNT_TYPE_LABELS[promotion.discountType]}
                    </p>
                  </div>
                </td>
                <td data-label="Rango" className="cell-range">
                  {formatDateRange(promotion.startDate, promotion.endDate)}
                </td>
                <td>
                  <StatusBadge status={promotion.status} />
                </td>
                <td>
                  <EffectIndicator effect={effect} />
                </td>
                <td>
                  <div className="actions">
                    <div className="actions-row">
                      {advance && (
                        <button
                          type="button"
                          className="btn"
                          disabled={busy}
                          onClick={() => onAdvance(promotion, advance.next)}
                        >
                          {advance.label}
                        </button>
                      )}
                      {promotion.status !== 'ENDED' && (
                        <button
                          type="button"
                          className="btn"
                          disabled={busy}
                          onClick={() => onEdit(promotion)}
                        >
                          Editar
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
                      {promotion.status === 'ENDED' && (
                        <span className="action-locked">{READ_ONLY_LABEL}</span>
                      )}
                    </div>
                    {reason && <p className="action-reason">{reason}</p>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

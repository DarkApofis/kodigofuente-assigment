import { useEffect } from 'react';
import type { Promotion } from '../api/types';
import { formatDateRange, formatDiscount } from '../ui/labels';

interface Props {
  promotion: Promotion;
  /** Resolved target, e.g. "Cervezas · Categoría" */
  targetLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// Deleting is permanent and only allowed while SCHEDULED. Initial focus goes
// to "Cancelar"; the destructive action never receives focus by default.
export function DeleteConfirmDialog({
  promotion,
  targetLabel,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="overlay" onClick={onCancel}>
      <div
        className="dialog dialog-narrow"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-promo-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-body">
          <h2 id="delete-promo-title" className="dialog-header-inline">
            ¿Eliminar «{promotion.name}»?
          </h2>
          <p className="dialog-text">
            Se elimina de forma permanente y no queda en el histórico. Esta
            promoción está en estado <strong>Programada</strong>, por eso puede
            eliminarse.
          </p>
          <dl className="detail-grid">
            <dt>Objetivo</dt>
            <dd>{targetLabel}</dd>
            <dt>Descuento</dt>
            <dd>{formatDiscount(promotion)}</dd>
            <dt>Rango</dt>
            <dd>{formatDateRange(promotion.startDate, promotion.endDate)}</dd>
          </dl>
        </div>
        <footer className="dialog-footer">
          <button
            type="button"
            className="btn"
            onClick={onCancel}
            disabled={busy}
            autoFocus
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger-solid"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Eliminando…' : 'Sí, eliminar'}
          </button>
        </footer>
      </div>
    </div>
  );
}

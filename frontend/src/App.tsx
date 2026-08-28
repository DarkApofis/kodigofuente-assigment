import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorMessage } from './api/client';
import {
  changePromotionStatus,
  deletePromotion,
  getSummary,
  listCategories,
  listProducts,
  listPromotions,
} from './api/promotions';
import type {
  Category,
  Product,
  Promotion,
  PromotionStatus,
  PromotionsSummary,
} from './api/types';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { PromotionFormDialog } from './components/PromotionFormDialog';
import { PromotionsTable } from './components/PromotionsTable';
import { SummaryCards } from './components/SummaryCards';
import { todayIsoDate } from './ui/effect';
import { formatShortDate } from './ui/labels';

type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

interface DashboardData {
  summary: PromotionsSummary;
  promotions: Promotion[];
}

type FormState =
  { mode: 'create' } | { mode: 'edit'; promotion: Promotion } | null;

export function App() {
  const [dashboard, setDashboard] = useState<Loadable<DashboardData>>({
    status: 'loading',
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const today = useMemo(() => todayIsoDate(), []);

  const refresh = useCallback(async () => {
    try {
      const [summary, promotions] = await Promise.all([
        getSummary(),
        listPromotions(),
      ]);
      setDashboard({ status: 'ready', data: { summary, promotions } });
    } catch (error) {
      setDashboard({ status: 'error', message: errorMessage(error) });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void (async () => {
      try {
        const [productList, categoryList] = await Promise.all([
          listProducts(),
          listCategories(),
        ]);
        setProducts(productList);
        setCategories(categoryList);
        setCatalogError(null);
      } catch (error) {
        setCatalogError(errorMessage(error));
      }
    })();
  }, []);

  async function handleAdvance(promotion: Promotion, next: PromotionStatus) {
    setActionError(null);
    setBusyId(promotion.id);
    try {
      await changePromotionStatus(promotion.id, next);
      await refresh();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteConfirmed(promotion: Promotion) {
    setActionError(null);
    setBusyId(promotion.id);
    try {
      await deletePromotion(promotion.id);
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      setDeleteTarget(null);
      setActionError(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  function targetLabel(promotion: Promotion): string {
    if (promotion.productId) {
      const name =
        products.find((p) => p.id === promotion.productId)?.name ?? '—';
      return `${name} · Producto`;
    }
    const name =
      categories.find((c) => c.id === promotion.categoryId)?.name ?? '—';
    return `${name} · Categoría`;
  }

  const catalogReady = products.length > 0 || categories.length > 0;

  return (
    <>
      <header className="app-bar">
        <div className="app-bar-inner">
          <div>
            <h1>Promociones</h1>
            <p className="app-bar-subtitle">Hoy {formatShortDate(today)}</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setForm({ mode: 'create' })}
            disabled={!catalogReady}
            title={
              catalogReady
                ? undefined
                : 'No se pudo cargar el catálogo de productos y categorías'
            }
          >
            Crear promoción
          </button>
        </div>
      </header>

      <main className="layout">
        {actionError && (
          <div role="alert" className="banner banner-error">
            {actionError}
          </div>
        )}
        {catalogError && (
          <div role="alert" className="banner banner-error">
            Error al cargar el catálogo: {catalogError}
          </div>
        )}

        {dashboard.status === 'loading' && (
          <section className="table-card" aria-label="Cargando promociones">
            <div className="table-card-header">
              <h2 className="table-card-title">Promociones</h2>
            </div>
            <div style={{ padding: 24 }}>
              <p className="dialog-text">Cargando promociones…</p>
              <div className="skeleton-rows" aria-hidden="true">
                <div className="skeleton-row" />
                <div className="skeleton-row" />
                <div className="skeleton-row" />
              </div>
            </div>
          </section>
        )}

        {dashboard.status === 'error' && (
          <section className="table-card" aria-label="Error de carga">
            <div className="table-card-header">
              <h2 className="table-card-title">Promociones</h2>
            </div>
            <div style={{ padding: 24 }}>
              <div role="alert" className="alert">
                <div className="alert-title">
                  <span className="alert-title-mark" aria-hidden="true" />
                  No pudimos cargar las promociones
                </div>
                <p className="alert-body">
                  {dashboard.message}. Los precios en caja no cambiaron: siguen
                  aplicando las promociones que ya estaban vigentes.
                </p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void refresh()}
                >
                  Reintentar
                </button>
              </div>
              {/* Disabled skeleton, not an empty table: we are not claiming
                  there are no promotions */}
              <div className="skeleton-rows" aria-hidden="true">
                <div className="skeleton-row" />
                <div className="skeleton-row" />
                <div className="skeleton-row" />
              </div>
            </div>
          </section>
        )}

        {dashboard.status === 'ready' && (
          <>
            <SummaryCards summary={dashboard.data.summary} today={today} />
            <section aria-label="Listado de promociones" className="table-card">
              <div className="table-card-header">
                <h2 className="table-card-title">
                  {dashboard.data.promotions.length === 1
                    ? '1 promoción'
                    : `${dashboard.data.promotions.length} promociones`}
                </h2>
                <p className="legend">
                  <span>
                    <strong>Estado:</strong> ciclo de vida que tú cambias a
                    mano.
                  </span>
                  <span className="legend-divider" aria-hidden="true" />
                  <span>
                    <strong>Efecto hoy:</strong> si aplica en caja hoy (Activa +
                    fecha dentro del rango).
                  </span>
                </p>
              </div>
              <PromotionsTable
                promotions={dashboard.data.promotions}
                products={products}
                categories={categories}
                busyId={busyId}
                today={today}
                onAdvance={(promotion, next) =>
                  void handleAdvance(promotion, next)
                }
                onEdit={(promotion) => setForm({ mode: 'edit', promotion })}
                onDelete={setDeleteTarget}
                onCreate={() => setForm({ mode: 'create' })}
              />
            </section>
          </>
        )}
      </main>

      {form && (
        <PromotionFormDialog
          products={products}
          categories={categories}
          promotion={form.mode === 'edit' ? form.promotion : undefined}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            void refresh();
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          promotion={deleteTarget}
          targetLabel={targetLabel(deleteTarget)}
          busy={busyId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void handleDeleteConfirmed(deleteTarget)}
        />
      )}
    </>
  );
}

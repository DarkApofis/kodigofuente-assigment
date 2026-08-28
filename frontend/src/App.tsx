import { useCallback, useEffect, useState } from 'react';
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
import { CreatePromotionForm } from './components/CreatePromotionForm';
import { PromotionsTable } from './components/PromotionsTable';
import { SummaryCards } from './components/SummaryCards';

type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

interface DashboardData {
  summary: PromotionsSummary;
  promotions: Promotion[];
}

export function App() {
  const [dashboard, setDashboard] = useState<Loadable<DashboardData>>({
    status: 'loading',
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function handleDelete(promotion: Promotion) {
    if (!window.confirm(`¿Eliminar la promoción «${promotion.name}»?`)) return;
    setActionError(null);
    setBusyId(promotion.id);
    try {
      await deletePromotion(promotion.id);
      await refresh();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  const catalogReady = products.length > 0 || categories.length > 0;

  return (
    <main className="layout">
      <header className="page-header">
        <h1>Gestión de Promociones</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setPanelOpen(true)}
          disabled={!catalogReady}
          title={
            catalogReady
              ? undefined
              : 'No se pudo cargar el catálogo de productos y categorías'
          }
        >
          Nueva promoción
        </button>
      </header>

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
        <p className="state-message">Cargando promociones…</p>
      )}

      {dashboard.status === 'error' && (
        <div className="state-message state-error">
          <p>No se pudieron cargar las promociones: {dashboard.message}</p>
          <button type="button" className="btn" onClick={() => void refresh()}>
            Reintentar
          </button>
        </div>
      )}

      {dashboard.status === 'ready' && (
        <>
          <SummaryCards summary={dashboard.data.summary} />
          <section aria-label="Listado de promociones" className="table-wrap">
            <PromotionsTable
              promotions={dashboard.data.promotions}
              products={products}
              categories={categories}
              busyId={busyId}
              onAdvance={(promotion, next) =>
                void handleAdvance(promotion, next)
              }
              onDelete={(promotion) => void handleDelete(promotion)}
            />
          </section>
        </>
      )}

      {panelOpen && (
        <CreatePromotionForm
          products={products}
          categories={categories}
          onClose={() => setPanelOpen(false)}
          onCreated={() => {
            setPanelOpen(false);
            void refresh();
          }}
        />
      )}
    </main>
  );
}

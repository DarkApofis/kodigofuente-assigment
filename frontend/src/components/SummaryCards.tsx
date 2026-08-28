import type { PromotionsSummary } from '../api/types';
import { formatShortDate } from '../ui/labels';

// Three status counts (lifecycle the operator drives) plus the derived
// "in force today" metric, kept visually apart: it is not a status count.
export function SummaryCards({
  summary,
  today,
}: {
  summary: PromotionsSummary;
  today: string;
}) {
  const kpis = [
    {
      label: 'Programadas',
      value: summary.byStatus.SCHEDULED,
      shape: 'shape-ring',
    },
    { label: 'Activas', value: summary.byStatus.ACTIVE, shape: 'shape-dot' },
    {
      label: 'Finalizadas',
      value: summary.byStatus.ENDED,
      shape: 'shape-square',
    },
  ];

  return (
    <section className="summary" aria-label="Resumen de promociones">
      <div className="kpis">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="kpi">
            <p className="kpi-label">
              <span className={kpi.shape} aria-hidden="true" />
              {kpi.label}
            </p>
            <p className="kpi-value">{kpi.value}</p>
          </article>
        ))}
      </div>
      <div className="summary-divider" aria-hidden="true" />
      <article className="derived-metric">
        <p className="derived-metric-caption">Métrica derivada</p>
        <p className="derived-metric-row">
          <span className="derived-metric-value">{summary.activeToday}</span>
          <span className="derived-metric-label">Vigentes hoy</span>
        </p>
        <p className="derived-metric-note">
          Estado Activa <strong>y</strong> {formatShortDate(today)} dentro del
          rango. No es un conteo de estado.
        </p>
      </article>
    </section>
  );
}

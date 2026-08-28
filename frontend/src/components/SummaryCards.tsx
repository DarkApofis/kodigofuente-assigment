import type { PromotionsSummary } from '../api/types';

export function SummaryCards({ summary }: { summary: PromotionsSummary }) {
  const cards = [
    {
      label: 'Programadas',
      value: summary.byStatus.SCHEDULED,
      className: 'card',
    },
    { label: 'Activas', value: summary.byStatus.ACTIVE, className: 'card' },
    { label: 'Finalizadas', value: summary.byStatus.ENDED, className: 'card' },
    {
      label: 'Vigentes hoy',
      value: summary.activeToday,
      className: 'card card-highlight',
    },
  ];

  return (
    <section className="cards" aria-label="Resumen de promociones">
      {cards.map((card) => (
        <article key={card.label} className={card.className}>
          <p className="card-value">{card.value}</p>
          <p className="card-label">{card.label}</p>
        </article>
      ))}
    </section>
  );
}

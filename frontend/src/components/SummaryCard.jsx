export default function SummaryCard({ icon, label, value, sub }) {
  if (!icon) return null;
  return (
    <div className="summary-card">
      <div className="summary-card__icon">{icon}</div>
      <div className="summary-card__body">
        <div className="summary-card__label">{label}</div>
        <div className="summary-card__value">{value}</div>
        {sub ? <div className="summary-card__sub">{sub}</div> : null}
      </div>
    </div>
  );
}
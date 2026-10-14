export default function Metric({ label, value, foot, icon: Icon, tone, loading }) {
  return (
    <section className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}><Icon size={17} /></span>
      </div>
      <div className="metric-value">
        {loading ? <span className="metric-skeleton" /> : value}
      </div>
      <div className="metric-foot">{foot}</div>
    </section>
  );
}

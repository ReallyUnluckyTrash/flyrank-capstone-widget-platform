export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={19} /></span>
      <b>{title}</b>
      <p>{description}</p>
      {action}
    </div>
  );
}

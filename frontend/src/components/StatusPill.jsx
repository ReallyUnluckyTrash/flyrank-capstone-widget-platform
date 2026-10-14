export default function StatusPill({ blocked = false, children }) {
  return (
    <span className={`status-pill ${blocked ? 'blocked' : 'valid'}`}>
      <i />
      {children || (blocked ? 'Blocked' : 'Accepted')}
    </span>
  );
}

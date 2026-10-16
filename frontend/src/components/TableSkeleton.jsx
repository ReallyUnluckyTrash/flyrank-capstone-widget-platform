export default function TableSkeleton({ label, columns = 5, rows = 4 }) {
  return (
    <div className="table-skeleton" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          className="table-skeleton-row"
          key={rowIndex}
          style={{ '--skeleton-columns': columns }}
          aria-hidden="true"
        >
          {Array.from({ length: columns }, (_, columnIndex) => (
            <i className="table-skeleton-cell" key={columnIndex} />
          ))}
        </div>
      ))}
    </div>
  );
}

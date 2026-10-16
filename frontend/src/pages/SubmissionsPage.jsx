import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ChevronDown, Code2, Inbox, RefreshCw, WalletCards } from 'lucide-react';
import { api } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import Notice from '../components/Notice.jsx';
import PageHeading from '../components/PageHeading.jsx';
import SubmissionRow from '../components/SubmissionRow.jsx';
import TableSkeleton from '../components/TableSkeleton.jsx';
import { fetchWidgets } from '../utils/data.js';
import { fmt } from '../utils/format.js';
import styles from './SubmissionsPage.module.css';

function csvCell(value) {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function downloadCsv(title, rows) {
  const keys = [...new Set(rows.flatMap((item) => Object.keys(item.data || {})))];
  const csv = [
    ['created_at', 'country', 'city', 'spam', ...keys].map(csvCell).join(','),
    ...rows.map((item) => [
      item.created_at,
      item.country,
      item.city,
      item.is_spam,
      ...keys.map((key) => item.data?.[key]),
    ].map(csvCell).join(',')),
  ].join('\n');
  const filename = (title || 'submissions')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .trim()
    .replace(/[. ]+$/g, '') || 'submissions';
  const safeFilename = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(filename)
    ? `_${filename}`
    : filename;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  link.download = `${safeFilename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function SubmissionsPage() {
  const { id: routeId } = useParams();
  const [pageState, setPageState] = useState({ routeId, page: 1 });
  const selectedId = routeId || '';
  const navigate = useNavigate();
  const widgetsQuery = useQuery({ queryKey: ['widgets'], queryFn: fetchWidgets });
  const widgets = widgetsQuery.data || [];
  const selected = widgets.find((widget) => widget.id === selectedId);
  const page = pageState.routeId === routeId ? pageState.page : 1;
  const submissionsQuery = useQuery({
    queryKey: ['submissions', selectedId, page],
    queryFn: () => api(`/widgets/${selectedId}/submissions?page=${page}&page_size=25`),
    placeholderData: (previousData, previousQuery) => (
      previousQuery?.queryKey[1] === selectedId ? previousData : undefined
    ),
    enabled: Boolean(selectedId),
  });
  const result = submissionsQuery.data;
  const entries = result?.data || [];
  const pagination = result?.pagination;

  useEffect(() => {
    setPageState((current) => current.routeId === routeId ? current : { routeId, page: 1 });
  }, [routeId]);

  function changeWidget(value) {
    navigate(value ? `/submissions/${value}` : '/submissions', { replace: true });
  }

  return (
    <div className={styles.root}>
      <PageHeading
        eyebrow="INCOMING DATA"
        title="Submissions"
        description="Inspect the entries captured by each widget."
        action={(
          <div className="heading-actions">
            {selected && (
              <button
                className="button secondary"
                onClick={() => downloadCsv(selected.title, entries)}
                disabled={!entries.length}
              >
                <ArrowDownToLine size={15} />Export this page
              </button>
            )}
            <button
              className="button secondary icon-only"
              onClick={() => submissionsQuery.refetch()}
              title="Refresh submissions"
              aria-label="Refresh submissions"
              disabled={!selectedId || submissionsQuery.isFetching}
              aria-busy={submissionsQuery.isFetching}
            >
              <RefreshCw size={15} />
            </button>
          </div>
        )}
      />
      <Notice message={submissionsQuery.error?.message || widgetsQuery.error?.message} />
      <section className="panel submissions-panel">
        <div className="submission-toolbar">
          <div>
            <span className="eyebrow">FILTER BY WIDGET</span>
            <h2>{selected?.title || 'All widgets'}</h2>
          </div>
          <label className="select-wrap widget-select">
            <span className="sr-only">Choose widget</span>
            <select value={selectedId} onChange={(event) => changeWidget(event.target.value)}>
              <option value="">Choose a widget</option>
              {widgets.map((widget) => <option value={widget.id} key={widget.id}>{widget.title}</option>)}
            </select>
            <ChevronDown size={15} />
          </label>
          <button
            className="button secondary icon-only"
            onClick={() => submissionsQuery.refetch()}
            title="Refresh submissions"
            aria-label="Refresh submissions"
            disabled={!selectedId || submissionsQuery.isFetching}
            aria-busy={submissionsQuery.isFetching}
          >
            <RefreshCw size={15} />
          </button>
        </div>
        {submissionsQuery.isLoading ? (
          <TableSkeleton label="Loading submissions" columns={5} rows={5} />
        ) : !selectedId ? (
          <EmptyState
            icon={Inbox}
            title="Choose a widget"
            description="Select a widget above to inspect its submissions."
            action={<Link className="button primary" to="/widgets"><WalletCards size={15} />Manage widgets</Link>}
          />
        ) : entries.length ? (
          <div className="table-scroll" aria-busy={submissionsQuery.isFetching}>
            <table className="data-table submissions-table">
              <thead><tr><th>RECEIVED</th><th>CONTACT</th><th>LOCATION</th><th>FORM DATA</th><th>STATUS</th></tr></thead>
              <tbody>{entries.map((item) => <SubmissionRow key={item.id} item={item} />)}</tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Inbox}
            title="No submissions yet"
            description="When this widget receives its first entry, it will show up here."
            action={<Link className="button secondary" to={`/widgets/${selectedId}`}><Code2 size={15} />View embed code</Link>}
          />
        )}
        {pagination && (
          <div className="pagination">
            <span>
              {fmt.format(pagination.total)} total entries
              <span className="pagination-sep">·</span> Page {pagination.page} of {Math.max(pagination.total_pages, 1)}
            </span>
            <div>
              <button
                className="button secondary"
                disabled={page <= 1}
                onClick={() => setPageState({ routeId, page: page - 1 })}
              >
                Previous
              </button>
              <button
                className="button secondary"
                disabled={page >= pagination.total_pages}
                onClick={() => setPageState({ routeId, page: page + 1 })}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

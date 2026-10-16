import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Search, WalletCards } from 'lucide-react';
import { api, getWidgetEmbedSnippet } from '../api.js';
import DeleteWidgetDialog from '../components/DeleteWidgetDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ModalDialog from '../components/ModalDialog.jsx';
import Notice from '../components/Notice.jsx';
import PageHeading from '../components/PageHeading.jsx';
import WidgetFormModal from '../components/WidgetFormModal.jsx';
import WidgetRow from '../components/WidgetRow.jsx';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard.js';
import { fetchWidgets, normalizeWidget } from '../utils/data.js';
import styles from './WidgetsPage.module.css';

export default function WidgetsPage() {
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [widgetToDelete, setWidgetToDelete] = useState(null);
  const { copy, copiedText, error: clipboardError } = useCopyToClipboard();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const widgetsQuery = useQuery({ queryKey: ['widgets'], queryFn: fetchWidgets });
  const widgets = widgetsQuery.data || [];
  const deleteMutation = useMutation({
    mutationFn: (widget) => api(`/widgets/${widget.id}`, { method: 'DELETE' }),
    onSuccess: (_, widget) => {
      queryClient.setQueryData(['widgets'], (items = []) => items.filter((item) => item.id !== widget.id));
      setWidgetToDelete(null);
    },
  });

  useEffect(() => {
    if (location.state?.create) {
      setEditorOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const filtered = useMemo(
    () => widgets.filter((widget) => `${widget.title} ${widget.id}`.toLowerCase().includes(query.toLowerCase())),
    [widgets, query],
  );

  async function copySnippet(widget) {
    await copy(getWidgetEmbedSnippet(widget.id));
  }

  function saveWidget(saved) {
    const widget = normalizeWidget(saved);
    queryClient.setQueryData(['widgets'], (items = []) => [
      widget,
      ...items.filter((item) => item.id !== widget.id),
    ]);
    queryClient.invalidateQueries({ queryKey: ['widgets'] });
    setEditorOpen(false);
    navigate(`/widgets/${widget.id}`);
  }

  return (
    <div className={styles.root}>
      <PageHeading
        eyebrow="CONFIGURE YOUR CAPTURE"
        title="Widgets"
        description="Create, refine, and publish the forms collecting your submissions."
        action={<button className="button primary" onClick={() => setEditorOpen(true)}><Plus size={16} />Create widget</button>}
      />
      <Notice message={clipboardError || widgetsQuery.error?.message} />
      <section className="panel widgets-panel">
        <div className="list-toolbar">
          <div className="list-summary">
            <span className="eyebrow">YOUR CONFIGURATIONS</span>
            <h2>Widget library <span>{widgets.length}</span></h2>
          </div>
          <div className="list-filters">
            <label className="search-field">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search widgets" />
            </label>
            <button
              className="icon-button filter-refresh"
              title="Refresh widgets"
              aria-label="Refresh widgets"
              onClick={() => widgetsQuery.refetch()}
              disabled={widgetsQuery.isFetching}
              aria-busy={widgetsQuery.isFetching}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        {widgetsQuery.isLoading ? (
          <div className="loading-row"><span className="loader" />Loading widget configurations</div>
        ) : filtered.length ? (
          <div className="table-scroll">
            <table className="data-table widgets-table">
              <thead>
                <tr><th>WIDGET</th><th>FIELDS</th><th>SUBMISSIONS</th><th>CREATED</th><th>STATUS</th><th className="align-right">ACTIONS</th></tr>
              </thead>
              <tbody>
                {filtered.map((widget) => (
                  <WidgetRow
                    key={widget.id}
                    widget={widget}
                    onEdit={() => navigate(`/widgets/${widget.id}`)}
                    onDelete={() => {
                      deleteMutation.reset();
                      setWidgetToDelete(widget);
                    }}
                    onCopy={() => copySnippet(widget)}
                    copied={copiedText === getWidgetEmbedSnippet(widget.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={WalletCards}
            title={query ? 'No matching widgets' : 'No widgets configured'}
            description={query ? 'Try a different search term.' : 'Create your first capture form and publish it on your site.'}
            action={!query && <button className="button primary" onClick={() => setEditorOpen(true)}><Plus size={15} />Create widget</button>}
          />
        )}
        <div className="table-foot">
          <span>Showing {filtered.length} of {widgets.length} widgets</span>
          <span>Widget configurations are private to your workspace</span>
        </div>
      </section>
      {editorOpen && <WidgetFormModal onClose={() => setEditorOpen(false)} onSaved={saveWidget} />}
      {widgetToDelete && (
        <DeleteWidgetDialog
          widget={widgetToDelete}
          mutation={deleteMutation}
          onClose={() => setWidgetToDelete(null)}
          onConfirm={() => deleteMutation.mutate(widgetToDelete)}
        />
      )}
    </div>
  );
}

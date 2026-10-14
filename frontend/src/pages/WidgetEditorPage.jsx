import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Code2, Copy, FileText, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { api, getWidgetEmbedSnippet } from '../api.js';
import Detail from '../components/Detail.jsx';
import Notice from '../components/Notice.jsx';
import PageHeading from '../components/PageHeading.jsx';
import WidgetFormModal from '../components/WidgetFormModal.jsx';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard.js';
import { dateTime } from '../utils/format.js';
import { unwrap } from '../utils/data.js';

export default function WidgetEditorPage() {
  const { id } = useParams();
  const [editing, setEditing] = useState(false);
  const { copy, copiedText, error: clipboardError } = useCopyToClipboard();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const widgetQuery = useQuery({
    queryKey: ['widget', id],
    queryFn: async () => unwrap(await api(`/widgets/${id}`)),
    enabled: id !== 'new',
  });
  const widget = widgetQuery.data;
  const snippet = widget ? getWidgetEmbedSnippet(widget.id) : '';

  useEffect(() => {
    if (id === 'new') {
      navigate('/widgets', { replace: true, state: { create: true } });
      return;
    }
    setEditing(false);
  }, [id, navigate]);

  return (
    <>
      <div className="back-row"><Link to="/widgets"><ArrowLeft size={16} />All widgets</Link></div>
      <PageHeading
        eyebrow="WIDGET CONFIGURATION"
        title={widget?.title || 'Widget details'}
        description="Edit the form settings and copy the embed code for your site."
        action={widget && (
          <button className="button secondary" onClick={() => copy(snippet)}>
            {copiedText === snippet ? <Check size={15} /> : <Copy size={15} />}
            {copiedText === snippet ? 'Copied' : 'Copy embed'}
          </button>
        )}
      />
      <Notice message={clipboardError || widgetQuery.error?.message} />
      {widgetQuery.isLoading && <div className="loading-row"><span className="loader" />Loading widget configuration</div>}
      {widget && (
        <div className="editor-grid">
          <section className="panel editor-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">FORM SCHEMA</span><h2>Configuration</h2></div>
              <span className="id-tag">{widget.id.slice(0, 8)}</span>
            </div>
            <div className="detail-list">
              <Detail label="Display title" value={widget.title} />
              <Detail label="Description" value={widget.description || 'No description'} />
              <Detail label="Button text" value={widget.button_text} />
              <Detail label="Created" value={dateTime(widget.created_at)} />
            </div>
            <h3 className="subsection-title">
              Capture fields <span>{(widget.form_fields || []).filter((field) => !field.honeypot).length}</span>
            </h3>
            <div className="field-list">
              {(widget.form_fields || []).filter((field) => !field.honeypot).map((field) => (
                <div className="field-row" key={field.name}>
                  <span className="field-type-icon"><FileText size={15} /></span>
                  <span><b>{field.label}</b><small className="mono">{field.name} · {field.type}</small></span>
                  <span className={`field-required ${field.required ? 'required' : ''}`}>
                    {field.required ? 'Required' : 'Optional'}
                  </span>
                </div>
              ))}
            </div>
            <button className="button primary editor-edit" onClick={() => setEditing(true)}>
              <SlidersHorizontal size={15} />Edit configuration
            </button>
          </section>
          <section className="panel snippet-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">PUBLISH</span><h2>Embed on your site</h2></div>
              <Code2 size={18} className="muted-icon" />
            </div>
            <p>Add this script to your page. It loads the published form from your widget configuration.</p>
            <pre className="snippet-code"><code>{snippet}</code></pre>
            <button className="button secondary" onClick={() => copy(snippet)}>
              {copiedText === snippet ? <Check size={15} /> : <Copy size={15} />}
              {copiedText === snippet ? 'Copied' : 'Copy snippet'}
            </button>
            <div className="snippet-note">
              <ShieldCheck size={16} />
              <span>
                <b>Public configuration</b>
                <small>The form can be loaded without an account. Only this widget's public fields are exposed.</small>
              </span>
            </div>
          </section>
        </div>
      )}
      {editing && widget && (
        <WidgetFormModal
          widget={widget}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            queryClient.setQueryData(['widget', id], saved);
            queryClient.invalidateQueries({ queryKey: ['widgets'] });
            setEditing(false);
          }}
        />
      )}
    </>
  );
}

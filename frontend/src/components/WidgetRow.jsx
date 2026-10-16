import { Bolt, Check, Code2, SlidersHorizontal, Trash2 } from 'lucide-react';
import { fmt, shortDate } from '../utils/format.js';
import StatusPill from './StatusPill.jsx';

export default function WidgetRow({ widget, onEdit, onDelete, onCopy, copied }) {
  const fields = Array.isArray(widget.form_fields)
    ? widget.form_fields.filter((field) => !field.honeypot)
    : [];

  return (
    <tr>
      <td>
        <div className="widget-name-cell">
          <span className="widget-symbol"><Bolt size={17} /></span>
          <span>
            <b>{widget.title}</b>
            <small className="mono">{widget.id}</small>
          </span>
        </div>
      </td>
      <td>{fields.length} {fields.length === 1 ? 'field' : 'fields'}</td>
      <td className="mono">{fmt.format(widget.submission_count || 0)}</td>
      <td>{shortDate(widget.created_at)}</td>
      <td><StatusPill>Configured</StatusPill></td>
      <td>
        <div className="row-actions">
          <button
            className="row-action"
            title={copied ? 'Copied' : 'Copy embed snippet'}
            aria-label={copied ? 'Copied embed snippet' : 'Copy embed snippet'}
            onClick={onCopy}
          >
            <span className={`copy-indicator ${copied ? 'is-copied' : ''}`} aria-hidden="true">
              <Code2 className="copy-code" size={16} />
              <Check className="copy-check" size={16} />
            </span>
          </button>
          <button className="row-action" title="Edit widget" aria-label="Edit widget" onClick={onEdit}>
            <SlidersHorizontal size={16} />
          </button>
          <button className="row-action danger-action" title="Delete widget" aria-label="Delete widget" onClick={onDelete}>
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

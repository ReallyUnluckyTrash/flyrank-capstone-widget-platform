import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { dateTime } from '../utils/format.js';
import StatusPill from './StatusPill.jsx';

export default function SubmissionFeedRow({ item }) {
  const values = Object.values(item.data || {});
  const submission = values.find((value) => String(value).includes('@')) || values[0] || '—';

  return (
    <tr>
      <td className="mono">{dateTime(item.created_at)}</td>
      <td className="strong">{item.widget_title}</td>
      <td>{String(submission)}</td>
      <td>{[item.city, item.country].filter(Boolean).join(', ') || 'Unknown'}</td>
      <td><StatusPill blocked={item.is_spam} /></td>
      <td>
        <Link
          className="row-action"
          to={`/submissions/${item.widget_id}`}
          title="View widget submissions"
          aria-label={`View submissions for ${item.widget_title}`}
        >
          <ArrowRight size={15} />
        </Link>
      </td>
    </tr>
  );
}

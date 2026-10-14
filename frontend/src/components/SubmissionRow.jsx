import { dateTime } from '../utils/format.js';
import StatusPill from './StatusPill.jsx';

export default function SubmissionRow({ item }) {
  const values = Object.entries(item.data || {});
  const contact = values.find(([key]) => key.toLowerCase().includes('email'))?.[1]
    || values.find(([key]) => key.toLowerCase().includes('name'))?.[1]
    || 'Submission';

  return (
    <tr>
      <td className="mono">{dateTime(item.created_at)}</td>
      <td>
        <b>{String(contact)}</b>
        <small className="mono block-id">{item.id.slice(0, 8)}</small>
      </td>
      <td>{[item.city, item.country].filter(Boolean).join(', ') || 'Unknown'}</td>
      <td>
        <div className="payload-values">
          {values.slice(0, 3).map(([key, value]) => (
            <span key={key}><small>{key}</small>{String(value)}</span>
          ))}
        </div>
      </td>
      <td><StatusPill blocked={item.is_spam} /></td>
    </tr>
  );
}

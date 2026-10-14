import { Check, CircleHelp } from 'lucide-react';

export default function Notice({ message, kind = 'error' }) {
  if (!message) return null;
  return (
    <div className={`notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {kind === 'error' ? <CircleHelp size={16} /> : <Check size={16} />}
      {message}
    </div>
  );
}

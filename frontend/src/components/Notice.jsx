import { useEffect, useState } from 'react';
import { Check, CircleHelp } from 'lucide-react';

export default function Notice({ message, kind = 'error' }) {
  const [displayMessage, setDisplayMessage] = useState(message || '');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      setClosing(false);
      return undefined;
    }
    if (!displayMessage) return undefined;
    setClosing(true);
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
    const timeout = window.setTimeout(() => setDisplayMessage(''), duration);
    return () => window.clearTimeout(timeout);
  }, [message, displayMessage]);

  if (!displayMessage) return null;
  return (
    <div className={`notice ${kind} ${closing ? 'closing' : ''}`} role={kind === 'error' ? 'alert' : 'status'} aria-hidden={closing}>
      {kind === 'error' ? <CircleHelp size={16} /> : <Check size={16} />}
      {displayMessage}
    </div>
  );
}

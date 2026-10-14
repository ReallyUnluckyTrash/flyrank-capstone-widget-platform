import { useState } from 'react';

export function useCopyToClipboard(timeout = 1600) {
  const [copiedText, setCopiedText] = useState('');
  const [error, setError] = useState('');

  async function copy(text) {
    setError('');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      window.setTimeout(() => {
        setCopiedText((current) => current === text ? '' : current);
      }, timeout);
      return true;
    } catch {
      setError('Clipboard access is unavailable in this browser.');
      return false;
    }
  }

  return { copy, copiedText, error };
}

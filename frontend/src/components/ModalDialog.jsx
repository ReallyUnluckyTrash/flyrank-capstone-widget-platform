import { useEffect, useRef, useState } from 'react';
import styles from './ModalDialog.module.css';

export default function ModalDialog({
  children,
  onClose,
  ariaLabel,
  className = '',
  canClose = true,
  closeRequestRef,
}) {
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const canCloseRef = useRef(canClose);
  const closingRef = useRef(false);
  const closeTimerRef = useRef(null);
  onCloseRef.current = onClose;
  canCloseRef.current = canClose;

  function requestClose(afterExit) {
    if (closingRef.current || (!canCloseRef.current && typeof afterExit !== 'function')) return;
    closingRef.current = true;
    setClosing(true);
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;
    closeTimerRef.current = window.setTimeout(() => {
      if (typeof afterExit === 'function') afterExit();
      else onCloseRef.current();
    }, duration);
  }

  useEffect(() => {
    const previousFocus = document.activeElement;
    if (closeRequestRef) closeRequestRef.current = requestClose;
    const dialog = dialogRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () => [...dialog.querySelectorAll(focusableSelector)];
    (focusable()[0] || dialog).focus();

    function handleKeyDown(event) {
      if (closingRef.current) {
        event.preventDefault();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
      } else if (event.key === 'Tab') {
        const items = focusable();
        if (!items.length) {
          event.preventDefault();
          dialog.focus();
        } else if (event.shiftKey && (document.activeElement === items[0] || !dialog.contains(document.activeElement))) {
          event.preventDefault();
          items[items.length - 1].focus();
        } else if (!event.shiftKey && (document.activeElement === items[items.length - 1] || !dialog.contains(document.activeElement))) {
          event.preventDefault();
          items[0].focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      if (closeRequestRef) closeRequestRef.current = null;
      window.clearTimeout(closeTimerRef.current);
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <div
      className={`${styles.backdrop} ${closing ? styles.closing : ''}`}
      aria-hidden={closing}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        ref={dialogRef}
        className={`${styles.card} ${className} ${closing ? styles.closing : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        {children}
      </section>
    </div>
  );
}

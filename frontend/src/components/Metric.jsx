import { useEffect, useRef, useState } from 'react';
import { fmt } from '../utils/format.js';

export default function Metric({ label, value, foot, icon: Icon, tone, loading }) {
  const [displayValue, setDisplayValue] = useState('0');
  const currentValue = useRef(0);

  useEffect(() => {
    const target = Number(String(value).replaceAll(',', ''));
    if (!Number.isFinite(target)) {
      setDisplayValue(value);
      return undefined;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      currentValue.current = target;
      setDisplayValue(value);
      return undefined;
    }

    let frame;
    let startedAt;
    const from = currentValue.current;
    function update(timestamp) {
      startedAt ??= timestamp;
      const progress = Math.min((timestamp - startedAt) / 240, 1);
      const eased = 1 - (1 - progress) ** 3;
      const nextValue = Math.round(from + (target - from) * eased);
      currentValue.current = nextValue;
      setDisplayValue(fmt.format(nextValue));
      if (progress < 1) {
        frame = window.requestAnimationFrame(update);
      } else {
        currentValue.current = target;
        setDisplayValue(value);
      }
    }
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return (
    <section className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}><Icon size={17} /></span>
      </div>
      <div className="metric-value">
        {loading ? <span className="metric-skeleton" /> : displayValue}
      </div>
      <div className="metric-foot">{foot}</div>
    </section>
  );
}

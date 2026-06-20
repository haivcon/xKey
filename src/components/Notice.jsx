const VARIANTS = {
  warning: {
    className: 'warning-note warning-note-body',
    strongClassName: 'warning-note-body',
  },
  danger: {
    className: 'danger-note danger-note-body',
    strongClassName: 'danger-note-body',
  },
  success: {
    className: 'border-emerald-500/15 bg-emerald-500/5 text-emerald-100/85',
    strongClassName: 'text-emerald-100',
  },
  info: {
    className: 'border-brand-500/15 bg-brand-500/5 text-brand-100/85',
    strongClassName: 'text-brand-100',
  },
};

export default function Notice({ variant = 'info', children, className = '', strong = false }) {
  const styles = VARIANTS[variant] || VARIANTS.info;
  const content = strong ? <strong className={styles.strongClassName}>{children}</strong> : children;

  return (
    <div className={`rounded-xl border p-3 text-xs leading-relaxed ${styles.className} ${className}`}>
      {content}
    </div>
  );
}

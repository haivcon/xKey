import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  active?: boolean;
  status?: ReactNode;
  expanded?: boolean;
  onExpand?: () => void;
  onPrimaryClick?: () => void;
  toggle?: ReactNode;
  children?: ReactNode;
  accentClassName?: string;
  className?: string;
  detailsClassName?: string;
  expandLabel: string;
};

export function CollapsibleSettingRow({
  icon,
  title,
  description,
  active,
  status,
  expanded,
  onExpand,
  onPrimaryClick,
  toggle,
  children,
  accentClassName = active ? 'text-brand-300' : 'text-surface-400',
  className = '',
  detailsClassName = '',
  expandLabel,
}: Props) {
  const canExpand = typeof onExpand === 'function';
  const handleMainClick = onPrimaryClick || onExpand;

  return (
    <div className={`security-row border-b border-surface-200 last:border-b-0 dark:border-surface-700/30 ${className}`}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={handleMainClick}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span className={`security-row-icon mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-surface-200 bg-surface-50 dark:border-surface-700/55 dark:bg-surface-900/70 ${accentClassName}`}>
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-surface-950 dark:text-white">{title}</span>
            {description && (
              <span className="mt-1 block text-xs leading-relaxed text-surface-600 dark:text-surface-400">{description}</span>
            )}
          </span>
        </button>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 pl-13 sm:flex-shrink-0 sm:pl-0">
          {status}
          {canExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-950 dark:text-surface-500 dark:hover:bg-surface-800 dark:hover:text-surface-200"
              aria-label={expandLabel}
              aria-expanded={expanded}
            >
              <ChevronDown size={18} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
          {toggle}
        </div>
      </div>

      {expanded && children && (
        <div className={`security-expanded-panel mx-4 mb-4 space-y-3 rounded-2xl border border-surface-200 bg-white/80 p-3 dark:border-surface-700/45 dark:bg-surface-950/35 ${detailsClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
}
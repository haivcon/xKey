import { ShieldAlert, Trash2 } from 'lucide-react';
import Notice from '../Notice';

type DangerZoneProps = {
  title: string;
  subtitle: string;
  description: string;
  actionLabel: string;
  onAction: () => void | Promise<void>;
};

export default function DangerZone({ title, subtitle, description, actionLabel, onAction }: DangerZoneProps) {
  return (
    <Notice variant="danger" className="rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
          <ShieldAlert size={20} className="danger-note-icon" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-red-400">{title}</h2>
          <p className="text-xs text-red-400/70">{subtitle}</p>
        </div>
      </div>
      <button
        onClick={onAction}
        className="btn-glow btn-glow-danger w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
      >
        <Trash2 size={18} />
        {actionLabel}
      </button>
      <p className="danger-note-body text-xs mt-3 text-center">{description}</p>
    </Notice>
  );
}

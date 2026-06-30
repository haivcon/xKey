import { AlertTriangle, ArrowDown, CheckCircle2, ChevronDown, ShieldCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { buildSecurityCheckup, calculateSecurityScore, getSecurityScoreTone, type SecurityScoreItem } from './securityScore';
import type { TFunction } from './types';

export type SecurityRecommendation = {
  key: string;
  title: string;
  desc: string;
  action: string;
  onClick: () => void;
};

type Props = {
  t: TFunction;
  scoreItems: SecurityScoreItem[];
  settingStatus: (text: ReactNode, active?: boolean) => ReactNode;
};

export function SecurityRecommendationsSection({
  t,
  scoreItems,
  settingStatus,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [checkupExpanded, setCheckupExpanded] = useState(true);
  const score = calculateSecurityScore(scoreItems);
  const checkupItems = buildSecurityCheckup(scoreItems);
  const scoreTone = getSecurityScoreTone(score.percent);
  const riskClass = score.riskLevel === 'low'
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
    : score.riskLevel === 'medium'
      ? 'border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-100'
      : 'border-red-500/20 bg-red-500/10 text-red-900 dark:text-red-100';

  const groupToggleClass = 'inline-flex items-center justify-center p-1 text-surface-700 transition hover:text-brand-800 dark:text-surface-300 dark:hover:text-brand-200';
  const actionButtonClass = 'btn-glow inline-flex w-full flex-shrink-0 items-center justify-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-[0.7rem] font-bold text-brand-800 shadow-sm transition hover:border-brand-500 hover:bg-brand-100 dark:border-brand-500/35 dark:bg-brand-500/10 dark:text-brand-100 dark:hover:border-brand-400/70 dark:hover:bg-brand-500/20 sm:w-auto';
  const scoreFormula = `${score.enabledWeight}/${score.totalWeight} × 100 = ${score.percent}%`;
  const riskLabel = score.riskLevel === 'low'
    ? t('settings.securityRiskLow', { default: 'Thấp' })
    : score.riskLevel === 'medium'
      ? t('settings.securityRiskMedium', { default: 'Trung bình' })
      : t('settings.securityRiskHigh', { default: 'Cao' });

  return (
    <div className="glass-card mt-3 overflow-hidden">
      <div className="border-b border-surface-200 p-4 dark:border-surface-700/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500/10">
              <ShieldCheck size={20} className="text-brand-600 dark:text-brand-300" />
            </div>
            <button type="button" onClick={() => setExpanded(value => !value)} className="min-w-0 text-left">
              <p className="text-sm font-semibold text-surface-950 dark:text-surface-50">
                {t('settings.securityScoreTitle', { default: 'Điểm sức khỏe bảo mật' })}
              </p>
              {expanded && (
                <p className="mt-1 text-xs leading-relaxed text-surface-700 dark:text-surface-300">
                  {t('settings.securityScoreDesc', { default: 'Tổng hợp nhanh các lớp bảo vệ quan trọng đang bật trên thiết bị này.' })}
                </p>
              )}
            </button>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {settingStatus(`${score.enabledWeight}/${score.totalWeight}`, score.percent >= 80)}
            <button type="button" onClick={() => setExpanded(value => !value)} className={groupToggleClass} aria-expanded={expanded} aria-label={t('settings.expandDetails')}>
              <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {expanded && (
          <>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-surface-700 dark:text-surface-200">{score.percent}%</span>
                <span className="font-semibold text-surface-700 dark:text-surface-300">
                  {score.percent >= 80
                    ? t('settings.securityScoreStrong', { default: 'Mạnh' })
                    : score.percent >= 55
                      ? t('settings.securityScoreMedium', { default: 'Khá' })
                      : t('settings.securityScoreWeak', { default: 'Cần cải thiện' })}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                <div className={`h-full rounded-full bg-gradient-to-r ${scoreTone}`} style={{ width: `${score.percent}%` }} />
              </div>
              <div className="mt-2 rounded-lg border border-surface-300 bg-white px-3 py-2 text-[0.68rem] font-medium leading-relaxed text-surface-800 dark:border-surface-700/60 dark:bg-surface-950/35 dark:text-surface-200">
                <span className="font-bold text-surface-900 dark:text-surface-100">
                  {t('settings.securityScoreFormulaTitle', { default: 'Cách tính điểm' })}:
                </span>{' '}
                {t('settings.securityScoreFormulaDesc', { default: 'Tổng trọng số mục đã bật / tổng trọng số tất cả mục × 100.' })}{' '}
                <span className="font-bold text-brand-700 dark:text-brand-300">{scoreFormula}</span>
              </div>
            </div>

            <div className={`mt-4 rounded-xl border p-3 text-xs font-medium ${riskClass}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">{t('settings.securityRiskLevel', { default: 'Mức rủi ro' })}: {riskLabel}</span>
                <span aria-hidden="true">{score.riskLevel === 'low' ? '✓' : score.riskLevel === 'medium' ? '!' : '!!'}</span>
              </div>
              <p className="mt-1 opacity-95">
                {score.riskLevel === 'low'
                  ? t('settings.securityRiskLowDesc', { default: 'Cấu hình hiện tại phù hợp để sử dụng hằng ngày.' })
                  : score.riskLevel === 'medium'
                    ? t('settings.securityRiskMediumDesc', { default: 'Nên bật thêm các lớp bảo vệ quan trọng còn thiếu.' })
                    : t('settings.securityRiskHighDesc', { default: 'Vault đang thiếu nhiều lớp bảo vệ quan trọng.' })}
              </p>
            </div>
          </>
        )}
      </div>

      {expanded && (
        <div className="space-y-4 p-4">
          <div>
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-600 dark:text-surface-300">
                  {t('settings.securityCheckupTitle', { default: 'Kiểm tra bảo mật' })}
                </p>
                <p className="mt-1 text-[0.7rem] leading-relaxed text-surface-600 dark:text-surface-300">
                  {t('settings.securityCheckupNavOnlyDesc', { default: 'Các mục bên dưới chỉ đưa bạn đến phần cài đặt tương ứng để tự bật/tắt, không tự động thay đổi cấu hình.' })}
                </p>
              </div>
              <button type="button" onClick={() => setCheckupExpanded(value => !value)} className={groupToggleClass} aria-expanded={checkupExpanded} aria-label={t('settings.expandDetails')}>
                <ChevronDown size={16} className={`transition-transform ${checkupExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {checkupExpanded && (
              <div className="grid gap-2">
                {checkupItems.map(item => {
                  const itemWeight = item.weight ?? 1;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={item.onClick}
                       className={`group rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                         item.active
                           ? 'border-emerald-500/20 bg-white hover:border-emerald-400/70 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                           : item.severity === 'high'
                             ? 'border-red-500/20 bg-white hover:border-red-400/70 dark:border-red-500/25 dark:bg-red-500/10'
                             : 'border-amber-500/20 bg-white hover:border-amber-400/70 dark:border-amber-500/25 dark:bg-amber-500/10'
                       }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.active ? <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-300" /> : <AlertTriangle size={14} className={item.severity === 'high' ? 'text-red-600 dark:text-red-300' : 'text-amber-600 dark:text-amber-300'} />}
                            <p className="text-xs font-semibold text-surface-950 dark:text-surface-50">{item.label}</p>
                             <span className="rounded-full bg-surface-50 px-2 py-0.5 text-[0.6rem] font-semibold text-surface-700 ring-1 ring-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:ring-surface-700">
                              {item.active ? `+${itemWeight}` : '+0'}/{itemWeight}
                            </span>
                          </div>
                          <p className="mt-1 text-[0.7rem] leading-relaxed text-surface-600 dark:text-surface-300">{item.desc}</p>
                        </div>
                        <span className={actionButtonClass}>
                          <ArrowDown size={13} />
                          {item.action || t('settings.goToSetting', { default: 'Đến cài đặt' })}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
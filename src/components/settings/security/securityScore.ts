export type SecurityRiskLevel = 'low' | 'medium' | 'high';

export type SecurityScoreItem = {
  key: string;
  label: string;
  active: boolean;
  weight?: number;
  severity?: 'low' | 'medium' | 'high';
  desc?: string;
  action?: string;
  onClick?: () => void;
};

export type SecurityScoreSummary = {
  enabledWeight: number;
  totalWeight: number;
  percent: number;
  riskLevel: SecurityRiskLevel;
};

export type SecurityCheckupItem = Required<Pick<SecurityScoreItem, 'key' | 'label' | 'active'>> & {
  weight: number;
  severity: 'low' | 'medium' | 'high';
  desc: string;
  action?: string;
  onClick?: () => void;
};

export function calculateSecurityScore(items: SecurityScoreItem[]): SecurityScoreSummary {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  const enabledWeight = items.reduce((sum, item) => sum + (item.active ? (item.weight ?? 1) : 0), 0);
  const percent = totalWeight ? Math.round((enabledWeight / totalWeight) * 100) : 0;
  const riskLevel: SecurityRiskLevel = percent >= 80 ? 'low' : percent >= 55 ? 'medium' : 'high';
  return { enabledWeight, totalWeight, percent, riskLevel };
}

export function buildSecurityCheckup(items: SecurityScoreItem[]): SecurityCheckupItem[] {
  return items.map(item => ({
    key: item.key,
    label: item.label,
    active: item.active,
    weight: item.weight ?? 1,
    severity: item.severity ?? 'medium',
    desc: item.desc ?? '',
    action: item.action,
    onClick: item.onClick,
  })).sort((a, b) => {
    if (a.active !== b.active) return a.active ? 1 : -1;
    const severityRank = { high: 3, medium: 2, low: 1 };
    return severityRank[b.severity] - severityRank[a.severity] || b.weight - a.weight;
  });
}

export function getSecurityScoreTone(percent: number) {
  if (percent >= 80) return 'from-emerald-500 to-brand-500 text-emerald-100';
  if (percent >= 55) return 'from-amber-500 to-brand-500 text-amber-100';
  return 'from-red-500 to-amber-500 text-red-100';
}
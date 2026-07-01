import { Preferences } from '@capacitor/preferences';
import { VANITY_REPORTS_KEY } from '../../components/create-wallet/constants';

const VANITY_REPORT_LIMIT = 50;

export type VanitySessionReportResult = 'completed' | 'stopped' | 'timeLimit' | 'workerError' | 'saved' | 'noMatch';

export type VanitySessionReport = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  speedPerSecond: number;
  pattern: {
    prefix: string;
    suffix: string;
    customPatterns: string[];
    network: string;
    generationMode: 'privateKey' | 'mnemonic';
  };
  candidateCount: number;
  result: {
    status: VanitySessionReportResult;
    reason: string;
    foundCount: number;
    savedCount: number;
    primaryCount: number;
    extraCount: number;
  };
};

export type VanitySessionReportInput = Omit<VanitySessionReport, 'id' | 'endedAt'> & {
  id?: string;
  endedAt?: string;
};

const isReportList = (value: unknown): value is VanitySessionReport[] =>
  Array.isArray(value) && value.every(report => typeof report === 'object' && report !== null);

export const readVanitySessionReports = async (): Promise<VanitySessionReport[]> => {
  const { value } = await Preferences.get({ key: VANITY_REPORTS_KEY });
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return isReportList(parsed) ? parsed.slice(0, VANITY_REPORT_LIMIT) : [];
  } catch {
    return [];
  }
};

export const clearVanitySessionReports = async (): Promise<void> => {
  await Preferences.remove({ key: VANITY_REPORTS_KEY });
};

export const appendVanitySessionReport = async (
  input: VanitySessionReportInput
): Promise<VanitySessionReport> => {
  const endedAt = input.endedAt || new Date().toISOString();
  const report: VanitySessionReport = {
    ...input,
    id: input.id || `${endedAt}-${Math.random().toString(16).slice(2)}`,
    endedAt,
  };

  const existingReports = await readVanitySessionReports();
  await Preferences.set({
    key: VANITY_REPORTS_KEY,
    value: JSON.stringify([report, ...existingReports].slice(0, VANITY_REPORT_LIMIT)),
  });

  return report;
};
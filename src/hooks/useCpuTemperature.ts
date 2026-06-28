import { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CpuThermal, type CpuTemperatureResult, type CpuThermalStatus } from '../plugins/cpuThermal';

export type CpuTemperatureState = CpuTemperatureResult & {
  status: CpuThermalStatus;
  label: string;
};

type UseCpuTemperatureOptions = {
  active: boolean;
  enabled: boolean;
  warningC: number;
  pauseC: number;
  criticalC: number;
  intervalMs?: number;
};

const roundTemperature = (value: number): number => Math.round(value * 10) / 10;

const getStatus = (
  available: boolean,
  temperatureC: number | null | undefined,
  warningC: number,
  pauseC: number,
  criticalC: number
): CpuThermalStatus => {
  if (!available || typeof temperatureC !== 'number' || !Number.isFinite(temperatureC)) return 'unavailable';
  if (temperatureC >= criticalC) return 'critical';
  if (temperatureC >= pauseC) return 'hot';
  if (temperatureC >= warningC) return 'warm';
  return 'normal';
};

const normalizeResult = (
  result: CpuTemperatureResult | null,
  warningC: number,
  pauseC: number,
  criticalC: number
): CpuTemperatureState => {
  const rawTemperature = result?.temperatureC;
  const temperatureC = typeof rawTemperature === 'number' && Number.isFinite(rawTemperature)
    ? roundTemperature(rawTemperature)
    : null;
  const available = !!result?.available && temperatureC !== null;
  const status = getStatus(available, temperatureC, warningC, pauseC, criticalC);

  return {
    available,
    temperatureC,
    source: result?.source,
    label: temperatureC === null ? 'CPU --°C' : `CPU ${temperatureC.toFixed(temperatureC % 1 === 0 ? 0 : 1)}°C`,
    sampledAt: result?.sampledAt || Date.now(),
    status,
  };
};

export function useCpuTemperature({
  active,
  enabled,
  warningC,
  pauseC,
  criticalC,
  intervalMs = 2500,
}: UseCpuTemperatureOptions): CpuTemperatureState {
  const [state, setState] = useState<CpuTemperatureState>(() =>
    normalizeResult(null, warningC, pauseC, criticalC)
  );

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const readTemperature = async () => {
      if (!enabled || !active || !Capacitor.isNativePlatform()) {
        if (!cancelled) setState(prev => ({ ...prev, status: 'unavailable', available: false }));
        return;
      }

      try {
        const result = await CpuThermal.getTemperature();
        if (!cancelled) setState(normalizeResult(result, warningC, pauseC, criticalC));
      } catch {
        if (!cancelled) setState(normalizeResult(null, warningC, pauseC, criticalC));
      }
    };

    void readTemperature();
    if (enabled && active) timer = setInterval(readTemperature, Math.max(1000, intervalMs));

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [active, enabled, warningC, pauseC, criticalC, intervalMs]);

  return useMemo(
    () => ({
      ...state,
      status: getStatus(state.available, state.temperatureC, warningC, pauseC, criticalC),
      label: state.temperatureC === null || state.temperatureC === undefined
        ? 'CPU --°C'
        : `CPU ${state.temperatureC.toFixed(state.temperatureC % 1 === 0 ? 0 : 1)}°C`,
    }),
    [state, warningC, pauseC, criticalC]
  );
}

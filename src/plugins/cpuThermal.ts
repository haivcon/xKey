import { registerPlugin } from '@capacitor/core';

export type CpuThermalStatus = 'normal' | 'warm' | 'hot' | 'critical' | 'unavailable';

export type CpuTemperatureResult = {
  available: boolean;
  temperatureC?: number | null;
  source?: string;
  label?: string;
  sampledAt?: number;
};

export interface CpuThermalPlugin {
  getTemperature(): Promise<CpuTemperatureResult>;
}

export const CpuThermal = registerPlugin<CpuThermalPlugin>('CpuThermal');

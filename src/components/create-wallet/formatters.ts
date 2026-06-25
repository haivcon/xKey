export const formatCompactNumber = (value: number) => {
  try {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  } catch {
    return String(value);
  }
};

export const formatVanitySeconds = (seconds: number | string) => {
  const safeSeconds = Number(seconds) || 0;
  if (safeSeconds < 60) return `${safeSeconds.toFixed(1)}s`;
  const minutes = Math.floor(safeSeconds / 60);
  const rest = Math.floor(safeSeconds % 60);
  if (minutes < 60) return `${minutes}m ${rest}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};
export const asText = (value: unknown): string => (
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : ''
);

export const asNumber = (value: unknown): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0
);

export const asStringArray = (value: unknown): string[] => (
  Array.isArray(value) ? value.map(item => String(item)) : []
);
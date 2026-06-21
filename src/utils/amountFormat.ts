export const normalizeAmountInput = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const raw = String(value).replace(/,/g, '').replace(/[^\d.]/g, '');
  const [integer = '', ...decimalParts] = raw.split('.');
  const decimal = decimalParts.join('');
  const normalizedInteger = integer.replace(/^0+(?=\d)/, '') || (raw.startsWith('.') ? '0' : integer);
  return decimalParts.length > 0 ? `${normalizedInteger}.${decimal}` : normalizedInteger;
};

export const parseAmount = (value: unknown): number => {
  const normalized = normalizeAmountInput(value);
  if (!normalized || normalized === '.') return 0;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatAmountInput = (value: unknown): string => {
  const normalized = normalizeAmountInput(value);
  if (!normalized) return '';

  const hasDecimal = normalized.includes('.');
  const [integerPart, decimalPart = ''] = normalized.split('.');
  const formattedInteger = integerPart
    ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : '0';

  if (!hasDecimal) return formattedInteger;
  return `${formattedInteger}.${decimalPart}`;
};

export const formatAssetAmount = (
  value: unknown,
  { minimumFractionDigits = 2, maximumFractionDigits = 4 }: Intl.NumberFormatOptions = {},
): string => {
  const amount = parseAmount(value);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
};

export const formatAssetValue = (value: unknown, unit = '$'): string => {
  const cleanUnit = (unit || '$').trim();
  const needsSpace = /^[A-Za-z0-9]+$/.test(cleanUnit);
  return `${cleanUnit}${needsSpace ? ' ' : ''}${formatAssetAmount(value)}`;
};

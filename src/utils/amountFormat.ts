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

const getCompactUnit = (integerPart: string): { exponent: number; suffix: string } | null => {
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '') || '0';
  const length = normalizedInteger.length;

  if (length > 12) return { exponent: 12, suffix: 'T' };
  if (length > 9) return { exponent: 9, suffix: 'B' };
  if (length > 6) return { exponent: 6, suffix: 'M' };
  if (length > 3) return { exponent: 3, suffix: 'K' };
  return null;
};

const divideDecimalByPowerOfTenExactly = (integerPart: string, decimalPart: string, exponent: number): string => {
  const cleanInteger = (integerPart.replace(/^0+(?=\d)/, '') || '0').replace(/\D/g, '');
  const cleanDecimal = decimalPart.replace(/\D/g, '');
  const digits = `${cleanInteger}${cleanDecimal}`.replace(/^0+(?=\d)/, '') || '0';
  const pointIndex = cleanInteger.length - exponent;

  const whole = pointIndex > 0 ? digits.slice(0, pointIndex) : '0';
  const fractionPrefix = pointIndex < 0 ? '0'.repeat(Math.abs(pointIndex)) : '';
  const rawFraction = `${fractionPrefix}${pointIndex > 0 ? digits.slice(pointIndex) : digits}`;
  const fraction = rawFraction.slice(0, 2).replace(/0+$/, '');

  return fraction ? `${whole}.${fraction}` : whole;
};

export const formatCompactAmount = (value: unknown, unit = '$', locale = 'en-US'): string => {
  const normalized = normalizeAmountInput(value);
  if (!normalized) return formatAssetValue(value, unit);

  const [integerPart = '0', decimalPart = ''] = normalized.split('.');
  const compactUnit = getCompactUnit(integerPart);

  if (!compactUnit) {
    return formatAssetValue(value, unit);
  }

  const cleanUnit = (unit || '$').trim();
  const needsSpace = /^[A-Za-z0-9]+$/.test(cleanUnit);
  const prefix = `${cleanUnit}${needsSpace ? ' ' : ''}`;
  const decimalSeparator = (0.1).toLocaleString(locale).substring(1, 2);
  const exactCompactAmount = divideDecimalByPowerOfTenExactly(integerPart, decimalPart, compactUnit.exponent)
    .replace('.', decimalSeparator);

  return `${prefix}${exactCompactAmount}${compactUnit.suffix}`;
};

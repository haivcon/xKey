export type PasswordChallengeChoice = {
  id: string;
  char: string;
  source: 'password' | 'noise';
};

const NOISE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*+-=?';

const randomInt = (maxExclusive: number): number => {
  if (maxExclusive <= 0) return 0;
  const cryptoApi = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi?.getRandomValues) {
    const buffer = new Uint32Array(1);
    cryptoApi.getRandomValues(buffer);
    return buffer[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
};

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

export const createPasswordChallengeChoices = (
  password: string,
  noiseCount = Math.max(8, Math.min(24, password.length + 6)),
): PasswordChallengeChoice[] => {
  const passwordChoices = Array.from(password).map((char, index) => ({
    id: `p-${index}-${char.charCodeAt(0)}`,
    char,
    source: 'password' as const,
  }));

  const noiseChoices = Array.from({ length: noiseCount }).map((_, index) => ({
    id: `n-${index}-${randomInt(1_000_000)}`,
    char: NOISE_CHARS[randomInt(NOISE_CHARS.length)] || '*',
    source: 'noise' as const,
  }));

  return shuffle([...passwordChoices, ...noiseChoices]);
};

export const validatePasswordChallengeSequence = (password: string, selected: string[]): boolean => (
  selected.join('') === password
);

export const getPasswordChallengeProgress = (password: string, selected: string[]): {
  isComplete: boolean;
  isPrefixValid: boolean;
  isValid: boolean;
} => {
  const selectedText = selected.join('');
  const isComplete = selected.length === Array.from(password).length;
  const isPrefixValid = password.startsWith(selectedText);
  return {
    isComplete,
    isPrefixValid,
    isValid: isComplete && selectedText === password,
  };
};
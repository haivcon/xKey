export const withTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs: number,
  onTimeout: () => Error = () => new Error(`Operation timed out after ${timeoutMs}ms`),
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(onTimeout()), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

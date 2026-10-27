/**
 * Timeout utilities to enforce a maximum duration on server-side calls.
 */

export function createTimeoutSignal(
  ms = 4000,
  label = 'Server fetch',
): {signal: AbortSignal; clear: () => void} {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    console.error(`[Timeout] ${label} exceeded ${ms}ms timeout (aborted)`);
    controller.abort();
  }, ms);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms = 4000,
  label = 'Server operation',
  fallback?: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      const msg = `[Timeout] ${label} exceeded ${ms}ms timeout`;
      console.error(msg);
      if (fallback !== undefined) {
        resolve(fallback);
      } else {
        reject(new Error(msg));
      }
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    console.error(`[Error] ${label} failed:`, error);
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

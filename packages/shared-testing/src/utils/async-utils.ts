/**
 * Wait for a specified amount of time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to become true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, message = 'Condition was not met' } = options;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await delay(interval);
  }
  
  throw new Error(`${message} within ${timeout}ms`);
}

/**
 * Wait for an async function to not throw an error
 */
export async function waitForNoThrow<T>(
  fn: () => Promise<T>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {}
): Promise<T> {
  const { timeout = 5000, interval = 100, message = 'Function continued to throw' } = options;
  
  const startTime = Date.now();
  let lastError: Error;
  
  while (Date.now() - startTime < timeout) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await delay(interval);
    }
  }
  
  throw new Error(`${message} within ${timeout}ms. Last error: ${lastError!.message}`);
}

/**
 * Retry an async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 5000,
    backoffFactor = 2,
    shouldRetry = () => true,
  } = options;
  
  let attempt = 1;
  let currentDelay = initialDelay;
  
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts || !shouldRetry(err)) {
        throw err;
      }
      
      await delay(Math.min(currentDelay, maxDelay));
      currentDelay *= backoffFactor;
      attempt++;
    }
  }
  
  throw new Error('Retry failed - this should never be reached');
}

/**
 * Run multiple async functions concurrently with a limit
 */
export async function concurrent<T>(
  tasks: (() => Promise<T>)[],
  concurrencyLimit: number = 5
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    
    const promise = task().then(result => {
      results[i] = result;
    });
    
    executing.push(promise);
    
    if (executing.length >= concurrencyLimit) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }
  
  await Promise.all(executing);
  return results;
}

/**
 * Create a timeout promise that rejects after specified time
 */
export function timeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message || `Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Create a debounced function that delays execution
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    clearTimeout(timeoutId);
    
    return new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        resolve(fn(...args));
      }, delay);
    });
  };
}

/**
 * Create a throttled function that limits execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  let lastExecution = 0;
  
  return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    const now = Date.now();
    
    if (now - lastExecution >= delay) {
      lastExecution = now;
      return fn(...args);
    }
    
    return undefined;
  };
}
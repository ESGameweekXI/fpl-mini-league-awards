const FPL_BASE = '/api/fpl';

async function fetchWithRetry<T>(path: string): Promise<T> {
  const url = `${FPL_BASE}/${path}`;
  let lastError: Error;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
      return (await res.json()) as T;
    } catch (e) {
      lastError = e as Error;
    }
  }
  throw lastError!;
}

export async function fetchFPL<T>(path: string): Promise<T> {
  return fetchWithRetry<T>(path);
}

export async function batchFetch<T>(
  paths: string[],
  batchSize = 10,
  onProgress?: (progress: number) => void
): Promise<Array<T | null>> {
  const results: Array<T | null> = [];

  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map((p) => fetchWithRetry<T>(p))
    );
    for (const result of settled) {
      results.push(result.status === 'fulfilled' ? result.value : null);
    }
    onProgress?.((i + batch.length) / paths.length);
  }

  return results;
}

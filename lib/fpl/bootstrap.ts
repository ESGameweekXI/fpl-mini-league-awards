import { Bootstrap } from './types';
import { fetchFPL } from './fetcher';

let cached: Bootstrap | null = null;

export async function getBootstrap(): Promise<Bootstrap> {
  if (cached) return cached;
  cached = await fetchFPL<Bootstrap>('bootstrap-static/');
  return cached;
}

export function clearBootstrapCache(): void {
  cached = null;
}

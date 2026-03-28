// Server-side only — called from API routes or Server Actions.
import { supabaseServer } from './server-client';
import type {
  Bootstrap,
  LeagueStandings,
  ManagerHistory,
  GWPicks,
  Transfer,
} from '../fpl/types';

// ── Direct FPL fetcher (bypasses the /api/fpl proxy — no CORS on server) ──

const FPL_API = 'https://fantasy.premierleague.com/api';

const FPL_HEADERS: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Referer: 'https://fantasy.premierleague.com/',
  Origin: 'https://fantasy.premierleague.com',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-mode': 'cors',
  'sec-fetch-dest': 'empty',
};

async function fetchFPLDirect<T>(path: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch(`${FPL_API}/${path}`, {
        headers: FPL_HEADERS,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function batchFetchDirect<T>(
  paths: string[],
  batchSize = 10,
  onBatch?: (done: number, total: number) => void
): Promise<Array<T | null>> {
  const results: Array<T | null> = [];
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map((p) => fetchFPLDirect<T>(p))
    );
    for (const r of settled) {
      results.push(r.status === 'fulfilled' ? r.value : null);
    }
    onBatch?.(Math.min(i + batchSize, paths.length), paths.length);
  }
  return results;
}

// ── Supabase upsert helpers ──────────────────────────────────────

function now() {
  return new Date().toISOString();
}

async function mustUpsert(
  table: string,
  data: object[],
  onConflict: string
) {
  if (data.length === 0) return;
  const { error } = await supabaseServer
    .from(table)
    .upsert(data, { onConflict });
  if (error) throw new Error(`Supabase upsert ${table}: ${error.message}`);
}

// Upsert in fixed-size chunks to stay under Supabase payload limits.
async function chunkedUpsert(
  table: string,
  rows: object[],
  onConflict: string,
  chunkSize = 500
) {
  const totalChunks = Math.ceil(rows.length / chunkSize);
  console.log(`[chunkedUpsert] ${table}: ${rows.length} rows → ${totalChunks} chunk(s)`);
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const chunkIndex = Math.floor(i / chunkSize) + 1;
    console.log(`[chunkedUpsert] ${table}: chunk ${chunkIndex}/${totalChunks} (${chunk.length} rows)`);
    await mustUpsert(table, chunk, onConflict);
  }
}

// ── Public API ───────────────────────────────────────────────────

export interface SyncResult {
  leagueName: string;
  managerIds: number[];
}

export async function syncLeague(
  leagueId: number,
  onProgress?: (pct: number, message: string) => void
): Promise<SyncResult> {
  // ── Phase 1: Bootstrap (0 → 8%) ─────────────────────────────────
  onProgress?.(0, 'Fetching FPL bootstrap data…');
  const bootstrap = await fetchFPLDirect<Bootstrap>('bootstrap-static/');

  await mustUpsert(
    'teams',
    bootstrap.teams.map((t) => ({
      id: t.id,
      name: t.name,
      short_name: t.short_name,
      updated_at: now(),
    })),
    'id'
  );

  await mustUpsert(
    'gameweeks',
    bootstrap.events.map((e) => ({
      id: e.id,
      name: e.name,
      deadline_time: e.deadline_time || null,
      finished: e.finished,
      is_current: e.is_current,
      is_next: e.is_next,
      updated_at: now(),
    })),
    'id'
  );

  await chunkedUpsert(
    'players',
    bootstrap.elements.map((p) => ({
      id: p.id,
      web_name: p.web_name,
      first_name: p.first_name,
      second_name: p.second_name,
      element_type: p.element_type,
      team_id: p.team,
      now_cost: p.now_cost,
      total_points: p.total_points,
      status: p.status,
      updated_at: now(),
    })),
    'id'
  );

  onProgress?.(8, 'Fetching league standings…');

  // ── Phase 2: League & managers (8 → 12%) ────────────────────────
  const standings = await fetchFPLDirect<LeagueStandings>(
    `leagues-classic/${leagueId}/standings/`
  );
  const leagueName = standings.league.name;
  const leagueManagers = standings.standings.results.slice(0, 20);
  const managerIds = leagueManagers.map((m) => m.entry);

  await mustUpsert(
    'leagues',
    [{ id: leagueId, name: leagueName, updated_at: now() }],
    'id'
  );

  await mustUpsert(
    'managers',
    leagueManagers.map((m) => ({
      id: m.entry,
      entry_name: m.entry_name,
      player_name: m.player_name,
      updated_at: now(),
    })),
    'id'
  );

  await mustUpsert(
    'league_managers',
    leagueManagers.map((m) => ({
      league_id: leagueId,
      manager_id: m.entry,
      rank: m.rank,
      total_points: m.total,
    })),
    'league_id,manager_id'
  );

  onProgress?.(12, 'Fetching manager histories…');

  // ── Phase 3: Histories (12 → 28%) ───────────────────────────────
  const historyPaths = managerIds.map((id) => `entry/${id}/history/`);
  const historyResults = await batchFetchDirect<ManagerHistory>(
    historyPaths,
    10,
    (done, total) =>
      onProgress?.(12 + (done / total) * 16, 'Fetching manager histories…')
  );

  const startedEvents: Record<number, number> = {};

  for (let i = 0; i < managerIds.length; i++) {
    const managerId = managerIds[i];
    const history = historyResults[i];
    if (!history || history.current.length === 0) continue;

    const startedEvent = history.current[0].event;
    startedEvents[managerId] = startedEvent;

    const { error: seErr } = await supabaseServer
      .from('managers')
      .update({ started_event: startedEvent, updated_at: now() })
      .eq('id', managerId);
    if (seErr) throw new Error(`Update started_event: ${seErr.message}`);

    await mustUpsert(
      'manager_history',
      history.current.map((gw) => ({
        manager_id: managerId,
        event: gw.event,
        points: gw.points,
        total_points: gw.total_points,
        rank: gw.rank ?? null,
        overall_rank: gw.rank ?? null, // history.current.rank is overall rank
      })),
      'manager_id,event'
    );
  }

  onProgress?.(28, 'Fetching transfer histories…');

  // ── Phase 4: Transfers (28 → 42%) ───────────────────────────────
  const transferPaths = managerIds.map((id) => `entry/${id}/transfers/`);
  const transferResults = await batchFetchDirect<Transfer[]>(
    transferPaths,
    10,
    (done, total) =>
      onProgress?.(28 + (done / total) * 14, 'Fetching transfer histories…')
  );

  for (let i = 0; i < managerIds.length; i++) {
    const managerId = managerIds[i];
    const transfers = transferResults[i];
    if (!transfers) continue;

    // Delete then re-insert — transfers have no natural unique key
    const { error: delErr } = await supabaseServer
      .from('manager_transfers')
      .delete()
      .eq('manager_id', managerId);
    if (delErr) throw new Error(`Delete transfers: ${delErr.message}`);

    if (transfers.length > 0) {
      const { error: insErr } = await supabaseServer
        .from('manager_transfers')
        .insert(
          transfers.map((t) => ({
            manager_id: managerId,
            event: t.event,
            element_in: t.element_in,
            element_in_cost: t.element_in_cost,
            element_out: t.element_out,
            element_out_cost: t.element_out_cost,
            time: t.time || null,
          }))
        );
      if (insErr) throw new Error(`Insert transfers: ${insErr.message}`);
    }
  }

  onProgress?.(42, 'Fetching squad picks…');

  // ── Phase 5: Picks (42 → 100%) ──────────────────────────────────
  const finishedGws = bootstrap.events
    .filter((e) => e.finished)
    .map((e) => e.id);

  const picksMeta: Array<{ managerId: number; gw: number }> = [];
  const picksPaths: string[] = [];

  for (const managerId of managerIds) {
    const startedEvent = startedEvents[managerId] ?? 1;
    console.log(`[picks] manager ${managerId}: startedEvent=${startedEvent} (${startedEvents[managerId] === undefined ? 'defaulted' : 'from history'})`);
    for (const gw of finishedGws) {
      if (gw < startedEvent) continue;
      picksMeta.push({ managerId, gw });
      picksPaths.push(`entry/${managerId}/event/${gw}/picks/`);
    }
  }

  console.log(`[picks] queued ${picksPaths.length} fetch requests for ${managerIds.length} managers across ${finishedGws.length} finished GWs`);

  const picksResults = await batchFetchDirect<GWPicks>(
    picksPaths,
    5,
    (done, total) =>
      onProgress?.(
        42 + (done / total) * 58,
        `Fetching squad picks… (${done}/${total})`
      )
  );

  let nullCount = 0;
  let emptyCount = 0;
  const pickRows: object[] = [];
  for (let i = 0; i < picksMeta.length; i++) {
    const { managerId, gw } = picksMeta[i];
    const gwPicks = picksResults[i];
    if (!gwPicks) {
      nullCount++;
      console.warn(`[picks] null result for manager ${managerId} GW${gw} (fetch failed)`);
      continue;
    }
    if (gwPicks.picks.length === 0) {
      emptyCount++;
      console.warn(`[picks] empty picks array for manager ${managerId} GW${gw}`);
      continue;
    }
    for (const pick of gwPicks.picks) {
      pickRows.push({
        manager_id: managerId,
        event: gw,
        element: pick.element,
        position: pick.position,
        multiplier: pick.multiplier,
        is_captain: pick.is_captain,
        is_vice_captain: pick.is_vice_captain,
      });
    }
  }

  console.log(`[picks] summary: ${picksMeta.length} expected, ${nullCount} null fetches, ${emptyCount} empty arrays, ${pickRows.length} rows to upsert`);

  await chunkedUpsert('manager_picks', pickRows, 'manager_id,event,element');

  onProgress?.(100, 'Sync complete');

  return { leagueName, managerIds };
}

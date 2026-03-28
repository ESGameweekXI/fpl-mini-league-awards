import { supabaseServer as supabase } from './server-client';
import type {
  Manager,
  ManagerData,
  ManagerHistory,
  GWPicks,
  Transfer,
} from '../fpl/types';

const STALE_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 hours

// ── League freshness ─────────────────────────────────────────────

export async function getLastSyncTime(leagueId: number): Promise<Date | null> {
  const { data, error } = await supabase
    .from('leagues')
    .select('updated_at')
    .eq('id', leagueId)
    .maybeSingle();

  if (error || !data) return null;
  return new Date(data.updated_at);
}

export async function isLeagueStale(leagueId: number): Promise<boolean> {
  const lastSync = await getLastSyncTime(leagueId);
  if (!lastSync) return true;
  return Date.now() - lastSync.getTime() > STALE_THRESHOLD_MS;
}

// ── Manager data ─────────────────────────────────────────────────

export async function getLeagueManagers(
  leagueId: number
): Promise<ManagerData[]> {
  // 1. Manager IDs in this league
  const { data: lmRows, error: lmErr } = await supabase
    .from('league_managers')
    .select('manager_id')
    .eq('league_id', leagueId);

  if (lmErr) throw new Error(`getLeagueManagers: ${lmErr.message}`);
  if (!lmRows?.length) return [];

  const managerIds = lmRows.map((r) => r.manager_id as number);
  console.log(`[getLeagueManagers] querying ${managerIds.length} manager IDs:`, managerIds);

  // 2. Fetch manager details, history, picks, transfers in parallel
  // .range(0, 19999) explicitly overrides Supabase's default 1000-row cap
  console.log(`[getLeagueManagers] fetching picks for ${managerIds.length} managers with range(0, 19999)`);
  const [managersRes, historyRes, picksRes, transfersRes] = await Promise.all([
    supabase
      .from('managers')
      .select('id, entry_name, player_name, started_event')
      .in('id', managerIds),
    supabase
      .from('manager_history')
      .select('manager_id, event, points, total_points, rank, overall_rank')
      .in('manager_id', managerIds)
      .order('event', { ascending: true })
      .range(0, 19999),
    supabase
      .from('manager_picks')
      .select(
        'manager_id, event, element, position, multiplier, is_captain, is_vice_captain'
      )
      .in('manager_id', managerIds)
      .range(0, 19999),
    supabase
      .from('manager_transfers')
      .select(
        'manager_id, event, element_in, element_in_cost, element_out, element_out_cost, time'
      )
      .in('manager_id', managerIds)
      .range(0, 19999),
  ]);
  console.log(`[getLeagueManagers] picks raw row count: ${picksRes.data?.length ?? 'null'}, error: ${picksRes.error?.message ?? 'none'}`);

  if (managersRes.error) throw new Error(`managers query: ${managersRes.error.message}`);
  if (historyRes.error)  throw new Error(`history query: ${historyRes.error.message}`);
  if (picksRes.error)    throw new Error(`picks query: ${picksRes.error.message}`);
  if (transfersRes.error) throw new Error(`transfers query: ${transfersRes.error.message}`);

  const allHistory   = historyRes.data   ?? [];
  const allPicks     = picksRes.data     ?? [];
  const allTransfers = transfersRes.data ?? [];

  const uniquePicksManagerIds = new Set(allPicks.map((p) => p.manager_id));
  console.log(`[getLeagueManagers] picks query returned ${allPicks.length} rows across ${uniquePicksManagerIds.size}/${managerIds.length} managers`);
  if (uniquePicksManagerIds.size < managerIds.length) {
    const missing = managerIds.filter((id) => !uniquePicksManagerIds.has(id));
    console.warn(`[getLeagueManagers] picks missing for manager IDs:`, missing);
  }

  return (managersRes.data ?? []).map((m) => {
    const manager: Manager = {
      id: m.id,
      name: m.player_name,
      teamName: m.entry_name,
    };

    const startedEvent: number = m.started_event ?? 1;

    // Build ManagerHistory
    const historyRows = allHistory.filter((h) => Number(h.manager_id) === m.id);
    const history: ManagerHistory = {
      current: historyRows.map((h) => ({
        event: Number(h.event),
        points: Number(h.points),
        total_points: Number(h.total_points),
        rank: h.rank != null ? Number(h.rank) : 0,
        // These fields aren't stored in the DB; award calculators don't need them
        event_transfers: 0,
        event_transfers_cost: 0,
        value: 0,
      })),
      past: [],
      chips: [],
    };

    // Build picks map (Record<gw, GWPicks>)
    const picksRows = allPicks.filter((p) => Number(p.manager_id) === m.id);
    const picksMap: Record<number, GWPicks> = {};
    for (const row of picksRows) {
      const gw = Number(row.event);
      if (!picksMap[gw]) {
        picksMap[gw] = {
          active_chip: null,
          entry_history: {
            event: gw,
            points: 0,
            total_points: 0,
            event_transfers: 0,
            event_transfers_cost: 0,
            value: 0,
          },
          picks: [],
        };
      }
      picksMap[gw].picks.push({
        element: Number(row.element),
        position: Number(row.position),
        multiplier: Number(row.multiplier),
        is_captain: row.is_captain,
        is_vice_captain: row.is_vice_captain,
      });
    }

    // Build transfers array
    const transfers: Transfer[] = allTransfers
      .filter((t) => t.manager_id === m.id)
      .map((t) => ({
        element_in: t.element_in,
        element_out: t.element_out,
        element_in_cost: t.element_in_cost,
        element_out_cost: t.element_out_cost,
        event: t.event,
        time: t.time ?? '',
      }));

    return {
      manager,
      history,
      picks: picksMap,
      transfers,
      startedEvent,
    } satisfies ManagerData;
  });
}

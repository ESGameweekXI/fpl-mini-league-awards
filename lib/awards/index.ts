import { fetchFPL, batchFetch } from '../fpl/fetcher';
import { getBootstrap, clearBootstrapCache } from '../fpl/bootstrap';
import {
  EntryData,
  LeagueStandings,
  ManagerHistory,
  GWPicks,
  Transfer,
  Bootstrap,
  GWLive,
  ManagerData,
  AllData,
  AwardResult,
  Manager,
} from '../fpl/types';
import { calcBenchWarmer } from './benchWarmer';
import { calcRevolvingDoor } from './revolvingDoor';
import { calcChipMaster } from './chipMaster';
import { calcCaptainKiller } from './captainKiller';
import { calcSheep } from './sheep';
import { calcSniper } from './sniper';
import { calcLoyalist } from './loyalist';
import { calcDifferentialKing } from './differentialKing';

export type ProgressCallback = (progress: number, status: string) => void;

export async function computeAllAwards(
  teamId: number,
  leagueId: number,
  onProgress?: ProgressCallback
): Promise<AwardResult[]> {
  onProgress?.(0.02, 'Fetching bootstrap data…');

  clearBootstrapCache();
  const bootstrap = await getBootstrap();

  // Determine finished gameweeks
  const finishedGws = bootstrap.events
    .filter((e) => e.finished)
    .map((e) => e.id)
    .sort((a, b) => a - b);

  if (finishedGws.length === 0) {
    throw new Error('No finished gameweeks yet. Check back after GW1!');
  }

  onProgress?.(0.05, 'Fetching league standings…');

  const standings = await fetchFPL<LeagueStandings>(
    `leagues-classic/${leagueId}/standings/`
  );

  const leagueManagers = standings.standings.results;

  if (leagueManagers.length < 2) {
    throw new Error('League needs at least 2 managers to generate awards.');
  }

  const capped = leagueManagers.slice(0, 20);

  const managers: Manager[] = capped.map((s) => ({
    id: s.entry,
    name: s.player_name,
    teamName: s.entry_name,
  }));

  onProgress?.(0.08, 'Building fetch queue…');

  // Build all URL paths
  const historyPaths = managers.map((m) => `entry/${m.id}/history/`);
  const transferPaths = managers.map((m) => `entry/${m.id}/transfers/`);

  // Per-manager per-GW picks URLs
  const picksMeta: Array<{ managerId: number; gw: number }> = [];
  const picksPaths: string[] = [];

  for (const manager of managers) {
    for (const gw of finishedGws) {
      picksMeta.push({ managerId: manager.id, gw });
      picksPaths.push(`entry/${manager.id}/event/${gw}/picks/`);
    }
  }

  const totalCalls =
    historyPaths.length +
    transferPaths.length +
    picksPaths.length;

  let completedCalls = 0;
  const baseProgress = 0.08;
  const fetchProgress = 0.88; // 8% -> 96%

  function makeProgressHandler(batchLabel: string, batchSize: number) {
    return (batchProgress: number) => {
      completedCalls += Math.round(batchProgress * batchSize);
      const overall =
        baseProgress + (completedCalls / totalCalls) * fetchProgress;
      onProgress?.(Math.min(overall, 0.96), batchLabel);
    };
  }

  // Fetch histories
  onProgress?.(0.1, 'Fetching manager histories…');
  const historyResults = await batchFetch<ManagerHistory>(
    historyPaths,
    10,
    makeProgressHandler('Fetching manager histories…', historyPaths.length)
  );

  // Fetch transfers
  onProgress?.(0.2, 'Fetching transfer histories…');
  const transferResults = await batchFetch<Transfer[]>(
    transferPaths,
    10,
    makeProgressHandler('Fetching transfer histories…', transferPaths.length)
  );

  // Load GW live data from Supabase
  onProgress?.(0.3, 'Loading player stats…');
  const { supabaseServer } = await import('../supabase/server-client');
  const { data: playerStats } = await supabaseServer
    .from('player_gameweek_stats')
    .select('player_id, event, total_points')
    .in('event', finishedGws);

  // Fetch all picks
  onProgress?.(0.4, 'Fetching squad picks…');
  const picksResults = await batchFetch<GWPicks>(
    picksPaths,
    10,
    makeProgressHandler('Fetching squad picks…', picksPaths.length)
  );

  onProgress?.(0.96, 'Processing data…');

  // Build gwLive map from Supabase player stats
  const gwLiveMap: Record<number, GWLive | null> = {};
  for (const gw of finishedGws) {
    const gwStats = playerStats?.filter((s) => Number(s.event) === gw) ?? [];
    gwLiveMap[gw] = gwStats.length > 0
      ? {
          elements: gwStats.map((s) => ({
            id: Number(s.player_id),
            stats: {
              total_points: Number(s.total_points),
              minutes: 0,
              goals_scored: 0,
              assists: 0,
              clean_sheets: 0,
              goals_conceded: 0,
              yellow_cards: 0,
              red_cards: 0,
              saves: 0,
              bonus: 0,
              bps: 0,
            },
            explain: [],
          })),
        }
      : null;
  }

  // Build manager data
  const managerDataList: ManagerData[] = managers.map((manager, mi) => {
    const history = historyResults[mi];
    const transfers = transferResults[mi];

    const startedEvent =
      history && history.current.length > 0
        ? history.current[0].event
        : finishedGws[0];

    // Build picks map
    const picksMap: Record<number, GWPicks | null> = {};
    picksMeta.forEach((meta, pi) => {
      if (meta.managerId === manager.id) {
        picksMap[meta.gw] = picksResults[pi];
      }
    });

    return {
      manager,
      history,
      picks: picksMap,
      transfers,
      startedEvent,
    };
  });

  // Filter managers with minimum viable data (5+ GWs)
  const viableManagers = managerDataList.filter((md) => {
    const relevantGws = finishedGws.filter((gw) => gw >= md.startedEvent);
    return relevantGws.length >= 5;
  });

  if (viableManagers.length === 0) {
    throw new Error(
      'Not enough data — managers need at least 5 gameweeks to generate awards.'
    );
  }

  onProgress?.(0.97, 'Calculating awards…');

  const awards: AwardResult[] = [
    calcBenchWarmer(viableManagers, gwLiveMap, finishedGws),
    calcRevolvingDoor(viableManagers),
    calcChipMaster(viableManagers, gwLiveMap, finishedGws),
    calcCaptainKiller(viableManagers, gwLiveMap, finishedGws),
    calcSheep(viableManagers, finishedGws),
    calcSniper(viableManagers),
    calcLoyalist(viableManagers),
    calcDifferentialKing(viableManagers, gwLiveMap, finishedGws),
  ];

  onProgress?.(1, 'Done!');

  return awards;
}

/**
 * Run all 8 award calculators against pre-loaded data (e.g. from Supabase).
 * No network calls — callers are responsible for supplying bootstrap, GW live
 * data, and manager data before calling this.
 */
export function computeAwardsFromManagerData(
  managers: ManagerData[],
  bootstrap: Bootstrap,
  gwLive: Record<number, GWLive | null>,
  finishedGws: number[]
): AwardResult[] {
  const viableManagers = managers.filter((md) => {
    const relevantGws = finishedGws.filter((gw) => gw >= md.startedEvent);
    return relevantGws.length >= 5;
  });

  if (viableManagers.length === 0) {
    throw new Error(
      'Not enough data — managers need at least 5 gameweeks to generate awards.'
    );
  }

  return [
    calcBenchWarmer(viableManagers, gwLive, finishedGws),
    calcRevolvingDoor(viableManagers),
    calcChipMaster(viableManagers, gwLive, finishedGws),
    calcCaptainKiller(viableManagers, gwLive, finishedGws),
    calcSheep(viableManagers, finishedGws),
    calcSniper(viableManagers),
    calcLoyalist(viableManagers),
    calcDifferentialKing(viableManagers, gwLive, finishedGws),
  ];
}

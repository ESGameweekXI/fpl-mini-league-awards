import { AwardResult, ManagerData, GWLive, Manager } from '../fpl/types';

let _benchDebuggedFirst = false;

export function calcBenchWarmer(
  managers: ManagerData[],
  gwLive: Record<number, GWLive | null>,
  finishedGws: number[]
): AwardResult {
  let maxPoints = -1;
  let winners: Manager[] = [];
  let hasFallback = false;

  for (const md of managers) {
    if (!md.history) continue;

    let totalBenchPoints = 0;
    let missedGws = 0;
    const relevantGws = finishedGws.filter((gw) => gw >= md.startedEvent);

    for (const gw of relevantGws) {
      const picks = md.picks[gw];
      const live = gwLive[gw];

      if (!picks || !live) {
        missedGws++;
        continue;
      }

      const liveMap = new Map(
        live.elements.map((e) => [e.id, e.stats.total_points])
      );

      const benchPicks = picks.picks.filter(
        (p) => p.position >= 12 && p.position <= 15
      );

      for (const pick of benchPicks) {
        totalBenchPoints += liveMap.get(pick.element) ?? 0;
      }
    }

    if (
      relevantGws.length > 0 &&
      missedGws / relevantGws.length > 0.2
    ) {
      hasFallback = true;
    }

    console.log(
      `[benchWarmer] ${md.manager.teamName} (${md.manager.name}): ${totalBenchPoints} bench pts (missed ${missedGws}/${relevantGws.length} GWs)`
    );

    if (missedGws === relevantGws.length && relevantGws.length > 0 && !_benchDebuggedFirst) {
      _benchDebuggedFirst = true;
      const firstGw = relevantGws[0];
      const picksGw1 = md.picks[firstGw];
      const liveGw1 = gwLive[firstGw];

      console.log(`[benchWarmer:debug] First all-miss manager: ${md.manager.teamName}`);
      console.log(`[benchWarmer:debug] GW${firstGw} picks entry:`, picksGw1 ?? 'undefined/null');
      console.log(`[benchWarmer:debug] picks map keys:`, Object.keys(md.picks));

      if (picksGw1) {
        const benchElements = picksGw1.picks
          .filter((p) => p.position >= 12 && p.position <= 15)
          .map((p) => ({ element: p.element, type: typeof p.element, position: p.position }));
        console.log(`[benchWarmer:debug] GW${firstGw} bench element IDs:`, benchElements);
      }

      if (liveGw1) {
        const first5 = liveGw1.elements.slice(0, 5).map((e) => ({ id: e.id, type: typeof e.id }));
        console.log(`[benchWarmer:debug] gwLive[${firstGw}].elements first 5:`, first5);
        if (picksGw1) {
          const benchElements = picksGw1.picks.filter((p) => p.position >= 12 && p.position <= 15);
          const liveIds = new Set(liveGw1.elements.map((e) => e.id));
          for (const p of benchElements) {
            console.log(`[benchWarmer:debug] element ${p.element} (${typeof p.element}) in liveMap: ${liveIds.has(p.element)}`);
          }
        }
      } else {
        console.log(`[benchWarmer:debug] gwLive[${firstGw}] is:`, liveGw1 ?? 'null/undefined');
      }
    }

    if (totalBenchPoints > maxPoints) {
      maxPoints = totalBenchPoints;
      winners = [md.manager];
    } else if (totalBenchPoints === maxPoints && maxPoints >= 0) {
      winners.push(md.manager);
    }
  }

  return {
    id: 'bench-warmer',
    name: 'The Bench Warmer',
    description: 'Most points left rotting on the bench all season',
    winners: winners.length > 0 ? winners : managers.map((m) => m.manager).slice(0, 1),
    stat: maxPoints >= 0 ? `${maxPoints} bench points` : 'N/A',
    fallback: hasFallback || winners.length === 0,
  };
}

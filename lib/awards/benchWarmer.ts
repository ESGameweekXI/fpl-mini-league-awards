import { AwardResult, ManagerData, GWLive, Manager } from '../fpl/types';

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

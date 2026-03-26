import { AwardResult, ManagerData, GWLive, Manager } from '../fpl/types';

/**
 * Captain Killer: most GWs where captain scored ≤ 2 raw points.
 */
export function calcCaptainKiller(
  managers: ManagerData[],
  gwLive: Record<number, GWLive | null>,
  finishedGws: number[]
): AwardResult {
  let maxCount = -1;
  let winners: Manager[] = [];
  let hasFallback = false;

  for (const md of managers) {
    if (!md.history) {
      hasFallback = true;
      continue;
    }

    let killerGws = 0;
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

      const captainPick = picks.picks.find((p) => p.is_captain);
      if (!captainPick) continue;

      const captainRawPoints = liveMap.get(captainPick.element) ?? 0;

      if (captainRawPoints <= 2) {
        killerGws++;
      }
    }

    if (
      relevantGws.length > 0 &&
      missedGws / relevantGws.length > 0.5
    ) {
      hasFallback = true;
    }

    if (killerGws > maxCount) {
      maxCount = killerGws;
      winners = [md.manager];
    } else if (killerGws === maxCount && maxCount >= 0) {
      winners.push(md.manager);
    }
  }

  return {
    id: 'captain-killer',
    name: 'The Captain Killer',
    description: 'Most GWs where the captain scored 2 or fewer raw points',
    winners: winners.length > 0 ? winners : managers.map((m) => m.manager).slice(0, 1),
    stat: maxCount >= 0 ? `${maxCount} GWs` : 'N/A',
    fallback: hasFallback || winners.length === 0,
  };
}

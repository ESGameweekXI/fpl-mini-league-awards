import { AwardResult, ManagerData, GWLive, Manager } from '../fpl/types';

export function calcDifferentialKing(
  managers: ManagerData[],
  gwLive: Record<number, GWLive | null>,
  finishedGws: number[]
): AwardResult {
  let maxPoints = -1;
  let winners: Manager[] = [];
  let hasFallback = false;

  // Tally per-manager differential points
  const managerPoints = new Map<number, number>();
  for (const md of managers) {
    managerPoints.set(md.manager.id, 0);
  }

  let missedGws = 0;

  for (const gw of finishedGws) {
    const live = gwLive[gw];
    if (!live) {
      missedGws++;
      continue;
    }

    const liveMap = new Map(
      live.elements.map((e) => [e.id, e.stats.total_points])
    );

    // Build ownership count for starting XI (positions 1-11)
    const ownershipCount = new Map<number, number>();
    for (const md of managers) {
      const picks = md.picks[gw];
      if (!picks) continue;
      for (const pick of picks.picks) {
        if (pick.position >= 1 && pick.position <= 11) {
          ownershipCount.set(
            pick.element,
            (ownershipCount.get(pick.element) ?? 0) + 1
          );
        }
      }
    }

    // Accumulate differential points per manager
    for (const md of managers) {
      const picks = md.picks[gw];
      if (!picks) continue;
      for (const pick of picks.picks) {
        if (pick.position >= 1 && pick.position <= 11) {
          if (ownershipCount.get(pick.element) === 1) {
            const pts = liveMap.get(pick.element) ?? 0;
            managerPoints.set(
              md.manager.id,
              (managerPoints.get(md.manager.id) ?? 0) + pts
            );
          }
        }
      }
    }
  }

  if (missedGws / finishedGws.length > 0.2) {
    hasFallback = true;
  }

  for (const md of managers) {
    const pts = managerPoints.get(md.manager.id) ?? 0;
    if (pts > maxPoints) {
      maxPoints = pts;
      winners = [md.manager];
    } else if (pts === maxPoints && maxPoints >= 0) {
      winners.push(md.manager);
    }
  }

  return {
    id: 'differential-king',
    name: 'The Differential King',
    description: "Most points scored from players nobody else in the league had",
    winners: winners.length > 0 ? winners : managers.map((m) => m.manager).slice(0, 1),
    stat: maxPoints >= 0 ? `${maxPoints} pts from differentials` : 'N/A',
    fallback: hasFallback || winners.length === 0,
  };
}

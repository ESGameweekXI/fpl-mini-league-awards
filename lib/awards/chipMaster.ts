import type { AwardResult, Manager, ManagerData, GWLive } from '../fpl/types';

/**
 * Chip Master: most points earned from chips across the season.
 * Eligible managers must have used all 6 chips (TC×2, BB×2, FH×2).
 * TC bonus = captain's total_points × 2 on TC GWs.
 * BB bonus = sum of bench (positions 12–15) on BB GWs.
 * FH bonus = sum of starters (positions 1–11) on FH GWs.
 */
export function calcChipMaster(
  managers: ManagerData[],
  gwLive: Record<number, GWLive | null>,
  finishedGws: number[]
): AwardResult {
  // Build chip usage map: manager → chip type → set of GWs used
  const chipCounts = new Map<number, Record<string, Set<number>>>();

  for (const md of managers) {
    const chips: Record<string, Set<number>> = {
      '3xc': new Set(),
      bboost: new Set(),
      freehit: new Set(),
    };
    for (const gw of finishedGws) {
      const chip = md.picks[gw]?.active_chip;
      if (chip === '3xc' || chip === 'bboost' || chip === 'freehit') {
        chips[chip].add(gw);
      }
    }
    chipCounts.set(md.manager.id, chips);
  }

  // Eligible = used all 6 chips (each type at least twice)
  const eligibleManagers = managers.filter((md) => {
    const chips = chipCounts.get(md.manager.id)!;
    return (
      chips['3xc'].size >= 2 &&
      chips['bboost'].size >= 2 &&
      chips['freehit'].size >= 2
    );
  });

  if (eligibleManagers.length < 2) {
    return {
      id: 'chip-master',
      name: 'The Chip Master',
      description:
        'Most points earned from chips across the season (TC, Bench Boost & Free Hit)',
      winners: managers.slice(0, 1).map((m) => m.manager),
      stat: 'N/A',
      fallback: true,
    };
  }

  // Calculate chip points per eligible manager
  const managerPoints = new Map<number, number>();

  for (const md of eligibleManagers) {
    let total = 0;
    for (const gw of finishedGws) {
      const gwPicks = md.picks[gw];
      if (!gwPicks) continue;
      const chip = gwPicks.active_chip;
      if (!chip || !['3xc', 'bboost', 'freehit'].includes(chip)) continue;

      const live = gwLive[gw];
      if (!live) continue;

      const liveMap = new Map(
        live.elements.map((e) => [e.id, e.stats.total_points])
      );

      for (const pick of gwPicks.picks) {
        const pts = liveMap.get(pick.element) ?? 0;
        if (chip === '3xc' && pick.is_captain) {
          total += pts * 2;
        } else if (chip === 'bboost' && pick.position >= 12) {
          total += pts;
        } else if (chip === 'freehit' && pick.position <= 11) {
          total += pts;
        }
      }
    }
    managerPoints.set(md.manager.id, total);
  }

  let maxPoints = -1;
  for (const pts of managerPoints.values()) {
    if (pts > maxPoints) maxPoints = pts;
  }

  const winners: Manager[] = eligibleManagers
    .filter((md) => (managerPoints.get(md.manager.id) ?? 0) === maxPoints)
    .map((md) => md.manager);

  return {
    id: 'chip-master',
    name: 'The Chip Master',
    description:
      'Most points earned from chips across the season (TC, Bench Boost & Free Hit)',
    winners: winners.length > 0 ? winners : managers.slice(0, 1).map((m) => m.manager),
    stat: maxPoints >= 0 ? `${maxPoints} chip points` : 'N/A',
    fallback: false,
  };
}

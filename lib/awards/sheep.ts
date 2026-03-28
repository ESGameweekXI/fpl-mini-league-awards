import { AwardResult, ManagerData, Manager } from '../fpl/types';

/**
 * The Sheep: most GWs picking the modal (most popular) captain in the league.
 */
export function calcSheep(
  managers: ManagerData[],
  finishedGws: number[]
): AwardResult {
  const sheepCounts: Map<number, number> = new Map(
    managers.map((m) => [m.manager.id, 0])
  );
  let hasFallback = false;

  for (const gw of finishedGws) {
    // Tally captain selections this GW across all managers
    const captainTally: Map<number, number> = new Map();

    for (const md of managers) {
      const picks = md.picks[gw];
      if (!picks) continue;

      const captainPick = picks.picks.find((p) => p.is_captain);
      if (!captainPick) continue;

      captainTally.set(
        captainPick.element,
        (captainTally.get(captainPick.element) ?? 0) + 1
      );
    }

    if (captainTally.size === 0) continue;

    // Find the modal captain (most selected)
    const maxSelections = Math.max(...captainTally.values());

    // Only count as "sheep" if more than one manager picked the same captain
    if (maxSelections < 2) continue;

    const modalCaptains = new Set<number>();
    for (const [elementId, count] of captainTally) {
      if (count === maxSelections) {
        modalCaptains.add(elementId);
      }
    }

    // Award a sheep point to each manager who picked the modal captain
    for (const md of managers) {
      if (gw < md.startedEvent) continue;
      const picks = md.picks[gw];
      if (!picks) continue;

      const captainPick = picks.picks.find((p) => p.is_captain);
      if (!captainPick) continue;

      if (modalCaptains.has(captainPick.element)) {
        sheepCounts.set(md.manager.id, (sheepCounts.get(md.manager.id) ?? 0) + 1);
      }
    }
  }

  let maxCount = -1;
  let winners: Manager[] = [];

  for (const md of managers) {
    const count = sheepCounts.get(md.manager.id) ?? 0;
    if (count > maxCount) {
      maxCount = count;
      winners = [md.manager];
    } else if (count === maxCount) {
      winners.push(md.manager);
    }
  }

  return {
    id: 'sheep',
    name: 'The Sheep',
    description: 'Most GWs picking the most popular captain in the league',
    winners: winners.length > 0 ? winners : managers.map((m) => m.manager).slice(0, 1),
    stat: maxCount >= 0 ? `${maxCount} GWs` : 'N/A',
    fallback: hasFallback || winners.length === 0,
  };
}

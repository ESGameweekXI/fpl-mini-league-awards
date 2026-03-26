import { AwardResult, ManagerData, Manager } from '../fpl/types';

/**
 * The Sniper: highest single gameweek score.
 */
export function calcSniper(managers: ManagerData[]): AwardResult {
  let maxPoints = -1;
  let bestGw = 0;
  let winners: Manager[] = [];
  const hasFallback = managers.some((m) => !m.history);

  for (const md of managers) {
    if (!md.history) continue;

    for (const gwData of md.history.current) {
      if (gwData.points > maxPoints) {
        maxPoints = gwData.points;
        bestGw = gwData.event;
        winners = [md.manager];
      } else if (gwData.points === maxPoints) {
        winners.push(md.manager);
      }
    }
  }

  return {
    id: 'sniper',
    name: 'The Sniper',
    description: 'Highest single gameweek score all season',
    winners: winners.length > 0 ? winners : managers.map((m) => m.manager).slice(0, 1),
    stat:
      maxPoints >= 0 ? `${maxPoints} points (GW${bestGw})` : 'N/A',
    fallback: hasFallback || winners.length === 0,
  };
}

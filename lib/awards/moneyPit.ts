import { AwardResult, ManagerData, Bootstrap, Manager } from '../fpl/types';

const POOR_VALUE_THRESHOLD = 4; // points per million

/**
 * Money Pit: highest total spent (in £m) on transfers that returned poor value.
 * Poor value = player season total_points / (element_in_cost / 10) < 4
 */
export function calcMoneyPit(
  managers: ManagerData[],
  bootstrap: Bootstrap
): AwardResult {
  const playerMap = new Map(bootstrap.elements.map((p) => [p.id, p]));
  let maxSpent = -1;
  let winners: Manager[] = [];
  let hasFallback = false;

  for (const md of managers) {
    const transfers = md.transfers ?? [];
    let pitSpend = 0;

    for (const transfer of transfers) {
      const costInMillions = transfer.element_in_cost / 10;
      const player = playerMap.get(transfer.element_in);
      const seasonPoints = player?.total_points ?? 0;

      const pointsPerMillion =
        costInMillions > 0 ? seasonPoints / costInMillions : 0;

      if (pointsPerMillion < POOR_VALUE_THRESHOLD) {
        pitSpend += costInMillions;
      }
    }

    if (pitSpend > maxSpent) {
      maxSpent = pitSpend;
      winners = [md.manager];
    } else if (pitSpend === maxSpent && maxSpent >= 0) {
      winners.push(md.manager);
    }
  }

  return {
    id: 'money-pit',
    name: 'The Money Pit',
    description:
      'Highest total spent on transfers that returned poor value (under 4 pts/£m)',
    winners: winners.length > 0 ? winners : managers.map((m) => m.manager).slice(0, 1),
    stat: maxSpent >= 0 ? `£${maxSpent.toFixed(1)}m wasted` : 'N/A',
    fallback: hasFallback || winners.length === 0,
  };
}

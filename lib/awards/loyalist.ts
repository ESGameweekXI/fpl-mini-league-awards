import { AwardResult, ManagerData, Manager } from '../fpl/types';

/**
 * The Loyalist: fewest unique players transferred out.
 * A manager with 0 transfers has 0 unique players transferred out.
 */
export function calcLoyalist(managers: ManagerData[]): AwardResult {
  let minUnique = Infinity;
  let winners: Manager[] = [];
  const hasFallback = managers.some((m) => m.transfers === null);

  for (const md of managers) {
    const transfers = md.transfers ?? [];
    const uniqueOut = new Set(transfers.map((t) => t.element_out)).size;

    if (uniqueOut < minUnique) {
      minUnique = uniqueOut;
      winners = [md.manager];
    } else if (uniqueOut === minUnique) {
      winners.push(md.manager);
    }
  }

  const stat =
    minUnique === Infinity
      ? 'N/A'
      : minUnique === 0
      ? 'No transfers out'
      : `${minUnique} unique player${minUnique === 1 ? '' : 's'} transferred out`;

  return {
    id: 'loyalist',
    name: 'The Loyalist',
    description: 'Fewest unique players transferred out — true squad loyalty',
    winners: winners.length > 0 ? winners : managers.map((m) => m.manager).slice(0, 1),
    stat,
    fallback: hasFallback || winners.length === 0,
  };
}

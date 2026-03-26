import { AwardResult, ManagerData, Manager } from '../fpl/types';

export function calcRevolvingDoor(managers: ManagerData[]): AwardResult {
  let maxTransfers = -1;
  let winners: Manager[] = [];
  const hasFallback = managers.some((m) => m.transfers === null);

  for (const md of managers) {
    const transferCount = md.transfers?.length ?? 0;

    if (transferCount > maxTransfers) {
      maxTransfers = transferCount;
      winners = [md.manager];
    } else if (transferCount === maxTransfers) {
      winners.push(md.manager);
    }
  }

  return {
    id: 'revolving-door',
    name: 'The Revolving Door',
    description: 'Most transfers made all season — never settling on a squad',
    winners: winners.length > 0 ? winners : managers.map((m) => m.manager).slice(0, 1),
    stat: maxTransfers >= 0 ? `${maxTransfers} transfers` : 'N/A',
    fallback: hasFallback || winners.length === 0,
  };
}

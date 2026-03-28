import { AwardResult, ManagerData, GWLive, Manager } from '../fpl/types';

/**
 * Wrong Armband: most GWs where captain scored fewer raw points
 * than every other player in the starting XI.
 */
export function calcWrongArmband(
  managers: ManagerData[],
  gwLive: Record<number, GWLive | null>,
  finishedGws: number[]
): AwardResult {
  let maxCount = -1;
  let winners: Manager[] = [];
  let hasFallback = false;

  for (const md of managers) {
    if (!md.history) continue;

    let wrongGws = 0;
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

      const startingXI = picks.picks.filter((p) => p.position <= 11);
      const captainPick = startingXI.find((p) => p.is_captain);

      if (!captainPick) continue;

      const captainRawPoints = liveMap.get(captainPick.element) ?? 0;

      // Check if captain scored less than every other starting player
      const otherStartingPoints = startingXI
        .filter((p) => p.element !== captainPick.element)
        .map((p) => liveMap.get(p.element) ?? 0);

      if (
        otherStartingPoints.length > 0 &&
        captainRawPoints < Math.min(...otherStartingPoints)
      ) {
        wrongGws++;
      }
    }

    if (
      relevantGws.length > 0 &&
      missedGws / relevantGws.length > 0.2
    ) {
      hasFallback = true;
    }

    if (wrongGws > maxCount) {
      maxCount = wrongGws;
      winners = [md.manager];
    } else if (wrongGws === maxCount && maxCount >= 0) {
      winners.push(md.manager);
    }
  }

  return {
    id: 'wrong-armband',
    name: 'Wrong Armband',
    description: 'Most GWs where the captain scored fewer points than every other player on the pitch',
    winners: winners.length > 0 ? winners : managers.map((m) => m.manager).slice(0, 1),
    stat: maxCount >= 0 ? `${maxCount} GWs` : 'N/A',
    fallback: hasFallback || winners.length === 0,
  };
}

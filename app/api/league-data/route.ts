import type { NextRequest } from 'next/server';
import { getLeagueManagers } from '@/lib/supabase/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const leagueId = parseInt(
    request.nextUrl.searchParams.get('leagueId') ?? ''
  );

  if (!leagueId || isNaN(leagueId)) {
    return Response.json(
      { error: 'Missing or invalid leagueId' },
      { status: 400 }
    );
  }

  try {
    const managers = await getLeagueManagers(leagueId);

    if (managers.length > 0) {
      const first = managers[0];
      const picksKeys = Object.keys(first.picks);
      console.log(
        `[league-data] ${managers.length} managers returned. ` +
        `First manager (${first.manager.teamName}): ${picksKeys.length} picks GWs, ` +
        `keys: [${picksKeys.slice(0, 5).join(', ')}${picksKeys.length > 5 ? ', ...' : ''}]`
      );
    } else {
      console.log(`[league-data] 0 managers returned for leagueId ${leagueId}`);
    }

    return Response.json({ managers });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to load league data' },
      { status: 500 }
    );
  }
}

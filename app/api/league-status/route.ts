import type { NextRequest } from 'next/server';
import { isLeagueStale, getLastSyncTime } from '@/lib/supabase/queries';

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

  const [stale, lastSync] = await Promise.all([
    isLeagueStale(leagueId),
    getLastSyncTime(leagueId),
  ]);

  return Response.json({
    stale,
    lastSync: lastSync?.toISOString() ?? null,
  });
}

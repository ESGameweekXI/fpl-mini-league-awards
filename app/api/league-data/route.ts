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
    return Response.json({ managers });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to load league data' },
      { status: 500 }
    );
  }
}

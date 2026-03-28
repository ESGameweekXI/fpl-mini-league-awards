import { syncLeague } from '@/lib/supabase/sync';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let leagueId: number;

  try {
    const body = await request.json();
    leagueId = body?.leagueId;
    if (!leagueId || typeof leagueId !== 'number') {
      return Response.json({ error: 'Missing or invalid leagueId' }, { status: 400 });
    }
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
      };

      try {
        const result = await syncLeague(leagueId, (pct, message) => {
          send({ pct: Math.round(pct), message });
        });
        send({ pct: 100, message: 'Done', ...result });
      } catch (err) {
        send({ error: err instanceof Error ? err.message : 'Sync failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-store',
    },
  });
}

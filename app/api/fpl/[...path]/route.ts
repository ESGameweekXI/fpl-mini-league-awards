import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const fplPath = path.join('/');
  const fplUrl = `https://fantasy.premierleague.com/api/${fplPath}/`;

  // Forward any query string
  const searchParams = request.nextUrl.searchParams.toString();
  const targetUrl = searchParams ? `${fplUrl}?${searchParams}` : fplUrl;

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; FPLAwards/1.0)',
        Accept: 'application/json',
        Referer: 'https://fantasy.premierleague.com/',
      },
      next: { revalidate: 0 },
    });

    if (!upstream.ok) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await upstream.text();

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream fetch failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

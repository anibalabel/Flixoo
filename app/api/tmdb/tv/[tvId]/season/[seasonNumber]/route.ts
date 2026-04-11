import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tvId: string; seasonNumber: string }> }
) {
  try {
    const { tvId, seasonNumber } = await params;
    const language = new URL(_request.url).searchParams.get('language') || 'es-ES';

    if (!/^\d+$/.test(tvId) || !/^\d+$/.test(seasonNumber)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const token = getRequiredEnv('TMDB_TOKEN');
    const url = `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}?language=${encodeURIComponent(language)}`;

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    const bodyText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'TMDB request failed', status: response.status, details: bodyText },
        { status: 502 }
      );
    }

    return new NextResponse(bodyText, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { deleteSeasonCascade, getSeasonDeleteSummary, parsePositiveIntId } from '@/lib/cascadeDelete';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const seasonId = parsePositiveIntId(id);
    if (!seasonId) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const summary = await getSeasonDeleteSummary(pool as any, seasonId);
    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const raw_id = String(data.tv_show_id);
    const tv_show_id = raw_id.includes('[') ? raw_id : `["${raw_id}"]`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await pool.query(
      'UPDATE seasons SET tv_show_id=?, slug=?, season_name=?, `order`=?, status=?, updated_at=? WHERE id=?',
      [tv_show_id, data.slug, data.season_name, data.order, Number(data.status), now, id]
    );
    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const seasonId = parsePositiveIntId(id);
    if (!seasonId) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const result = await deleteSeasonCascade(pool as any, seasonId, {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for'),
    });

    if (result.notFound) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    return NextResponse.json({ status: 'success', ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

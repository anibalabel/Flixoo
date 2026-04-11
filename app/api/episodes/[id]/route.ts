import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const d = await request.json();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await pool.query(
      'UPDATE episodes SET season_id=?, series_id=?, episode_name=?, slug=?, description=?, file_source=?, source_type=?, file_url=?, `order`=?, runtime=?, poster=?, total_view=?, updated_at=? WHERE id=?',
      [d.season_id, d.series_id, d.episode_name, d.slug, d.description, d.file_source, d.source_type, d.file_url, d.order, d.runtime, d.poster, d.total_view, now, id]
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
    await pool.query('DELETE FROM episodes WHERE id = ?', [id]);
    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

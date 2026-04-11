import { NextResponse } from 'next/server';
import pool from '@/lib/db';

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
    await pool.query('DELETE FROM seasons WHERE id = ?', [id]);
    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

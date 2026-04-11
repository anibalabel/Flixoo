import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tvShowId = searchParams.get('tv_show_id');
    
    let query = 'SELECT * FROM seasons';
    let params: any[] = [];
    
    if (tvShowId) {
      query += ' WHERE tv_show_id = ?';
      params.push(tvShowId);
    }
    
    query += ' ORDER BY `order` ASC';
    
    const [rows] = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const raw_id = String(data.tv_show_id);
    const tv_show_id = raw_id.includes('[') ? raw_id : `["${raw_id}"]`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [result]: any = await pool.query(
      'INSERT INTO seasons (tv_show_id, slug, season_name, `order`, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tv_show_id, data.slug, data.season_name, data.order, Number(data.status), now, now]
    );
    return NextResponse.json({ status: 'success', id: result.insertId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

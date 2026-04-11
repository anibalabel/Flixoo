import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('season_id');
    
    let query = 'SELECT * FROM episodes';
    let params: any[] = [];
    
    if (seasonId) {
      query += ' WHERE season_id = ?';
      params.push(seasonId);
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
    const { series_id, season_id, episode_name, description, order, runtime, poster, file_source, source_type, file_url, slug } = data;
    
    const [result]: any = await pool.query(
      'INSERT INTO episodes (series_id, season_id, episode_name, description, `order`, runtime, poster, file_source, source_type, file_url, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [series_id, season_id, episode_name, description, order, runtime, poster, file_source, source_type, file_url, slug]
    );
    
    return NextResponse.json({ status: 'success', id: result.insertId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT id, title, tmdb_id, thumbnail FROM tv_shows ORDER BY id DESC');
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { title, tmdb_id, thumbnail, slug, description, status } = data;
    
    const [result]: any = await pool.query(
      'INSERT INTO tv_shows (title, tmdb_id, thumbnail, slug, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [title, tmdb_id, thumbnail, slug, description || '', status || 1]
    );
    
    return NextResponse.json({ status: 'success', id: result.insertId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

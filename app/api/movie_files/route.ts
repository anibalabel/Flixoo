import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('video_id');
    
    let query = 'SELECT * FROM movie_files';
    let params: any[] = [];
    
    if (videoId) {
      query += ' WHERE video_id = ?';
      params.push(videoId);
    }
    
    const [rows] = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { video_id, file_source, source_type, file_url, label, order, stream_key, conversion_status } = data;
    
    const [result]: any = await pool.query(
      'INSERT INTO movie_files (video_id, file_source, source_type, file_url, label, `order`, stream_key, conversion_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [video_id, file_source || '', source_type, file_url, label, order || 1, stream_key || '', conversion_status || 'finished']
    );
    
    return NextResponse.json({ status: 'success', id: result.insertId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

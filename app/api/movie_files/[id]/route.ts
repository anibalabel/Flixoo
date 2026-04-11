import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { video_id, file_source, source_type, file_url, label, order, stream_key, conversion_status } = body;
    
    await pool.query(
      'UPDATE movie_files SET video_id = ?, file_source = ?, source_type = ?, file_url = ?, label = ?, `order` = ?, stream_key = ?, conversion_status = ?, updated_at = NOW() WHERE id = ?',
      [video_id, file_source || '', source_type, file_url, label, order || 1, stream_key || '', conversion_status || 'finished', id]
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await pool.query('DELETE FROM movie_files WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

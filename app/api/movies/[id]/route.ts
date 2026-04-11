import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { deleteMovieCascade, getMovieDeleteSummary, parsePositiveIntId } from '@/lib/cascadeDelete';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const movieId = parsePositiveIntId(id);
    if (!movieId) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const summary = await getMovieDeleteSummary(pool as any, movieId);
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
    const { title, thumbnail, is_featured, slug, description, runtime } = data;
    
    await pool.query(
      'UPDATE movies SET title=?, thumbnail=?, is_featured=?, slug=?, description=?, runtime=?, updated_at=NOW() WHERE id=?',
      [title, thumbnail, Number(is_featured), slug, description, runtime, id]
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
    const movieId = parsePositiveIntId(id);
    if (!movieId) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const result = await deleteMovieCascade(pool as any, movieId, {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for'),
    });

    if (result.notFound) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    return NextResponse.json({ status: 'success', ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

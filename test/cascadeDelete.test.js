import { describe, expect, it, vi } from 'vitest';
import { deleteMovieCascade, deleteSeasonCascade, getMovieDeleteSummary, getSeasonDeleteSummary } from '../lib/cascadeDelete';

function createConn(handlers) {
  return {
    beginTransaction: vi.fn(async () => {}),
    commit: vi.fn(async () => {}),
    rollback: vi.fn(async () => {}),
    release: vi.fn(() => {}),
    query: vi.fn(async (sql, params) => handlers.onQuery(sql, params)),
  };
}

function rowsCount(n) {
  return [[{ count: n }]];
}

describe('cascade delete', () => {
  it('movie summary returns counts', async () => {
    const pool = {
      query: vi.fn(async (sql) => {
        if (sql.includes('FROM movies')) return rowsCount(1);
        if (sql.includes('FROM movie_files')) return rowsCount(3);
        throw new Error('unexpected');
      }),
    };

    const summary = await getMovieDeleteSummary(pool, 10);
    expect(summary).toEqual({ movieId: 10, exists: true, movieFilesCount: 3 });
  });

  it('season summary returns counts', async () => {
    const pool = {
      query: vi.fn(async (sql) => {
        if (sql.includes('FROM seasons')) return rowsCount(1);
        if (sql.includes('FROM episodes')) return rowsCount(8);
        throw new Error('unexpected');
      }),
    };

    const summary = await getSeasonDeleteSummary(pool, 7);
    expect(summary).toEqual({ seasonId: 7, exists: true, episodesCount: 8 });
  });

  it('movie cascade deletes children and parent in one transaction', async () => {
    const conn = createConn({
      onQuery: (sql) => {
        if (sql.startsWith('SELECT COUNT(*)') && sql.includes('FROM movies')) return rowsCount(1);
        if (sql.startsWith('SELECT COUNT(*)') && sql.includes('FROM movie_files')) return rowsCount(2);
        if (sql.startsWith('DELETE FROM movie_files')) return [{ affectedRows: 2 }];
        if (sql.startsWith('DELETE FROM movies')) return [{ affectedRows: 1 }];
        if (sql.startsWith('INSERT INTO admin_audit_logs')) return [{ insertId: 1 }];
        throw new Error(`unexpected: ${sql}`);
      },
    });

    const pool = {
      query: vi.fn(async (sql) => {
        if (sql.startsWith('CREATE TABLE IF NOT EXISTS admin_audit_logs')) return [];
        throw new Error('unexpected pool query');
      }),
      getConnection: vi.fn(async () => conn),
    };

    const res = await deleteMovieCascade(pool, 5, { userAgent: 'ua' });
    expect(res.notFound).toBe(false);
    expect(res.deleted).toEqual({ movies: 1, movie_files: 2 });
    expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.rollback).toHaveBeenCalledTimes(0);
  });

  it('movie cascade returns notFound and rolls back if parent missing', async () => {
    const conn = createConn({
      onQuery: (sql) => {
        if (sql.startsWith('SELECT COUNT(*)') && sql.includes('FROM movies')) return rowsCount(0);
        throw new Error(`unexpected: ${sql}`);
      },
    });

    const pool = {
      query: vi.fn(async (sql) => {
        if (sql.startsWith('CREATE TABLE IF NOT EXISTS admin_audit_logs')) return [];
        throw new Error('unexpected pool query');
      }),
      getConnection: vi.fn(async () => conn),
    };

    const res = await deleteMovieCascade(pool, 999, {});
    expect(res).toEqual({ notFound: true });
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.commit).toHaveBeenCalledTimes(0);
  });

  it('season cascade rolls back on failure', async () => {
    const conn = createConn({
      onQuery: (sql) => {
        if (sql.startsWith('SELECT COUNT(*)') && sql.includes('FROM seasons')) return rowsCount(1);
        if (sql.startsWith('SELECT COUNT(*)') && sql.includes('FROM episodes')) return rowsCount(4);
        if (sql.startsWith('DELETE FROM episodes')) throw new Error('boom');
        throw new Error(`unexpected: ${sql}`);
      },
    });

    const pool = {
      query: vi.fn(async (sql) => {
        if (sql.startsWith('CREATE TABLE IF NOT EXISTS admin_audit_logs')) return [];
        throw new Error('unexpected pool query');
      }),
      getConnection: vi.fn(async () => conn),
    };

    await expect(deleteSeasonCascade(pool, 3, {})).rejects.toThrow('boom');
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.commit).toHaveBeenCalledTimes(0);
  });
});


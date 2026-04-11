type QueryResult = any;

type PoolLike = {
  query: (sql: string, params?: any[]) => Promise<QueryResult>;
  getConnection: () => Promise<ConnectionLike>;
};

type ConnectionLike = {
  query: (sql: string, params?: any[]) => Promise<QueryResult>;
  beginTransaction: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  release: () => void;
};

type AuditContext = {
  userAgent?: string | null;
  ip?: string | null;
};

let auditTableEnsurePromise: Promise<void> | null = null;

async function ensureAuditTable(pool: PoolLike) {
  if (!auditTableEnsurePromise) {
    auditTableEnsurePromise = (async () => {
      try {
        await pool.query(
          `CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            action VARCHAR(50) NOT NULL,
            entity VARCHAR(50) NOT NULL,
            entity_id BIGINT NOT NULL,
            details LONGTEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_entity (entity, entity_id),
            KEY idx_action_created_at (action, created_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        );
      } catch (e) {
        auditTableEnsurePromise = null;
      }
    })();
  }
  await auditTableEnsurePromise;
}

async function writeAuditLog(
  conn: ConnectionLike,
  entry: { action: string; entity: string; entityId: number; details: any }
) {
  const detailsText = JSON.stringify(entry.details ?? {});
  try {
    await conn.query(
      'INSERT INTO admin_audit_logs (action, entity, entity_id, details) VALUES (?, ?, ?, ?)',
      [entry.action, entry.entity, entry.entityId, detailsText]
    );
  } catch (e) {
    console.info('[audit]', entry.action, entry.entity, entry.entityId, detailsText);
  }
}

function toIntId(raw: string) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

async function count(connOrPool: { query: ConnectionLike['query'] }, sql: string, params: any[]) {
  const [rows]: any = await connOrPool.query(sql, params);
  const first = Array.isArray(rows) ? rows[0] : rows;
  return Number(first?.count ?? 0);
}

export async function getMovieDeleteSummary(pool: PoolLike, movieId: number) {
  const movieExists = await count(pool, 'SELECT COUNT(*) as count FROM movies WHERE id = ?', [movieId]);
  const movieFilesCount = await count(pool, 'SELECT COUNT(*) as count FROM movie_files WHERE video_id = ?', [movieId]);
  return {
    movieId,
    exists: movieExists > 0,
    movieFilesCount,
  };
}

export async function deleteMovieCascade(pool: PoolLike, movieId: number, ctx: AuditContext) {
  await ensureAuditTable(pool);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const exists = await count(conn, 'SELECT COUNT(*) as count FROM movies WHERE id = ?', [movieId]);
    if (exists === 0) {
      await conn.rollback();
      return { notFound: true as const };
    }

    const movieFilesCount = await count(conn, 'SELECT COUNT(*) as count FROM movie_files WHERE video_id = ?', [movieId]);

    const [movieFilesDeleteResult]: any = await conn.query('DELETE FROM movie_files WHERE video_id = ?', [movieId]);
    const deletedMovieFiles = Number(movieFilesDeleteResult?.affectedRows ?? 0);

    const [movieDeleteResult]: any = await conn.query('DELETE FROM movies WHERE id = ?', [movieId]);
    const deletedMovies = Number(movieDeleteResult?.affectedRows ?? 0);

    const remainingMovieFiles = await count(conn, 'SELECT COUNT(*) as count FROM movie_files WHERE video_id = ?', [movieId]);

    await writeAuditLog(conn, {
      action: 'DELETE_CASCADE',
      entity: 'movies',
      entityId: movieId,
      details: {
        movieId,
        deleted: { movies: deletedMovies, movie_files: deletedMovieFiles },
        expectedRelated: { movie_files: movieFilesCount },
        remaining: { movie_files: remainingMovieFiles },
        ctx,
      },
    });

    await conn.commit();
    return {
      notFound: false as const,
      deleted: { movies: deletedMovies, movie_files: deletedMovieFiles },
      relatedCounts: { movie_files: movieFilesCount },
      remainingCounts: { movie_files: remainingMovieFiles },
    };
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}
    throw error;
  } finally {
    conn.release();
  }
}

export async function getSeasonDeleteSummary(pool: PoolLike, seasonId: number) {
  const seasonExists = await count(pool, 'SELECT COUNT(*) as count FROM seasons WHERE id = ?', [seasonId]);
  const episodesCount = await count(pool, 'SELECT COUNT(*) as count FROM episodes WHERE season_id = ?', [seasonId]);
  return {
    seasonId,
    exists: seasonExists > 0,
    episodesCount,
  };
}

export async function deleteSeasonCascade(pool: PoolLike, seasonId: number, ctx: AuditContext) {
  await ensureAuditTable(pool);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const exists = await count(conn, 'SELECT COUNT(*) as count FROM seasons WHERE id = ?', [seasonId]);
    if (exists === 0) {
      await conn.rollback();
      return { notFound: true as const };
    }

    const episodesCount = await count(conn, 'SELECT COUNT(*) as count FROM episodes WHERE season_id = ?', [seasonId]);

    const [episodesDeleteResult]: any = await conn.query('DELETE FROM episodes WHERE season_id = ?', [seasonId]);
    const deletedEpisodes = Number(episodesDeleteResult?.affectedRows ?? 0);

    const [seasonDeleteResult]: any = await conn.query('DELETE FROM seasons WHERE id = ?', [seasonId]);
    const deletedSeasons = Number(seasonDeleteResult?.affectedRows ?? 0);

    const remainingEpisodes = await count(conn, 'SELECT COUNT(*) as count FROM episodes WHERE season_id = ?', [seasonId]);

    await writeAuditLog(conn, {
      action: 'DELETE_CASCADE',
      entity: 'seasons',
      entityId: seasonId,
      details: {
        seasonId,
        deleted: { seasons: deletedSeasons, episodes: deletedEpisodes },
        expectedRelated: { episodes: episodesCount },
        remaining: { episodes: remainingEpisodes },
        ctx,
      },
    });

    await conn.commit();
    return {
      notFound: false as const,
      deleted: { seasons: deletedSeasons, episodes: deletedEpisodes },
      relatedCounts: { episodes: episodesCount },
      remainingCounts: { episodes: remainingEpisodes },
    };
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}
    throw error;
  } finally {
    conn.release();
  }
}

export function parsePositiveIntId(raw: string) {
  return toIntId(raw);
}

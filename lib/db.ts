import mysql from 'mysql2/promise';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const pool = mysql.createPool({
  host: requireEnv('DB_HOST'),
  port: parseInt(process.env.DB_PORT || '3306'),
  database: requireEnv('DB_NAME'),
  user: requireEnv('DB_USER'),
  password: requireEnv('DB_PASSWORD'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;

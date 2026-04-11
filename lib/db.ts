import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql.us.cloudlogin.co',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'plusmovie_flixoo',
  user: process.env.DB_USER || 'plusmovie_flixoo',
  password: process.env.DB_PASSWORD || 'SF4rL60cj@',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;

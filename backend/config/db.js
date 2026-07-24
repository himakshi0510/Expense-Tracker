const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Aiven (and most managed MySQL hosts) require SSL. Set DB_SSL=true in
  // production env vars; leave unset for local development.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
});

module.exports = pool;

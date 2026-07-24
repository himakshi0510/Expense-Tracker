const pool = require('../config/db');

async function main() {
  try {
    console.log('Adding receipt_url column to expenses table...');
    const [cols] = await pool.query("SHOW COLUMNS FROM expenses LIKE 'receipt_url'");
    if (cols.length === 0) {
      await pool.query('ALTER TABLE expenses ADD COLUMN receipt_url VARCHAR(500) DEFAULT NULL');
      console.log('Successfully added receipt_url column!');
    } else {
      console.log('receipt_url column already exists.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

main();

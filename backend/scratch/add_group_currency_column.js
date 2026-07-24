const pool = require('../config/db');

async function main() {
  try {
    console.log('Adding currency column to groups table...');
    const [cols] = await pool.query("SHOW COLUMNS FROM `groups` LIKE 'currency'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE `groups` ADD COLUMN currency VARCHAR(3) DEFAULT 'INR'");
      console.log('Successfully added currency column to groups!');
    } else {
      console.log('currency column already exists in groups.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

main();

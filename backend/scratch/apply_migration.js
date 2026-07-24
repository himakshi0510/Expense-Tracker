const pool = require('../config/db');

async function main() {
  try {
    console.log('Creating recurring_bills table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recurring_bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        created_by INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category VARCHAR(50) DEFAULT 'General',
        due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 28),
        last_generated_month VARCHAR(7) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('recurring_bills table created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

main();

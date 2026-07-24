const pool = require('../config/db');

async function test() {
  try {
    console.log('--- Database Verification Script ---');
    
    // Check tables
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables in database:', tables.map(t => Object.values(t)[0]));

    // Fetch a user and group to test with
    const [users] = await pool.query('SELECT * FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('No users found in database to perform testing.');
      return;
    }
    const testUser = users[0];
    console.log(`Using test user: ${testUser.name} (${testUser.email})`);

    const [groups] = await pool.query('SELECT * FROM `groups` LIMIT 1');
    if (groups.length === 0) {
      console.log('No groups found in database to perform testing.');
      return;
    }
    const testGroup = groups[0];
    console.log(`Using test group: ${testGroup.name}`);

    // Ensure the test user is in the group_members table
    const [membership] = await pool.query(
      'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
      [testGroup.id, testUser.id]
    );
    if (membership.length === 0) {
      console.log(`Adding user ${testUser.id} to group ${testGroup.id} members`);
      await pool.query(
        'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
        [testGroup.id, testUser.id]
      );
    }

    // Insert a test recurring bill
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
    const currentDay = today.getDate();

    // Use currentDay as the due_day so it is immediately due
    console.log(`Inserting a test recurring bill due on day ${currentDay}...`);
    const [insertRes] = await pool.query(
      `INSERT INTO recurring_bills (group_id, created_by, name, amount, category, due_day)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [testGroup.id, testUser.id, 'Test WiFi Bill', 1200.00, 'Utilities', currentDay]
    );
    const billId = insertRes.insertId;
    console.log(`Inserted recurring bill ID: ${billId}`);

    // Fetch members to verify
    const [members] = await pool.query(
      'SELECT user_id FROM group_members WHERE group_id = ?',
      [testGroup.id]
    );
    console.log(`Group members count: ${members.length}`);

    // Run the generateDueExpenses core logic manually for verification
    console.log('Running generator logic...');
    
    // Find due bills
    const [bills] = await pool.query(
      'SELECT * FROM recurring_bills WHERE id = ?',
      [billId]
    );
    const bill = bills[0];
    
    const isDue = currentDay >= bill.due_day && bill.last_generated_month !== currentMonthStr;
    console.log(`Is bill due? ${isDue} (due_day: ${bill.due_day}, currentDay: ${currentDay}, last_gen: ${bill.last_generated_month}, currentMonth: ${currentMonthStr})`);
    
    if (isDue) {
      const total = Number(bill.amount);
      const share = Math.floor((total / members.length) * 100) / 100;
      const splits = members.map((m, i) => ({
        userId: m.user_id,
        shareAmount: i === members.length - 1
          ? Math.round((total - share * (members.length - 1)) * 100) / 100
          : share
      }));

      // Insert expense
      const [expenseRes] = await pool.query(
        `INSERT INTO expenses (group_id, paid_by, amount, category, description, split_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [testGroup.id, bill.created_by, total, bill.category, `${bill.name} (Recurring)`, 'equal']
      );
      const expenseId = expenseRes.insertId;
      console.log(`Created expense ID: ${expenseId}`);

      // Insert splits
      for (const split of splits) {
        await pool.query(
          'INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, ?)',
          [expenseId, split.userId, split.shareAmount]
        );
        console.log(`Inserted split: user ${split.userId} gets share ${split.shareAmount}`);
      }

      // Update bill
      await pool.query(
        'UPDATE recurring_bills SET last_generated_month = ? WHERE id = ?',
        [currentMonthStr, bill.id]
      );
      console.log('Updated recurring bill last_generated_month!');
    }

    // Verify database updates
    const [updatedBill] = await pool.query('SELECT * FROM recurring_bills WHERE id = ?', [billId]);
    console.log('Updated bill last_generated_month value in DB:', updatedBill[0].last_generated_month);

    const [createdExpenses] = await pool.query('SELECT * FROM expenses WHERE description = ?', ['Test WiFi Bill (Recurring)']);
    console.log('Created expense count in DB:', createdExpenses.length);
    if (createdExpenses.length > 0) {
      console.log('Created expense amount:', createdExpenses[0].amount);
    }

    // Cleanup
    console.log('Cleaning up test data...');
    if (createdExpenses.length > 0) {
      await pool.query('DELETE FROM expenses WHERE id = ?', [createdExpenses[0].id]);
    }
    await pool.query('DELETE FROM recurring_bills WHERE id = ?', [billId]);
    console.log('Cleanup completed successfully!');
    
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

test();

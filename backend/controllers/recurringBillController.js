const pool = require('../config/db');


async function createBill(req, res) {
  try {
    const userId = req.user.id;
    const { name, amount, category, dueDay } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Bill name is required' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'A valid amount is required' });
    }
    if (!dueDay || dueDay < 1 || dueDay > 28) {
      return res.status(400).json({ error: 'Due day must be between 1 and 28' });
    }

    const [result] = await pool.query(
      'INSERT INTO recurring_bills (user_id, name, amount, category, due_day) VALUES (?, ?, ?, ?, ?)',
      [userId, name.trim(), amount, category || 'General', dueDay]
    );

    res.status(201).json({
      bill: { id: result.insertId, name: name.trim(), amount, category: category || 'General', dueDay }
    });
  } catch (err) {
    console.error('Create recurring bill error:', err);
    res.status(500).json({ error: 'Could not create recurring bill' });
  }
}


async function getBills(req, res) {
  try {
    const userId = req.user.id;
    const today = new Date().getDate();

    const [bills] = await pool.query(
      'SELECT * FROM recurring_bills WHERE user_id = ? ORDER BY due_day ASC',
      [userId]
    );

    const annotated = bills.map(bill => ({
      ...bill,
      isOverdueThisMonth: bill.due_day < today
    }));

    res.json({ bills: annotated });
  } catch (err) {
    console.error('Get recurring bills error:', err);
    res.status(500).json({ error: 'Could not fetch recurring bills' });
  }
}

async function deleteBill(req, res) {
  try {
    const userId = req.user.id;
    const { billId } = req.params;

    const [existing] = await pool.query(
      'SELECT id FROM recurring_bills WHERE id = ? AND user_id = ?',
      [billId, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Recurring bill not found' });
    }

    await pool.query('DELETE FROM recurring_bills WHERE id = ?', [billId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete recurring bill error:', err);
    res.status(500).json({ error: 'Could not delete recurring bill' });
  }
}

module.exports = { createBill, getBills, deleteBill };
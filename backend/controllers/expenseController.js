const pool = require('../config/db');
const { simplifyDebts, computeNetBalances } = require('../utils/debtSimplifier');


async function assertMembership(groupId, userId) {
  const [rows] = await pool.query(
    'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, userId]
  );
  return rows.length > 0;
}


async function getGroupBalanceData(groupId) {
  const [members] = await pool.query(
    'SELECT user_id FROM group_members WHERE group_id = ?',
    [groupId]
  );
  const memberIds = members.map(m => String(m.user_id));

  const [expenses] = await pool.query(
    'SELECT id, paid_by, amount FROM expenses WHERE group_id = ?',
    [groupId]
  );

  const [splits] = await pool.query(
    `SELECT es.expense_id, es.user_id, es.share_amount
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id = ?`,
    [groupId]
  );

  const [settlements] = await pool.query(
    'SELECT from_user, to_user, amount FROM settlements WHERE group_id = ?',
    [groupId]
  );

  const balances = computeNetBalances(expenses, splits, settlements, memberIds);
  const simplifiedDebts = simplifyDebts(balances);

  return { balances, simplifiedDebts };
}

async function addExpense(req, res) {
  const conn = await pool.getConnection();
  try {
    const groupId = req.params.groupId;
    const userId = req.user.id;
    let { amount, category, description, splitType, splits } = req.body;
    // splits: [{ userId, shareAmount }] - required, computed on frontend or here for 'equal'
    if (typeof splits === 'string') {
      try {
        splits = JSON.parse(splits);
      } catch (e) {
        splits = [];
      }
    }

    const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!(await assertMembership(groupId, userId))) {
      conn.release();
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    if (!amount || amount <= 0) {
      conn.release();
      return res.status(400).json({ error: 'A valid amount is required' });
    }
    if (!Array.isArray(splits) || splits.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'Expense splits are required' });
    }

    const splitSum = splits.reduce((sum, s) => sum + Number(s.shareAmount), 0);
    if (Math.abs(splitSum - Number(amount)) > 0.05) {
      conn.release();
      return res.status(400).json({ error: 'Split amounts must add up to the total expense amount' });
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO expenses (group_id, paid_by, amount, category, description, split_type, receipt_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [groupId, userId, amount, category || 'General', description || '', splitType || 'equal', receiptUrl]
    );
    const expenseId = result.insertId;

    for (const split of splits) {
      await conn.query(
        'INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, ?)',
        [expenseId, split.userId, split.shareAmount]
      );
    }

    await conn.commit();
    conn.release();

    const { balances, simplifiedDebts } = await getGroupBalanceData(groupId);

    const io = req.app.get('io');
    io.to(`group:${groupId}`).emit('balances:updated', {
      groupId,
      balances,
      simplifiedDebts,
      reason: 'expense_added',
      expenseId
    });

    res.status(201).json({
      expense: { id: expenseId, groupId, paidBy: userId, amount, category, description, splitType, receipt_url: receiptUrl },
      balances,
      simplifiedDebts
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('Add expense error:', err);
    res.status(500).json({ error: 'Could not add expense' });
  }
}

async function getExpenses(req, res) {
  try {
    const groupId = req.params.groupId;
    const userId = req.user.id;

    if (!(await assertMembership(groupId, userId))) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const [expenses] = await pool.query(
      `SELECT e.id, e.amount, e.category, e.description, e.split_type, e.receipt_url, e.created_at,
              u.id AS paid_by_id, u.name AS paid_by_name
       FROM expenses e
       JOIN users u ON u.id = e.paid_by
       WHERE e.group_id = ?
       ORDER BY e.created_at DESC`,
      [groupId]
    );

    res.json({ expenses });
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ error: 'Could not fetch expenses' });
  }
}

async function getBalances(req, res) {
  try {
    const groupId = req.params.groupId;
    const userId = req.user.id;

    if (!(await assertMembership(groupId, userId))) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const { balances, simplifiedDebts } = await getGroupBalanceData(groupId);
    res.json({ balances, simplifiedDebts });
  } catch (err) {
    console.error('Get balances error:', err);
    res.status(500).json({ error: 'Could not fetch balances' });
  }
}

async function settleUp(req, res) {
  try {
    const groupId = req.params.groupId;
    const userId = req.user.id;
    const { toUserId, amount } = req.body;

    if (!(await assertMembership(groupId, userId))) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }
    if (!toUserId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'A valid recipient and amount are required' });
    }

    await pool.query(
      'INSERT INTO settlements (group_id, from_user, to_user, amount) VALUES (?, ?, ?, ?)',
      [groupId, userId, toUserId, amount]
    );

    const { balances, simplifiedDebts } = await getGroupBalanceData(groupId);

    const io = req.app.get('io');
    io.to(`group:${groupId}`).emit('balances:updated', {
      groupId,
      balances,
      simplifiedDebts,
      reason: 'settlement_recorded'
    });

    res.status(201).json({ balances, simplifiedDebts });
  } catch (err) {
    console.error('Settle up error:', err);
    res.status(500).json({ error: 'Could not record settlement' });
  }
}


async function editExpense(req, res) {
  const conn = await pool.getConnection();
  try {
    const { groupId, expenseId } = req.params;
    const userId = req.user.id;
    const { amount, category, description, splits } = req.body;

    if (!(await assertMembership(groupId, userId))) {
      conn.release();
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const [existing] = await conn.query(
      'SELECT * FROM expenses WHERE id = ? AND group_id = ?',
      [expenseId, groupId]
    );
    if (existing.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (String(existing[0].paid_by) !== String(userId)) {
      conn.release();
      return res.status(403).json({ error: 'Only the person who paid can edit this expense' });
    }

    if (!amount || amount <= 0) {
      conn.release();
      return res.status(400).json({ error: 'A valid amount is required' });
    }
    if (!Array.isArray(splits) || splits.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'Expense splits are required' });
    }
    const splitSum = splits.reduce((sum, s) => sum + Number(s.shareAmount), 0);
    if (Math.abs(splitSum - Number(amount)) > 0.05) {
      conn.release();
      return res.status(400).json({ error: 'Split amounts must add up to the total expense amount' });
    }

    await conn.beginTransaction();

    await conn.query(
      `UPDATE expenses SET amount = ?, category = ?, description = ? WHERE id = ?`,
      [amount, category || 'General', description || '', expenseId]
    );

   
    await conn.query('DELETE FROM expense_splits WHERE expense_id = ?', [expenseId]);
    for (const split of splits) {
      await conn.query(
        'INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, ?)',
        [expenseId, split.userId, split.shareAmount]
      );
    }

    await conn.commit();
    conn.release();

    const { balances, simplifiedDebts } = await getGroupBalanceData(groupId);

    const io = req.app.get('io');
    io.to(`group:${groupId}`).emit('balances:updated', {
      groupId,
      balances,
      simplifiedDebts,
      reason: 'expense_edited',
      expenseId
    });

    res.json({ balances, simplifiedDebts });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('Edit expense error:', err);
    res.status(500).json({ error: 'Could not update expense' });
  }
}

async function getExpenseSplits(req, res) {
  try {
    const { groupId, expenseId } = req.params;
    const userId = req.user.id;

    if (!(await assertMembership(groupId, userId))) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const [expRows] = await pool.query(
      'SELECT id FROM expenses WHERE id = ? AND group_id = ?',
      [expenseId, groupId]
    );
    if (expRows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const [splits] = await pool.query(
      'SELECT user_id AS userId, share_amount AS shareAmount FROM expense_splits WHERE expense_id = ?',
      [expenseId]
    );

    res.json({ splits });
  } catch (err) {
    console.error('Get expense splits error:', err);
    res.status(500).json({ error: 'Could not fetch expense splits' });
  }
}

async function deleteExpense(req, res) {
  try {
    const { groupId, expenseId } = req.params;
    const userId = req.user.id;

    if (!(await assertMembership(groupId, userId))) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const [existing] = await pool.query(
      'SELECT * FROM expenses WHERE id = ? AND group_id = ?',
      [expenseId, groupId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (String(existing[0].paid_by) !== String(userId)) {
      return res.status(403).json({ error: 'Only the person who paid can delete this expense' });
    }

    await pool.query('DELETE FROM expenses WHERE id = ?', [expenseId]);

    const { balances, simplifiedDebts } = await getGroupBalanceData(groupId);

    const io = req.app.get('io');
    io.to(`group:${groupId}`).emit('balances:updated', {
      groupId,
      balances,
      simplifiedDebts,
      reason: 'expense_deleted',
      expenseId
    });

    res.json({ balances, simplifiedDebts });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Could not delete expense' });
  }
}

module.exports = { addExpense, getExpenses, getBalances, settleUp, getGroupBalanceData, editExpense, deleteExpense, getExpenseSplits };
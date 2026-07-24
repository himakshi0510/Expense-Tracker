const pool = require('../config/db');
const { getGroupBalanceData } = require('./expenseController');
async function getDashboard(req, res) {
  try {
    const userId = req.user.id;

    const [groups] = await pool.query(
      `SELECT g.id, g.name, g.currency
       FROM \`groups\` g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = ?`,
      [userId]
    );

    let totalOwedToYou = 0;
    let totalYouOwe = 0;
    const groupSummaries = [];

    for (const group of groups) {
      const { balances } = await getGroupBalanceData(group.id);
      const yourBalance = balances[String(userId)] || 0;
      const currency = group.currency || 'INR';

      if (currency === 'INR') {
        if (yourBalance > 0) totalOwedToYou += yourBalance;
        if (yourBalance < 0) totalYouOwe += Math.abs(yourBalance);
      }

      groupSummaries.push({
        groupId: group.id,
        groupName: group.name,
        currency,
        yourBalance: Math.round(yourBalance * 100) / 100
      });
    }

    const [monthRows] = await pool.query(
      `SELECT COALESCE(SUM(es.share_amount), 0) AS total
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       JOIN \`groups\` g ON g.id = e.group_id
       JOIN group_members gm ON gm.group_id = e.group_id
       WHERE es.user_id = ?
         AND gm.user_id = ?
         AND (g.currency IS NULL OR g.currency = 'INR')
         AND DATE_FORMAT(e.created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')`,
      [userId, userId]
    );

    const [billRows] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM recurring_bills WHERE user_id = ?',
      [userId]
    );

    res.json({
      totalOwedToYou: Math.round(totalOwedToYou * 100) / 100,
      totalYouOwe: Math.round(totalYouOwe * 100) / 100,
      yourSpendThisMonth: Number(monthRows[0].total),
      recurringBillsMonthlyTotal: Number(billRows[0].total),
      recurringBillsCount: billRows[0].count,
      groupSummaries
    });
  } catch (err) {
    console.error('Get dashboard error:', err);
    res.status(500).json({ error: 'Could not load dashboard' });
  }
}

module.exports = { getDashboard };

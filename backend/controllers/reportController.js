const PDFDocument = require('pdfkit');
const pool = require('../config/db');
const { getGroupBalanceData } = require('./expenseController');

async function assertMembership(groupId, userId) {
  const [rows] = await pool.query(
    'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, userId]
  );
  return rows.length > 0;
}

const SYMBOLS = {
  INR: 'Rs.',
  USD: '$',
  EUR: 'EUR',
  GBP: 'GBP'
};

function getSymbol(currencyCode) {
  return SYMBOLS[currencyCode] || SYMBOLS['INR'];
}


async function generateGroupReport(req, res) {
  try {
    const groupId = req.params.groupId;
    const userId = req.user.id;

    if (!(await assertMembership(groupId, userId))) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const [groups] = await pool.query('SELECT * FROM `groups` WHERE id = ?', [groupId]);
    if (groups.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    const group = groups[0];

    const [members] = await pool.query(
      `SELECT u.id, u.name, u.email
       FROM users u
       JOIN group_members gm ON gm.user_id = u.id
       WHERE gm.group_id = ?`,
      [groupId]
    );

    const membersById = Object.fromEntries(members.map(m => [String(m.id), m]));

    const [expenses] = await pool.query(
      `SELECT e.id, e.amount, e.category, e.description, e.created_at,
              u.name AS paid_by_name
       FROM expenses e
       JOIN users u ON u.id = e.paid_by
       WHERE e.group_id = ?
       ORDER BY e.created_at DESC`,
      [groupId]
    );

    const { balances, simplifiedDebts } = await getGroupBalanceData(groupId);
    const sym = getSymbol(group.currency || 'INR');

    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="group-report.pdf"'
    );

    doc.pipe(res);

   
    doc
      .fontSize(22)
      .fillColor('#2B2E4A')
      .text(group.name, { align: 'left' });

    doc
      .fontSize(11)
      .fillColor('#6B6858')
      .text(`Group Financial Summary & Expense Report — ${new Date().toLocaleDateString()}`, { align: 'left' });

    doc.moveDown(1.5);
    doc.fontSize(15).fillColor('#2B2E4A').text('1. Member Balances');
    doc.moveDown(0.5);

    members.forEach(m => {
      const bal = balances[String(m.id)] || 0;
      const isSettled = Math.abs(bal) < 0.01;
      const textBal = isSettled
        ? 'All settled up'
        : bal > 0
        ? `Owed +${sym}${bal.toFixed(2)}`
        : `Owes -${sym}${Math.abs(bal).toFixed(2)}`;

      doc.fontSize(11).fillColor('#333333').text(`• ${m.name} (${m.email}): `, { continued: true });
      doc.fillColor(isSettled ? '#666666' : bal > 0 ? '#2F6F62' : '#B8860B').text(textBal);
    });

    doc.moveDown(1.5);
    doc.fontSize(15).fillColor('#2B2E4A').text('2. Settle Up Plan');
    doc.moveDown(0.5);

    if (simplifiedDebts.length === 0) {
      doc.fontSize(11).fillColor('#2F6F62').text('All members are currently settled up.');
    } else {
      simplifiedDebts.forEach(debt => {
        const fromName = membersById[debt.from]?.name || 'Member';
        const toName = membersById[debt.to]?.name || 'Member';
        doc.fontSize(11).fillColor('#333333').text(`• ${fromName} pays ${toName}: ${sym}${debt.amount.toFixed(2)}`);
      });
    }

    doc.moveDown(1.5);
    doc.fontSize(15).fillColor('#2B2E4A').text('3. Expense History');
    doc.moveDown(0.5);

    if (expenses.length === 0) {
      doc.fontSize(11).fillColor('#666666').text('No expenses recorded in this group yet.');
    } else {
      const startX = 50;
      let startY = doc.y;
      doc.fontSize(10).fillColor('#2B2E4A').font('Helvetica-Bold');
      doc.text('Date', startX, startY, { width: 80 });
      doc.text('Description', startX + 85, startY, { width: 140 });
      doc.text('Category', startX + 230, startY, { width: 90 });
      doc.text('Paid By', startX + 325, startY, { width: 90 });
      doc.text('Amount', startX + 420, startY, { width: 75, align: 'right' });

      doc.moveTo(startX, startY + 15).lineTo(startX + 495, startY + 15).stroke('#D8D0BC');
      startY += 20;

      doc.font('Helvetica').fontSize(9).fillColor('#333333');

      expenses.forEach(exp => {
        if (startY > 720) {
          doc.addPage();
          startY = 50;
        }

        const dateStr = new Date(exp.created_at).toLocaleDateString();
        const desc = exp.description || exp.category;
        const cat = exp.category || 'General';
        const paidBy = exp.paid_by_name;
        const amtStr = `${sym}${Number(exp.amount).toFixed(2)}`;

        doc.text(dateStr, startX, startY, { width: 80 });
        doc.text(desc, startX + 85, startY, { width: 140, height: 15, ellipsis: true });
        doc.text(cat, startX + 230, startY, { width: 90, height: 15, ellipsis: true });
        doc.text(paidBy, startX + 325, startY, { width: 90, height: 15, ellipsis: true });
        doc.text(amtStr, startX + 420, startY, { width: 75, align: 'right' });

        startY += 18;
      });
    }

    doc.end();
  } catch (err) {
    console.error('Generate PDF report error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Could not generate report' });
    }
  }
}

module.exports = { generateGroupReport };

const pool = require('../config/db');

async function getInsights(req, res) {
  try {
    const groupId = req.params.groupId;
    const userId = req.user.id;

    const [membership] = await pool.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    if (membership.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const [expenses] = await pool.query(
      `SELECT amount, category, description, created_at
       FROM expenses
       WHERE group_id = ?
       ORDER BY created_at ASC`,
      [groupId]
    );

    if (expenses.length < 3) {
      return res.json({
        insights: ["Add a few more expenses and check back — there's not quite enough history yet to spot meaningful patterns."]
      });
    }

    const summary = buildSpendingSummary(expenses);

    const prompt = `You are analyzing real shared-expense data for a group expense tracker.
Here is a structured summary of the group's spending (all figures in INR):

${JSON.stringify(summary, null, 2)}

Based on ONLY this data, write 2-4 short, specific insights a group member would find genuinely useful.
Rules:
- Reference actual numbers and categories from the data provided.
- If a category/description repeats across multiple months, point it out as a likely recurring expense.
- If one category dominates total spending, mention it with the real percentage.
- Do not invent categories, amounts, or months not present in the data.
- Keep each insight to one sentence. No preamble, no generic advice.
- Return ONLY a JSON array of strings, nothing else.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return res.status(502).json({ error: 'Could not generate insights right now' });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let insights;
    try {
      const cleaned = text.replace(/```json|```/g, '').trim();
      insights = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse AI response as JSON:', text);
      return res.status(502).json({ error: 'Could not parse insights response' });
    }

    res.json({ insights });
  } catch (err) {
    console.error('Get insights error:', err);
    res.status(500).json({ error: 'Could not generate insights' });
  }
}

function buildSpendingSummary(expenses) {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const byCategory = {};
  const byDescriptionMonth = {};

  expenses.forEach(e => {
    const cat = e.category || 'General';
    const amount = Number(e.amount);
    byCategory[cat] = (byCategory[cat] || 0) + amount;

    const month = new Date(e.created_at).toISOString().slice(0, 7); // YYYY-MM
    const descKey = (e.description || cat).trim().toLowerCase();
    if (!byDescriptionMonth[descKey]) byDescriptionMonth[descKey] = new Set();
    byDescriptionMonth[descKey].add(month);
  });

  const categoryBreakdown = Object.entries(byCategory).map(([category, amount]) => ({
    category,
    amount: Math.round(amount * 100) / 100,
    percentOfTotal: Math.round((amount / total) * 1000) / 10
  }));

  // Anything appearing in 2+ distinct months looks recurring
  const likelyRecurring = Object.entries(byDescriptionMonth)
    .filter(([, months]) => months.size >= 2)
    .map(([description, months]) => ({ description, monthsSeen: months.size }));

  return {
    totalSpend: Math.round(total * 100) / 100,
    numberOfExpenses: expenses.length,
    categoryBreakdown,
    likelyRecurringExpenses: likelyRecurring
  };
}

module.exports = { getInsights };

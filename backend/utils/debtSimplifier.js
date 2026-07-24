/**
 * Debt Simplification Algorithm
 * ------------------------------
 * Problem: Given a set of net balances for each person in a group
 * (positive = they are owed money, negative = they owe money),
 * find the MINIMUM number of transactions needed to settle all debts.
 *
 * Approach: Greedy matching.
 *   1. Split people into creditors (balance > 0) and debtors (balance < 0).
 *   2. Repeatedly take the largest creditor and largest debtor,
 *      settle the smaller of the two amounts between them,
 *      and reduce both balances accordingly.
 *   3. Repeat until all balances are ~0.
 *
 * This greedy approach is a well-known heuristic for this problem
 * (related to the "minimum transaction" / cash flow simplification problem).
 * It does not always yield the mathematically optimal minimum in every
 * edge case (that is NP-hard in general), but it performs very close to
 * optimal in practice and runs in O(n log n).
 *
 * @param {Object} balances - map of userId -> net balance (number)
 *   e.g. { "1": 500, "2": -300, "3": -200 }
 * @returns {Array} list of { from, to, amount } settlement instructions
 */

const EPSILON = 0.01; // to handle floating point rounding

function simplifyDebts(balances) {
  // Convert to array of { userId, amount }, filter out near-zero balances
  const entries = Object.entries(balances)
    .map(([userId, amount]) => ({ userId, amount: Math.round(amount * 100) / 100 }))
    .filter(entry => Math.abs(entry.amount) > EPSILON);

  const creditors = entries.filter(e => e.amount > 0).sort((a, b) => b.amount - a.amount);
  const debtors = entries.filter(e => e.amount < 0).sort((a, b) => a.amount - b.amount); // most negative first

  const transactions = [];

  let i = 0; // pointer into debtors
  let j = 0; // pointer into creditors

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const debtAmount = Math.abs(debtor.amount);
    const creditAmount = creditor.amount;

    const settledAmount = Math.round(Math.min(debtAmount, creditAmount) * 100) / 100;

    if (settledAmount > EPSILON) {
      transactions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: settledAmount
      });
    }

    debtor.amount += settledAmount;
    creditor.amount -= settledAmount;

    if (Math.abs(debtor.amount) <= EPSILON) i++;
    if (Math.abs(creditor.amount) <= EPSILON) j++;
  }

  return transactions;
}

/**
 * Computes net balances for every member of a group given all expenses,
 * their splits, and any settlements already recorded.
 *
 * @param {Array} expenses - [{ id, paid_by, amount }]
 * @param {Array} splits - [{ expense_id, user_id, share_amount }]
 * @param {Array} settlements - [{ from_user, to_user, amount }]
 * @param {Array} memberIds - all user IDs in the group (ensures everyone appears, even with 0 balance)
 * @returns {Object} map of userId -> net balance
 */
function computeNetBalances(expenses, splits, settlements, memberIds = []) {
  const balances = {};
  memberIds.forEach(id => { balances[id] = 0; });

  // Each expense: payer gets credited the full amount
  expenses.forEach(exp => {
    const payerId = String(exp.paid_by);
    balances[payerId] = (balances[payerId] || 0) + Number(exp.amount);
  });

  // Each split: the person who owes their share gets debited
  splits.forEach(split => {
    const userId = String(split.user_id);
    balances[userId] = (balances[userId] || 0) - Number(split.share_amount);
  });

  // Settlements: money actually paid reduces what the payer owes,
  // and reduces what the receiver is owed
  settlements.forEach(s => {
    const fromId = String(s.from_user);
    const toId = String(s.to_user);
    balances[fromId] = (balances[fromId] || 0) + Number(s.amount);
    balances[toId] = (balances[toId] || 0) - Number(s.amount);
  });

  // Round to avoid floating point drift
  Object.keys(balances).forEach(id => {
    balances[id] = Math.round(balances[id] * 100) / 100;
  });

  return balances;
}

module.exports = { simplifyDebts, computeNetBalances };

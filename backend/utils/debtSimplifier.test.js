const { simplifyDebts, computeNetBalances } = require('./debtSimplifier');

describe('simplifyDebts', () => {
  test('returns no transactions when everyone is already settled', () => {
    const balances = { '1': 0, '2': 0, '3': 0 };
    expect(simplifyDebts(balances)).toEqual([]);
  });

  test('handles a simple two-person debt', () => {
    const balances = { '1': 500, '2': -500 };
    const result = simplifyDebts(balances);
    expect(result).toEqual([{ from: '2', to: '1', amount: 500 }]);
  });

  test('simplifies a 3-person circular debt into minimum transactions', () => {
    // A owes B 500, B owes C 300, C owes A 200
    // Net: A = -500 + 200 = -300, B = 500 - 300 = 200, C = 300 - 200 = 100
    const balances = { A: -300, B: 200, C: 100 };
    const result = simplifyDebts(balances);

    // Should resolve in at most 2 transactions (n-1 for n=3 non-zero balances... 
    // actually minimum here is 2 since there are 2 creditors and 1 debtor)
    expect(result.length).toBeLessThanOrEqual(2);

    // Verify the transactions actually zero out all balances
    const finalBalances = { A: -300, B: 200, C: 100 };
    result.forEach(tx => {
      finalBalances[tx.from] += tx.amount;
      finalBalances[tx.to] -= tx.amount;
    });
    Object.values(finalBalances).forEach(bal => {
      expect(Math.abs(bal)).toBeLessThan(0.01);
    });
  });

  test('handles multiple creditors and debtors, minimizing transaction count', () => {
    // 4 people: two owe money, two are owed money
    const balances = { A: -600, B: -400, C: 700, D: 300 };
    const result = simplifyDebts(balances);

    // Total transactions should never exceed (numCreditors + numDebtors - 1) = 3
    expect(result.length).toBeLessThanOrEqual(3);

    const finalBalances = { ...balances };
    result.forEach(tx => {
      finalBalances[tx.from] += tx.amount;
      finalBalances[tx.to] -= tx.amount;
    });
    Object.values(finalBalances).forEach(bal => {
      expect(Math.abs(bal)).toBeLessThan(0.01);
    });
  });

  test('ignores near-zero floating point balances', () => {
    const balances = { A: 0.001, B: -0.001, C: 100, D: -100 };
    const result = simplifyDebts(balances);
    // Only the C/D pair should generate a transaction
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({ from: 'D', to: 'C', amount: 100 });
  });

  test('handles decimal amounts correctly without drift', () => {
    const balances = { A: 33.33, B: 33.33, C: -66.66 };
    const result = simplifyDebts(balances);

    const finalBalances = { ...balances };
    result.forEach(tx => {
      finalBalances[tx.from] += tx.amount;
      finalBalances[tx.to] -= tx.amount;
    });
    Object.values(finalBalances).forEach(bal => {
      expect(Math.abs(bal)).toBeLessThan(0.01);
    });
  });
});

describe('computeNetBalances', () => {
  test('computes correct balances from expenses and splits', () => {
    const expenses = [
      { id: 1, paid_by: '1', amount: 900 }
    ];
    const splits = [
      { expense_id: 1, user_id: '1', share_amount: 300 },
      { expense_id: 1, user_id: '2', share_amount: 300 },
      { expense_id: 1, user_id: '3', share_amount: 300 }
    ];
    const settlements = [];
    const memberIds = ['1', '2', '3'];

    const balances = computeNetBalances(expenses, splits, settlements, memberIds);

    expect(balances['1']).toBe(600);  // paid 900, owes 300 -> net +600
    expect(balances['2']).toBe(-300); // owes 300, paid nothing -> net -300
    expect(balances['3']).toBe(-300);
  });

  test('settlements correctly reduce balances', () => {
    const expenses = [{ id: 1, paid_by: '1', amount: 200 }];
    const splits = [
      { expense_id: 1, user_id: '1', share_amount: 100 },
      { expense_id: 1, user_id: '2', share_amount: 100 }
    ];
    const settlements = [{ from_user: '2', to_user: '1', amount: 100 }];
    const memberIds = ['1', '2'];

    const balances = computeNetBalances(expenses, splits, settlements, memberIds);

    // After the settlement, both should be at 0
    expect(balances['1']).toBe(0);
    expect(balances['2']).toBe(0);
  });

  test('members with no expenses at all remain at zero', () => {
    const balances = computeNetBalances([], [], [], ['1', '2', '3']);
    expect(balances).toEqual({ '1': 0, '2': 0, '3': 0 });
  });
});

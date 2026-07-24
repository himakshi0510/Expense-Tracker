import { useState } from 'react';
import api from '../lib/api';
import { getCurrencySymbol } from '../lib/currency';

export default function SettleUpList({ groupId, simplifiedDebts, membersById, currentUserId, onSettled, currency = 'INR' }) {
  const [settlingId, setSettlingId] = useState(null);
  const symbol = getCurrencySymbol(currency);

  async function handleSettle(debt) {
    setSettlingId(`${debt.from}-${debt.to}`);
    try {
      await api.post(`/groups/${groupId}/balances/settle`, {
        toUserId: debt.to,
        amount: debt.amount
      });
      onSettled?.();
    } catch (err) {
      console.error('Settle up failed:', err);
    } finally {
      setSettlingId(null);
    }
  }

  if (simplifiedDebts.length === 0) {
    return (
      <div className="card p-8 text-center flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-owed/15 border border-owed/30 flex items-center justify-center mb-2 text-owed">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-display text-lg font-medium text-owed">All settled up</p>
        <p className="text-sm text-muted font-body mt-1">
          No outstanding balances in this group.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4 space-y-4">
      {simplifiedDebts.map((debt, i) => {
        const fromName = membersById[debt.from]?.name || 'Someone';
        const toName = membersById[debt.to]?.name || 'Someone';
        const canSettle = String(debt.from) === String(currentUserId);
        const key = `${debt.from}-${debt.to}`;

        return (
          <div
            key={key}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 font-body border-b border-rule/30 sm:border-b-0 pb-3 sm:pb-0 last:border-b-0 last:pb-0"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <span className="ink-draw-underline self-start">
              <span className="font-medium">{fromName}</span>
              <span className="text-muted mx-2">→</span>
              <span className="font-medium">{toName}</span>
              <span className="text-muted mx-2">·</span>
              <span className="font-mono tabular-nums">{symbol}{debt.amount.toFixed(2)}</span>
            </span>

            {canSettle && (
              <button
                onClick={() => handleSettle(debt)}
                disabled={settlingId === key}
                className="btn-secondary text-xs sm:ml-4 self-start sm:self-auto shrink-0"
              >
                {settlingId === key ? 'Settling…' : 'Mark paid'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

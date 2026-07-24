import { getCurrencySymbol } from '../lib/currency';

export default function BalanceRow({ name, amount, isYou, currency = 'INR' }) {
  const isOwed = amount > 0;
  const isSettled = Math.abs(amount) < 0.01;
  const symbol = getCurrencySymbol(currency);

  const colorClass = isSettled
    ? 'text-muted'
    : isOwed
    ? 'text-owed'
    : 'text-owe';

  function sentence() {
    if (isSettled) {
      return isYou ? "You're all settled up" : `${name} is all settled up`;
    }
    if (isYou) {
      return isOwed ? 'You are owed' : 'You owe';
    }
    return isOwed ? `${name} is owed` : `${name} owes`;
  }

  return (
    <div className="ledger-row flex-col items-start sm:flex-row sm:items-center gap-1 sm:gap-0">
      <div>
        <p className="font-body font-medium">
          {name} {isYou && <span className="text-muted text-sm font-normal">(you)</span>}
        </p>
        <p className={`text-sm font-body ${colorClass}`}>{sentence()}</p>
      </div>
      <span className={`ledger-amount text-lg font-semibold ${colorClass}`}>
        {isSettled ? '—' : `${isOwed ? '+' : '−'}${symbol}${Math.abs(amount).toFixed(2)}`}
      </span>
    </div>
  );
}

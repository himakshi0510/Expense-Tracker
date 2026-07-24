export const CURRENCIES = [
  { code: 'INR', symbol: '₹' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' }
];

export function getCurrencySymbol(code) {
  const found = CURRENCIES.find(c => c.code === code);
  return found ? found.symbol : '₹';
}

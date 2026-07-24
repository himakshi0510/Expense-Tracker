import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getCurrencySymbol } from '../lib/currency';

const COLORS = ['#B8860B', '#2F6F62', '#8B6F47', '#5C7A8A', '#A0522D', '#6B6858'];

export default function SpendingChart({ expenses, currency = 'INR' }) {
  const symbol = getCurrencySymbol(currency);
  const data = useMemo(() => {
    const totals = {};
    expenses.forEach(exp => {
      const cat = exp.category || 'General';
      totals[cat] = (totals[cat] || 0) + Number(exp.amount);
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="card p-5">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Donut chart with center label */}
        <div className="w-full sm:w-60 h-60 shrink-0 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                isAnimationActive={true}
                animationDuration={500}
                animationEasing="ease-out"
              >
                {data.map((entry, i) => (
                  <Cell key={entry.name} fill={COLORS[i % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${symbol}${value.toFixed(2)}`, '']}
                contentStyle={{
                  fontFamily: 'IBM Plex Sans, sans-serif',
                  fontSize: '13px',
                  borderRadius: '6px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center Donut Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] font-body uppercase tracking-wider text-muted">
              Total
            </span>
            <span className="text-base font-mono font-semibold text-ink">
              {symbol}{total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-3">
          {data.map((entry, i) => (
            <div key={entry.name} className="flex items-center justify-between text-sm font-body">
              <span className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="font-medium">{entry.name}</span>
              </span>
              <span className="font-mono tabular-nums text-muted">
                {symbol}{entry.value.toFixed(2)}
                <span className="ml-2 text-xs opacity-75">
                  ({((entry.value / total) * 100).toFixed(0)}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

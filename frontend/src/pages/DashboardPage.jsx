import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid } from 'recharts';
import api from '../lib/api';
import { getCurrencySymbol } from '../lib/currency';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(res => setData(res.data))
      .catch(err => console.error('Failed to load dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted font-body">Loading…</p>;
  }

  if (!data) {
    return <p className="text-owe font-body">Could not load dashboard.</p>;
  }

  const chartData = data.groupSummaries.map(g => ({
    name: g.groupName,
    value: g.yourBalance,
    currency: g.currency
  }));

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold mb-6">Dashboard</h1>

      {/* Stat cards — p-5 for generous internal padding */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-sm text-muted font-body mb-1">
            You are owed
          </p>
          <p className="text-2xl font-mono tabular-nums font-semibold text-owed">
            ₹{data.totalOwedToYou.toFixed(2)}
          </p>
          <p className="text-xs text-muted font-body mt-1">INR groups only</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted font-body mb-1">
            You owe
          </p>
          <p className="text-2xl font-mono tabular-nums font-semibold text-owe">
            ₹{data.totalYouOwe.toFixed(2)}
          </p>
          <p className="text-xs text-muted font-body mt-1">INR groups only</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted font-body mb-1">
            Your spend this month
          </p>
          <p className="text-2xl font-mono tabular-nums font-semibold">
            ₹{data.yourSpendThisMonth.toFixed(2)}
          </p>
          <p className="text-xs text-muted font-body mt-1">INR groups only</p>
        </div>
        <Link to="/recurring-bills" className="card p-5 hover:bg-surface transition-colors duration-150 card-link">
          <p className="text-sm text-muted font-body mb-1">
            Recurring bills / month
          </p>
          <p className="text-2xl font-mono tabular-nums font-semibold">
            ₹{data.recurringBillsMonthlyTotal.toFixed(2)}
          </p>
          <p className="text-xs text-muted font-body mt-1">
            {data.recurringBillsCount} bill{data.recurringBillsCount !== 1 ? 's' : ''}
          </p>
        </Link>
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="card p-5 mb-8">
          <h2 className="text-lg font-display font-medium mb-3">Balance by group</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-rule)"
                  opacity={0.5}
                  horizontal={false}
                />
                <XAxis type="number" tick={{ fontSize: 12, fontFamily: 'IBM Plex Mono' }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 12, fontFamily: 'IBM Plex Sans' }}
                />
                <Tooltip
                  formatter={(value, name, props) => [`${getCurrencySymbol(props?.payload?.currency)}${Number(value).toFixed(2)}`, 'Your balance']}
                  contentStyle={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '13px', borderRadius: '6px' }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={true} animationDuration={500}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.value >= 0 ? 'var(--color-owed)' : 'var(--color-owe)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Group list */}
      <div>
        <h2 className="text-lg font-display font-medium mb-2">Your groups</h2>
        {data.groupSummaries.length === 0 ? (
          <div className="card p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-bg border border-rule flex items-center justify-center mb-3 text-muted">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-muted font-body mb-3 text-sm">
              You're not in any groups yet.
            </p>
            <Link to="/groups" className="btn-primary text-sm inline-block">
              Go to groups
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-rule">
            {data.groupSummaries.map(g => {
              const isSettled = Math.abs(g.yourBalance) < 0.01;
              const isOwed = g.yourBalance > 0;
              const symbol = getCurrencySymbol(g.currency);
              return (
                <Link
                  key={g.groupId}
                  to={`/groups/${g.groupId}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-bg transition-colors duration-150 card-link"
                >
                  <span className="font-body font-medium">{g.groupName}</span>
                  <span
                    className={`font-mono tabular-nums text-sm ${
                      isSettled
                        ? 'text-muted'
                        : isOwed
                        ? 'text-owed'
                        : 'text-owe'
                    }`}
                  >
                    {isSettled ? 'Settled' : `${isOwed ? '+' : '−'}${symbol}${Math.abs(g.yourBalance).toFixed(2)}`}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

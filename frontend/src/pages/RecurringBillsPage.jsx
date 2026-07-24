import { useEffect, useState } from 'react';
import api from '../lib/api';
import Skeleton from '../components/Skeleton';

const CATEGORIES = ['Subscription', 'Rent', 'Utilities', 'Loan/EMI', 'Insurance', 'General'];

export default function RecurringBillsPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Subscription');
  const [dueDay, setDueDay] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('dueDate');

  function fetchBills() {
    setLoading(true);
    api.get('/recurring-bills')
      .then(res => setBills(res.data.bills))
      .catch(err => console.error('Failed to load bills:', err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchBills();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/recurring-bills', {
        name,
        amount: parseFloat(amount),
        category,
        dueDay: parseInt(dueDay, 10)
      });
      setName('');
      setAmount('');
      setDueDay('1');
      setShowForm(false);
      fetchBills();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add recurring bill');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(billId) {
    if (!window.confirm('Delete this recurring bill?')) return;
    setDeletingId(billId);
    try {
      await api.delete(`/recurring-bills/${billId}`);
      fetchBills();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  }

  const filteredAndSortedBills = bills
    .filter(b => !selectedCategory || b.category === selectedCategory)
    .sort((a, b) => {
      if (sortBy === 'amount') {
        return Number(b.amount) - Number(a.amount);
      }
      return Number(a.due_day) - Number(b.due_day);
    });

  const totalMonthly = filteredAndSortedBills.reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-display font-semibold">Recurring bills</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            + Add bill
          </button>
        )}
      </div>
      <p className="text-sm text-muted font-body mb-6">
        Personal reminders — rent, subscriptions, EMIs. Not shared with any group.
      </p>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 mb-6 space-y-3">
          <div>
            <label className="block text-sm font-body mb-1 text-muted">
              Bill name
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. Netflix, Phone EMI"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-body mb-1 text-muted">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                className="input-field font-mono"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-body mb-1 text-muted">
                Category
              </label>
              <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-body mb-1 text-muted">
                Due day
              </label>
              <input
                type="number"
                min="1"
                max="28"
                required
                className="input-field font-mono"
                value={dueDay}
                onChange={e => setDueDay(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-owe text-sm font-body">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary text-sm">
              {submitting ? 'Adding…' : 'Add bill'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter and Sort Controls */}
      {bills.length > 0 && (
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-body mb-1 text-muted">
              Filter by category
            </label>
            <select
              className="input-field text-sm"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-body mb-1 text-muted">
              Sort by
            </label>
            <select
              className="input-field text-sm"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="dueDate">Due date</option>
              <option value="amount">Amount (highest first)</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card px-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="ledger-row">
              <div className="space-y-1.5 flex-1">
                <Skeleton width="35%" height="1.1rem" />
                <Skeleton width="50%" height="0.85rem" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton width="70px" height="1.25rem" />
                <Skeleton width="45px" height="1rem" />
              </div>
            </div>
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="card p-10 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-bg border border-rule flex items-center justify-center mb-3 text-muted">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-muted font-body text-sm">
            No recurring bills yet. Add your rent, subscriptions, or EMIs to keep track of them.
          </p>
        </div>
      ) : filteredAndSortedBills.length === 0 ? (
        <div className="card p-10 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-bg border border-rule flex items-center justify-center mb-3 text-muted">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <p className="text-muted font-body text-sm">
            No recurring bills match your selected category.
          </p>
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            className="mt-3 text-sm text-ink underline font-body hover:opacity-75"
          >
            Clear category filter
          </button>
        </div>
      ) : (
        <>
          <div className="card px-4 mb-3">
            {filteredAndSortedBills.map(bill => (
              <div key={bill.id} className="ledger-row">
                <div>
                  <p className="font-body">
                    {bill.name}
                    {bill.isOverdueThisMonth && (
                      <span className="ml-2 text-xs text-owe">
                        · due day {bill.due_day} passed
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted font-body">
                    {bill.category} · due on day {bill.due_day} of each month
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="ledger-amount">₹{Number(bill.amount).toFixed(2)}</span>
                  <button
                    onClick={() => handleDelete(bill.id)}
                    disabled={deletingId === bill.id}
                    className="text-xs text-owe hover:opacity-75 underline shrink-0"
                  >
                    {deletingId === bill.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted font-body text-right">
            Total per month: <span className="font-mono">₹{totalMonthly.toFixed(2)}</span>
          </p>
        </>
      )}
    </div>
  );
}

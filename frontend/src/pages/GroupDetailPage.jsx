import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import BalanceRow from '../components/BalanceRow';
import SettleUpList from '../components/SettleUpList';
import ExpenseForm from '../components/ExpenseForm';
import SpendingChart from '../components/SpendingChart';
import AIInsights from '../components/AIInsights';
import { getCurrencySymbol } from '../lib/currency';

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({});
  const [simplifiedDebts, setSimplifiedDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [liveUpdateFlash, setLiveUpdateFlash] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState(null);
  const [viewReceiptUrl, setViewReceiptUrl] = useState(null);
  const [copyLabel, setCopyLabel] = useState('Share invite');
  const [searchText, setSearchText] = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const membersById = Object.fromEntries(members.map(m => [String(m.id), m]));
  const BACKEND_BASE = (import.meta.env.VITE_API_URL || 'https://expense-tracker-3nwb.onrender.com/api').replace(/\/api\/?$/, '');
  const getImageUrl = (url) => url ? (url.startsWith('http') ? url : `${BACKEND_BASE}${url}`) : '';
  const distinctCategories = [...new Set(expenses.map(e => e.category).filter(Boolean))];

  const filteredExpenses = expenses.filter(exp => {
    if (searchText) {
      const q = searchText.toLowerCase();
      const matchDesc = (exp.description || '').toLowerCase().includes(q);
      const matchCat = (exp.category || '').toLowerCase().includes(q);
      if (!matchDesc && !matchCat) return false;
    }
    if (filterMember && exp.paid_by_name !== filterMember) return false;
    if (filterCategory && exp.category !== filterCategory) return false;
    return true;
  });

  const filtersActive = searchText || filterMember || filterCategory;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [groupRes, expensesRes, balancesRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/groups/${groupId}/expenses`),
        api.get(`/groups/${groupId}/balances`)
      ]);
      setGroup(groupRes.data.group);
      setMembers(groupRes.data.members);
      setExpenses(expensesRes.data.expenses);
      setBalances(balancesRes.data.balances);
      setSimplifiedDebts(balancesRes.data.simplifiedDebts);
    } catch (err) {
      console.error('Failed to load group:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('group:join', groupId);

    function handleBalancesUpdated(payload) {
      if (String(payload.groupId) !== String(groupId)) return;
      setBalances(payload.balances);
      setSimplifiedDebts(payload.simplifiedDebts);
      api.get(`/groups/${groupId}/expenses`).then(res => setExpenses(res.data.expenses));

      setLiveUpdateFlash(true);
      setTimeout(() => setLiveUpdateFlash(false), 1500);
    }

    socket.on('balances:updated', handleBalancesUpdated);

    return () => {
      socket.emit('group:leave', groupId);
      socket.off('balances:updated', handleBalancesUpdated);
    };
  }, [socket, groupId]);

  if (loading) {
    return <p className="text-muted font-body">Loading…</p>;
  }

  if (!group) {
    return <p className="text-owe font-body">Group not found.</p>;
  }

  async function handleDelete(expenseId) {
    if (!window.confirm('Delete this expense? This will recalculate balances for everyone.')) return;
    setDeletingId(expenseId);
    try {
      await api.delete(`/groups/${groupId}/expenses/${expenseId}`);
      fetchAll();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err.response?.data?.error || 'Could not delete expense');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLeaveGroup() {
    if (!window.confirm(`Leave "${group.name}"? You'll need an invite code to rejoin.`)) return;
    setLeaving(true);
    setLeaveError(null);
    try {
      await api.post(`/groups/${groupId}/leave`);
      navigate('/groups');
    } catch (err) {
      setLeaveError(err.response?.data?.error || 'Could not leave group');
    } finally {
      setLeaving(false);
    }
  }

  async function handleExportPdf() {
    try {
      const token = localStorage.getItem('ledger-token');
      const BACKEND_URL = (import.meta.env.VITE_API_URL || 'https://expense-tracker-3nwb.onrender.com/api');
      const res = await fetch(`${BACKEND_URL}/groups/${groupId}/report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate report');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${group.name.replace(/\s+/g, '-')}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert('Could not generate PDF report.');
      console.error(err);
    }
  }

  
  async function handleShareInvite() {
    const link = `${window.location.origin}/join/${group.invite_code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${group.name} on Ledger`, url: link });
      } catch {
        // User cancelled share — no-op
      }
    } else {
      try {
        await navigator.clipboard.writeText(link);
        setCopyLabel('Link copied!');
        setTimeout(() => setCopyLabel('Share invite'), 2000);
      } catch {
        // Clipboard unavailable — just show the link
        alert(`Share this link: ${link}`);
      }
    }
  }

  return (
    <div>
      <Link
        to="/groups"
        className="text-sm text-muted hover:text-ink font-body inline-block mb-3"
      >
        ← Back to groups
      </Link>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-display font-semibold">{group.name}</h1>
        {connected && (
          <span
            className={`text-xs font-body px-2 py-0.5 rounded-full border border-rule
                       transition-colors duration-300 ${
                         liveUpdateFlash
                           ? 'bg-owed/20 border-owed'
                           : ''
                       }`}
          >
            ● Live
          </span>
        )}
      </div>

      {/* Group header card: invite code + actions */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <p className="text-sm text-muted font-body">
          Invite code: <span className="font-mono">{group.invite_code}</span> · {members.length} members
          {group.currency && group.currency !== 'INR' && (
            <span className="ml-2 text-xs font-mono bg-bg border border-rule px-1.5 py-0.5 rounded">
              {group.currency}
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {/* Share invite link button */}
          <button onClick={handleShareInvite} className="btn-secondary text-xs">
            {copyLabel}
          </button>
          {typeof handleExportPdf === 'function' && (
            <button onClick={handleExportPdf} className="btn-secondary text-xs">
              Export PDF
            </button>
          )}
          <button
            onClick={handleLeaveGroup}
            disabled={leaving}
            className="btn-secondary text-xs text-owe"
          >
            {leaving ? 'Leaving…' : 'Leave group'}
          </button>
        </div>
      </div>

      {leaveError && (
        <p className="text-owe text-sm font-body mb-4 card p-3">{leaveError}</p>
      )}

      {/* Balances */}
      <section className="mb-8">
        <h2 className="text-lg font-display font-medium mb-2">Balances</h2>
        <div className="card px-4">
          {members.map(m => (
            <BalanceRow
              key={m.id}
              name={m.name}
              amount={balances[String(m.id)] || 0}
              isYou={m.id === user.id}
              currency={group.currency}
            />
          ))}
        </div>
      </section>

      {/* Spending breakdown */}
      {expenses.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-display font-medium mb-2">Spending by category</h2>
          <SpendingChart expenses={expenses} currency={group.currency} />
        </section>
      )}

      {/* AI insights */}
      {expenses.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-display font-medium mb-2">Insights</h2>
          <AIInsights groupId={groupId} />
        </section>
      )}

      {/* Settle up — signature element */}
      <section className="mb-8">
        <h2 className="text-lg font-display font-medium mb-2">Settle up</h2>
        <SettleUpList
          groupId={groupId}
          simplifiedDebts={simplifiedDebts}
          membersById={membersById}
          currentUserId={user.id}
          onSettled={fetchAll}
          currency={group.currency}
        />
      </section>

      {/* Expenses */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-display font-medium">Expenses</h2>
          {!showExpenseForm && !editingExpense && (
            <button onClick={() => setShowExpenseForm(true)} className="btn-primary text-sm">
              + Add expense
            </button>
          )}
        </div>

        {(showExpenseForm || editingExpense) && (
          <ExpenseForm
            groupId={groupId}
            members={members}
            existingExpense={editingExpense}
            currency={group.currency}
            onAdded={() => {
              setShowExpenseForm(false);
              setEditingExpense(null);
              fetchAll();
            }}
            onCancel={() => {
              setShowExpenseForm(false);
              setEditingExpense(null);
            }}
          />
        )}

        {/* Search & filter controls */}
        <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-2 mb-3">
          <input
            type="text"
            className="input-field text-sm"
            placeholder="Search expenses…"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          <select
            className="input-field text-sm"
            value={filterMember}
            onChange={e => setFilterMember(e.target.value)}
          >
            <option value="">All members</option>
            {members.map(m => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>
          <select
            className="input-field text-sm"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {distinctCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {expenses.length === 0 ? (
          <div className="card p-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-bg border border-rule flex items-center justify-center mb-3 text-muted">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-muted font-body text-sm">
              No expenses yet. Add the first one above.
            </p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="card p-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-bg border border-rule flex items-center justify-center mb-3 text-muted">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-muted font-body text-sm">
              No expenses match your filters.
            </p>
            <button
              type="button"
              onClick={() => { setSearchText(''); setFilterMember(''); setFilterCategory(''); }}
              className="mt-3 text-sm text-ink underline font-body hover:opacity-75"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="card px-4">
            {filteredExpenses.map(exp => {
              const canModify = exp.paid_by_id === user.id;
              return (
                <div key={exp.id} className="ledger-row">
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    {exp.receipt_url && (
                      <button
                        type="button"
                        onClick={() => setViewReceiptUrl(getImageUrl(exp.receipt_url))}
                        className="shrink-0 group relative overflow-hidden rounded border border-rule focus:outline-none"
                        title="View receipt"
                      >
                        <img
                          src={getImageUrl(exp.receipt_url)}
                          alt="Receipt"
                          className="w-8 h-8 object-cover group-hover:scale-110 transition-transform duration-150"
                        />
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-body truncate">{exp.description || exp.category}</p>
                      <p className="text-xs text-muted font-body">
                        {exp.category} · paid by {exp.paid_by_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="ledger-amount">{getCurrencySymbol(group.currency)}{Number(exp.amount).toFixed(2)}</span>
                    {canModify && (
                      <div className="flex gap-1.5 text-xs shrink-0">
                        <button
                          onClick={() => setEditingExpense(exp)}
                          className="px-2.5 py-1 rounded-md border border-rule
                                     text-muted hover:bg-bg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          disabled={deletingId === exp.id}
                          className="px-2.5 py-1 rounded-md border border-rule
                                     text-owe hover:bg-bg transition-colors"
                        >
                          {deletingId === exp.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Lightbox modal for viewing receipt images */}
      {viewReceiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setViewReceiptUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-surface p-3 rounded-lg shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-1 pb-2 border-b border-rule mb-3">
              <span className="text-sm font-display font-medium text-ink">
                Receipt Image
              </span>
              <button
                type="button"
                onClick={() => setViewReceiptUrl(null)}
                className="text-xs font-body px-2 py-1 rounded bg-bg text-muted hover:text-ink"
              >
                Close ✕
              </button>
            </div>
            <img
              src={viewReceiptUrl}
              alt="Full Receipt"
              className="max-w-full max-h-[75vh] object-contain rounded mx-auto border border-rule"
            />
          </div>
        </div>
      )}
    </div>
  );
}

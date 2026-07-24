import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Skeleton from '../components/Skeleton';
import { CURRENCIES } from '../lib/currency';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [inviteCode, setInviteCode] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchGroups() {
    setLoading(true);
    try {
      const { data } = await api.get('/groups');
      setGroups(data.groups);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGroups();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/groups', { name: groupName, currency });
      setGroupName('');
      setCurrency('INR');
      setShowCreate(false);
      fetchGroups();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not create group');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/groups/join', { inviteCode: inviteCode.trim().toUpperCase() });
      setInviteCode('');
      setShowJoin(false);
      fetchGroups();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not join group');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-semibold">Your groups</h1>
        <div className="bg-surface border border-rule p-1.5 rounded-lg shadow-sm flex items-center gap-2">
          <button onClick={() => { setShowJoin(true); setShowCreate(false); }} className="btn-secondary text-sm py-1.5 px-3">
            Join group
          </button>
          <button onClick={() => { setShowCreate(true); setShowJoin(false); }} className="btn-primary text-sm py-1.5 px-3">
            + New group
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-4 mb-6 space-y-3">
          <div>
            <label className="block text-sm font-body text-muted mb-1">
              Group name
            </label>
            <input
              className="input-field"
              placeholder="e.g. Flat 3B"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-body text-muted mb-1">
              Currency
            </label>
            <select
              className="input-field"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          {formError && <p className="text-owe text-sm">{formError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary text-sm">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {showJoin && (
        <form onSubmit={handleJoin} className="card p-4 mb-6 space-y-3">
          <label className="block text-sm font-body text-muted">
            Invite code
          </label>
          <input
            className="input-field uppercase"
            placeholder="e.g. SLQTDX"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            required
          />
          {formError && <p className="text-owe text-sm">{formError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary text-sm">
              Join
            </button>
            <button type="button" onClick={() => setShowJoin(false)} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="card divide-y divide-rule">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between px-4 py-4">
              <div className="space-y-2 flex-1">
                <Skeleton width="35%" height="1.25rem" />
                <Skeleton width="50%" height="0.875rem" />
              </div>
              <Skeleton width="16px" height="1.25rem" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="card p-10 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-bg border border-rule flex items-center justify-center mb-3 text-muted">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-muted font-body text-sm">
            No groups yet. Create one, or join with an invite code.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-rule">
          {groups.map(group => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="flex items-center justify-between px-4 py-4 hover:bg-bg transition-colors duration-150 card-link"
            >
              <div>
                <p className="font-display text-lg">{group.name}</p>
                <p className="text-sm text-muted font-body">
                  {group.member_count} member{group.member_count !== 1 ? 's' : ''} · Code: {group.invite_code}
                </p>
              </div>
              <span className="text-muted">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

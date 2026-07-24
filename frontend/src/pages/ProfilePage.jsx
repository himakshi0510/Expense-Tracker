import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';

const COLOR_THEMES = [
  { id: 'classic',  label: 'Classic',  swatch: '#EFE9DD' },
  { id: 'midnight', label: 'Midnight', swatch: '#E8EDF2' },
  { id: 'sepia',    label: 'Sepia',    swatch: '#F0E6D2' },
  { id: 'slate',    label: 'Slate',    swatch: '#E6E8EC' }
];

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme, colorTheme, setColorTheme } = useTheme();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  async function handleSaveName() {
    if (!nameInput.trim()) {
      setNameError('Name cannot be empty');
      return;
    }
    setNameLoading(true);
    setNameError(null);
    setNameSuccess(false);
    try {
      const { data } = await api.put('/auth/profile', { name: nameInput.trim() });
      updateUser(data.user);
      setEditingName(false);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      setNameError(err.response?.data?.error || 'Could not update name');
    } finally {
      setNameLoading(false);
    }
  }

  function handleCancelName() {
    setNameInput(user?.name || '');
    setNameError(null);
    setEditingName(false);
  }



  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  async function handleSavePassword(e) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (!currentPassword) {
      setPwError('Enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirm password do not match');
      return;
    }

    setPwLoading(true);
    try {
      const { data } = await api.put('/auth/profile', {
        name: user?.name,
        currentPassword,
        newPassword,
      });
      updateUser(data.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwError(err.response?.data?.error || 'Could not update password');
    } finally {
      setPwLoading(false);
    }
  }

  function handleCancelPassword() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPwError(null);
    setPwSuccess(false);
    setShowPasswordSection(false);
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function PasswordField({ id, label, value, onChange, show, onToggle, autoComplete }) {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-body mb-1 text-muted">
          {label}
        </label>
        <div className="relative">
          <input
            id={id}
            type={show ? 'text' : 'password'}
            required
            autoComplete={autoComplete}
            className="input-field pr-16"
            value={value}
            onChange={e => onChange(e.target.value)}
          />
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold mb-6">Profile</h1>

      {/* ── Account info card ─────────────────────────────────────────────── */}
      <div className="card p-6 mb-6 space-y-5 max-w-md">

        {/* Name row */}
        <div>
          <p className="text-sm text-muted font-body mb-1">Name</p>
          {editingName ? (
            <div className="space-y-2">
              <input
                type="text"
                className="input-field"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                autoFocus
              />
              {nameError && (
                <p className="text-owe text-sm font-body">{nameError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={nameLoading}
                  className="btn-primary text-sm"
                >
                  {nameLoading ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelName}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="font-body text-lg">{user?.name}</p>
              <button
                type="button"
                onClick={() => { setEditingName(true); setNameInput(user?.name || ''); setNameError(null); }}
                className="text-xs text-muted hover:text-ink underline font-body"
              >
                Edit
              </button>
            </div>
          )}
          {nameSuccess && (
            <p className="text-owed text-sm font-body mt-1">
              Name updated successfully.
            </p>
          )}
        </div>

        {/* Email row (read-only) */}
        <div>
          <p className="text-sm text-muted font-body">Email</p>
          <p className="font-body text-lg">{user?.email}</p>
        </div>
      </div>

      {/* ── Change password card ──────────────────────────────────────────── */}
      <div className="card p-6 mb-6 max-w-md">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-body font-medium text-ink">
            Change password
          </p>
          {!showPasswordSection && (
            <button
              type="button"
              onClick={() => setShowPasswordSection(true)}
              className="text-xs text-muted hover:text-ink underline font-body"
            >
              Change
            </button>
          )}
        </div>

        {showPasswordSection ? (
          <form onSubmit={handleSavePassword} className="space-y-3">
            <PasswordField
              id="current-password"
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrent}
              onToggle={() => setShowCurrent(p => !p)}
              autoComplete="current-password"
            />
            <PasswordField
              id="new-password"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggle={() => setShowNew(p => !p)}
              autoComplete="new-password"
            />
            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirm}
              onToggle={() => setShowConfirm(p => !p)}
              autoComplete="new-password"
            />

            {pwError && (
              <p className="text-owe text-sm font-body">{pwError}</p>
            )}
            {pwSuccess && (
              <p className="text-owed text-sm font-body">
                Password updated successfully.
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={pwLoading} className="btn-primary text-sm">
                {pwLoading ? 'Saving…' : 'Save password'}
              </button>
              <button
                type="button"
                onClick={handleCancelPassword}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted font-body">
            ••••••••
          </p>
        )}
      </div>

      {/* ── Appearance card ───────────────────────────────────────────────── */}
      <div className="card p-6 mb-6 max-w-md space-y-5">
        {/* Dark / Light toggle */}
        <div>
          <p className="text-sm text-muted font-body mb-2">Mode</p>
          <button onClick={toggleTheme} className="btn-secondary text-sm">
            Switch to {theme === 'dark' ? 'light' : 'dark'} mode
          </button>
        </div>

        {/* Color theme picker */}
        <div>
          <p className="text-sm text-muted font-body mb-3">Color theme</p>
          <div className="grid grid-cols-2 gap-2">
            {COLOR_THEMES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setColorTheme(t.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md border text-sm font-body transition-all duration-150 ${
                  colorTheme === t.id
                    ? 'border-ink bg-ink text-surface'
                    : 'border-rule hover:bg-bg'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full shrink-0 border border-rule"
                  style={{ backgroundColor: t.swatch }}
                />
                {t.label}
                {colorTheme === t.id && (
                  <span className="ml-auto text-xs opacity-75">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={handleLogout} className="btn-secondary text-sm">
        Log out
      </button>
    </div>
  );
}

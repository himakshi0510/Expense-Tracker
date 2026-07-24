import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { signup, loading, error } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const success = await signup(name, email, password);
    if (success) navigate('/');
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-3xl font-display font-semibold mb-1">Open a ledger</h1>
      <p className="text-muted font-body mb-8">
        Create an account to start splitting expenses.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-body mb-1 text-muted">
            Name
          </label>
          <input
            type="text"
            required
            className="input-field"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-body mb-1 text-muted">
            Email
          </label>
          <input
            type="email"
            required
            className="input-field"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-body mb-1 text-muted">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              className="input-field pr-16"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {error && <p className="text-owe text-sm font-body">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <p className="text-sm font-body text-muted mt-6 text-center">
        Already have an account?{' '}
        <Link to="/login" className="text-ink underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

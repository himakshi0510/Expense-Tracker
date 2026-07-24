import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const success = await login(email, password);
    if (success) navigate('/');
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-3xl font-display font-semibold mb-1">Welcome back</h1>
      <p className="text-muted font-body mb-8">
        Log in to see your group's balances.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="text-sm font-body text-muted mt-6 text-center">
        No account yet?{' '}
        <Link to="/signup" className="text-ink underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

import { createContext, useContext, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ledger-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function persistSession(token, user) {
    localStorage.setItem('ledger-token', token);
    localStorage.setItem('ledger-user', JSON.stringify(user));
    setUser(user);
  }

  async function signup(name, email, password) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/signup', { name, email, password });
      persistSession(data.token, data.user);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create account');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      persistSession(data.token, data.user);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password');
      return false;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('ledger-token');
    localStorage.removeItem('ledger-user');
    setUser(null);
  }

  function updateUser(updatedUser) {
    const token = localStorage.getItem('ledger-token');
    persistSession(token, updatedUser);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signup, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

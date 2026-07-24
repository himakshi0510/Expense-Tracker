import { useState } from 'react';
import api from '../lib/api';

export default function AIInsights({ groupId }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchInsights() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/groups/${groupId}/insights`);
      setInsights(data.insights);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate insights right now');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4">
      {!insights && !loading && (
        <button onClick={fetchInsights} className="btn-secondary text-sm">
          ✦ Generate spending insights
        </button>
      )}

      {loading && (
        <p className="text-sm text-muted font-body animate-pulse">
          Analyzing your group's spending…
        </p>
      )}

      {error && (
        <p className="text-owe text-sm font-body">{error}</p>
      )}

      {insights && (
        <div className="space-y-3">
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li key={i} className="text-sm font-body flex gap-2">
                <span className="text-owed shrink-0">✦</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={fetchInsights}
            className="text-xs text-muted underline font-body"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

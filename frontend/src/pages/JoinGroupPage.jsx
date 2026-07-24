import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';

export default function JoinGroupPage() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('joining'); // 'joining' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function join() {
      try {
        const { data } = await api.post('/groups/join', {
          inviteCode: inviteCode.trim().toUpperCase()
        });
        if (cancelled) return;
        // Navigate to the group that was just joined
        navigate(`/groups/${data.groupId}`, { replace: true });
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err.response?.data?.error || 'Could not join this group.');
        setStatus('error');
      }
    }

    join();
    return () => { cancelled = true; };
  }, [inviteCode, navigate]);

  if (status === 'joining') {
    return (
      <div className="max-w-sm mx-auto mt-20 text-center">
        <p className="text-muted font-body animate-pulse text-lg">
          Joining group…
        </p>
        <p className="text-xs text-muted font-body mt-2 font-mono">
          {inviteCode?.toUpperCase()}
        </p>
      </div>
    );
  }


  return (
    <div className="max-w-sm mx-auto mt-20">
      <div className="card p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-bg border border-rule flex items-center justify-center mx-auto text-owe">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="font-display font-medium text-lg">Couldn't join</p>
          <p className="text-sm text-muted font-body mt-1">{errorMessage}</p>
        </div>
        <Link to="/groups" className="btn-primary text-sm inline-block">
          Go to your groups
        </Link>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { api, setTokens } from './api';

export function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { data, error: apiError } = await api.POST('/auth/token', {
      body: { username, password }
    });

    setLoading(false);
    if (apiError || !data) {
      setError('Credenziali non valide');
      return;
    }

    setTokens(data.access, data.refresh);
    onLogin();
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-color, #f5f5f5)' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
        <h2 style={{ margin: 0, textAlign: 'center' }}>Accesso Operatore</h2>
        {error && <div style={{ color: 'red', fontSize: '0.9rem' }}>{error}</div>}
        <input 
          type="text" 
          placeholder="Username" 
          value={username} 
          onChange={e => setUsername(e.target.value)} 
          required 
          style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
          style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '0.5rem', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? 'Accesso in corso...' : 'Accedi'}
        </button>
      </form>
    </div>
  );
}

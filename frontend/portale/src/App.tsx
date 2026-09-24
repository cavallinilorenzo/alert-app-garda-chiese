import React, { useState, useEffect } from 'react';
import { getAccessToken, clearTokens, api } from './api';
import { Login } from './Login';
import { Dashboard } from './Dashboard';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAccessToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated) {
        // Test auth by fetching /auth/me
        const { error } = await api.GET('/auth/me');
        if (error) {
          clearTokens();
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };
    checkAuth();

    const handleLogout = () => setIsAuthenticated(false);
    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, [isAuthenticated]);

  if (loading) return <div>Caricamento in corso...</div>;

  return isAuthenticated ? (
    <Dashboard onLogout={() => setIsAuthenticated(false)} />
  ) : (
    <Login onLogin={() => setIsAuthenticated(true)} />
  );
}

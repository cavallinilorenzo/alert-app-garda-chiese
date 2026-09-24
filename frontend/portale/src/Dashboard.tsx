import { useEffect, useState } from 'react';
import { api, clearTokens } from './api';
import { Map } from './Map';
import { SchedaSegnalazione } from './SchedaSegnalazione';

export function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [segnalazioni, setSegnalazioni] = useState<any[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const handleLogout = async () => {
    await api.POST('/auth/logout', { body: { refresh: localStorage.getItem('refresh_token') || '' } });
    clearTokens();
    onLogout();
  };

  const loadSegnalazioni = async () => {
    // Call GET /segnalazioni
    const { data } = await api.GET('/segnalazioni', { params: { query: { page } as any } });
    if (data && data.items) {
      setSegnalazioni(data.items);
      if (data.total !== undefined) setTotal(data.total);
    }
  };

  useEffect(() => {
    loadSegnalazioni();
  }, [page]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: theme === 'dark' ? '#121212' : '#f5f5f5', color: theme === 'dark' ? '#fff' : '#000' }}>
      {/* Sidebar (Menu laterale flottante) */}
      <aside style={{ width: '250px', background: theme === 'dark' ? '#1e1e1e' : '#fff', padding: '1rem', boxShadow: '2px 0 5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
        <h2>Menu</h2>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button style={{ textAlign: 'left', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>Coda di lavoro</button>
          <button style={{ textAlign: 'left', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>Rubrica</button>
        </nav>
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} style={{ marginBottom: '0.5rem', padding: '0.5rem', cursor: 'pointer' }}>
          Tema {theme === 'light' ? 'Scuro' : 'Chiaro'}
        </button>
        <button onClick={handleLogout} style={{ padding: '0.5rem', background: 'red', color: 'white', border: 'none', cursor: 'pointer' }}>
          Logout
        </button>
      </aside>
      
      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Filtri */}
        <div style={{ padding: '1rem', background: theme === 'dark' ? '#2a2a2a' : '#eaeaea', display: 'flex', gap: '1rem' }}>
          <span>Filtri:</span>
          <select><option>Stato</option></select>
          <select><option>Priorità</option></select>
        </div>

        <div style={{ flex: 1, display: 'flex' }}>
          {/* Mappa */}
          <div style={{ flex: 1 }}>
            <Map onMarkerClick={id => setSelectedId(id)} filters={{}} segnalazioni={segnalazioni} />
          </div>
          
          {/* Lista */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ccc' }}>Codice</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ccc' }}>Stato</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ccc' }}>Priorità</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ccc' }}>Assegnata a</th>
                </tr>
              </thead>
              <tbody>
                {segnalazioni.map(s => (
                  <tr key={s.id} onClick={() => setSelectedId(s.id)} style={{ cursor: 'pointer', background: selectedId === s.id ? (theme === 'dark' ? '#333' : '#ddd') : 'transparent' }}>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{s.codice_pratica || s.id}</td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{s.stato_corrente}</td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                      {/* Pallino colorato */}
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: s.priorita === 'critica' ? 'red' : 'blue', marginRight: 5 }}></span>
                      {s.priorita}
                    </td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                      {s.operatore_riferimento?.nome_completo || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ccc' }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Precedente</button>
              <span>Pagina {page} (Totale {total})</span>
              <button disabled={segnalazioni.length === 0} onClick={() => setPage(p => p + 1)}>Successiva</button>
            </div>
          </div>
        </div>
      </main>

      {/* Segnaposto Scheda */}
      {selectedId && (
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '500px', background: theme === 'dark' ? '#1e1e1e' : '#fff', boxShadow: '-2px 0 5px rgba(0,0,0,0.1)', display: 'flex' }}>
          <SchedaSegnalazione id={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, FormEvent } from 'react';
import { api } from './api';
import { components } from 'shared/api';

type Acquaiolo = components['schemas']['Acquaiolo'];

export function Rubrica() {
  const [acquaioli, setAcquaioli] = useState<Acquaiolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [telefono, setTelefono] = useState('');
  const [zonaId, setZonaId] = useState<number | ''>('');
  const [error, setError] = useState('');

  const loadAcquaioli = async () => {
    setLoading(true);
    const { data } = await api.GET('/acquaioli');
    if (data) setAcquaioli(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAcquaioli();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const body = {
      nome,
      telefono,
      zona_id: zonaId === '' ? null : Number(zonaId)
    };

    if (editingId) {
      const { error: apiError } = await api.PATCH('/acquaioli/{id}', {
        params: { path: { id: editingId } },
        body
      });
      if (apiError) {
        setError(apiError.message || 'Errore durante la modifica');
        return;
      }
    } else {
      const { error: apiError } = await api.POST('/acquaioli', {
        body
      });
      if (apiError) {
        setError(apiError.message || 'Errore durante la creazione');
        return;
      }
    }

    setEditingId(null);
    setNome('');
    setTelefono('');
    setZonaId('');
    loadAcquaioli();
  };

  const startEdit = (acq: Acquaiolo) => {
    setEditingId(acq.id);
    setNome(acq.nome);
    setTelefono(acq.telefono);
    setZonaId(acq.zona_id ?? '');
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNome('');
    setTelefono('');
    setZonaId('');
    setError('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem', overflowY: 'auto' }}>
      <h2>Rubrica Acquaioli</h2>
      
      <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block' }}>Nome</label>
          <input required value={nome} onChange={e => setNome(e.target.value)} style={{ padding: '0.5rem' }} />
        </div>
        <div>
          <label style={{ display: 'block' }}>Telefono</label>
          <input required value={telefono} onChange={e => setTelefono(e.target.value)} style={{ padding: '0.5rem' }} />
        </div>
        <div>
          <label style={{ display: 'block' }}>Zona ID</label>
          <input type="number" value={zonaId} onChange={e => setZonaId(e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: '0.5rem' }} />
        </div>
        <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '0.5rem' }}>
          <button type="submit" style={{ padding: '0.5rem 1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {editingId ? 'Salva Modifiche' : 'Crea'}
          </button>
          {editingId && <button type="button" onClick={cancelEdit} style={{ padding: '0.5rem 1rem' }}>Annulla</button>}
        </div>
        {error && <div style={{ color: 'red', width: '100%', marginTop: '0.5rem' }}>{error}</div>}
      </form>

      {loading ? (
        <div>Caricamento...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ padding: '0.5rem', borderBottom: '2px solid #ccc' }}>ID</th>
              <th style={{ padding: '0.5rem', borderBottom: '2px solid #ccc' }}>Nome</th>
              <th style={{ padding: '0.5rem', borderBottom: '2px solid #ccc' }}>Telefono</th>
              <th style={{ padding: '0.5rem', borderBottom: '2px solid #ccc' }}>Zona ID</th>
              <th style={{ padding: '0.5rem', borderBottom: '2px solid #ccc' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {acquaioli.map(a => (
              <tr key={a.id} style={{ background: editingId === a.id ? 'rgba(0,123,255,0.1)' : 'transparent' }}>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{a.id}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{a.nome}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{a.telefono}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{a.zona_id ?? '-'}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                  <button onClick={() => startEdit(a)}>Modifica</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

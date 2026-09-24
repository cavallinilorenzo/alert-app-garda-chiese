import { useEffect, useState } from 'react';
import { api } from './api';
import { components } from 'shared/api';

type Segnalazione = components['schemas']['SegnalazioneDettaglio'];
type Acquaiolo = components['schemas']['Acquaiolo'];

export function SchedaSegnalazione({ id, onClose }: { id: number, onClose: () => void }) {
  const [data, setData] = useState<Segnalazione | null>(null);
  const [acquaioli, setAcquaioli] = useState<Acquaiolo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    setLoading(true);
    const { data: detailData } = await api.GET('/segnalazioni/{id}', { params: { path: { id } } });
    if (detailData) setData(detailData);
    setLoading(false);
  };

  const fetchAcquaioli = async () => {
    const { data } = await api.GET('/acquaioli');
    if (data) setAcquaioli(data);
  };

  useEffect(() => {
    fetchDetail();
    fetchAcquaioli();
  }, [id]);

  const handleAction = async (azione: 'prendi_in_carico' | 'assegna' | 'avvia_intervento' | 'chiudi' | 'indietro' | 'riapri' | 'nota' | 'messaggio_segnalante', extra?: any) => {
    await api.POST('/segnalazioni/{id}/azioni', {
      params: { path: { id } },
      body: { azione, ...extra } as any
    });
    fetchDetail(); // reload
  };

  const handlePatch = async (body: any) => {
    await api.PATCH('/segnalazioni/{id}', {
      params: { path: { id } },
      body
    });
    fetchDetail();
  };

  if (loading || !data) return <div style={{ padding: '1rem' }}>Caricamento...</div>;

  return (
    <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <button onClick={onClose} style={{ alignSelf: 'flex-start', padding: '0.5rem' }}>Chiudi</button>
      
      {/* 1. Intestazione con assegnatario */}
      <section style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
        <h2>Segnalazione #{data.codice_pratica || id} - {data.stato_corrente}</h2>
        <div>Priorità: <strong>{data.priorita}</strong></div>
        <div>Assegnatario (Operatore): {data.operatore_riferimento ? data.operatore_riferimento.nome_completo : 'Nessuno'}</div>
      </section>

      {/* 2. Pericolo */}
      <section style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
        <h3>Pericolo</h3>
        <div>Pericolo persone: {data.pericolo_persone}</div>
        <div>Pericolo strada: {data.pericolo_strada}</div>
        <div>Pericolo edifici: {data.pericolo_edifici}</div>
      </section>

      {/* 3. Foto e mappa */}
      <section style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <h3>Foto</h3>
          {data.foto && data.foto.map((f: string) => (
            <img key={f} src={f} alt="Segnalazione" style={{ maxWidth: '100%', maxHeight: '200px' }} />
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <h3>Mappa (Anteprima)</h3>
          <p>Lat: {data.lat}, Lng: {data.lng}</p>
          {/* A small static map or placeholder would go here */}
          <div style={{ height: '150px', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>[Mappa]</div>
        </div>
      </section>

      {/* 4. Avanzamento e azioni */}
      <section style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h3>Azioni Rapide</h3>
        <button onClick={() => handleAction('prendi_in_carico')}>Prendi in carico</button>
        <button onClick={() => handleAction('avvia_intervento')}>Avvia intervento</button>
        <button onClick={() => handleAction('chiudi', { esito: 'risolto' })}>Chiudi (risolto)</button>
        <button onClick={() => {
          const newPriority = prompt('Nuova priorità:', data.priorita);
          const motivazione = prompt('Motivazione:');
          if (newPriority && motivazione) {
            handlePatch({ priorita: newPriority, override_motivazione: motivazione });
          }
        }}>Cambia priorità</button>
      </section>

      {/* 5. Cosa è successo | Contatti e infrastruttura */}
      <section style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1, border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <h3>Cosa è successo</h3>
          <p><strong>Categoria:</strong> {data.categoria}</p>
          <p><strong>Quantità acqua:</strong> {data.quantita_acqua}</p>
          <p><strong>Durata:</strong> {data.durata}</p>
          <p><strong>Descrizione:</strong> {data.descrizione}</p>
          {data.transcript_ai && <p><strong>Trascrizione Audio:</strong> {data.transcript_ai}</p>}
        </div>
        <div style={{ flex: 1, border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <h3>Contatti e infrastruttura</h3>
          <p><strong>Segnalante:</strong> {data.cellulare}</p>
          <p>
            <a href={`tel:${data.cellulare}`} style={{ display: 'inline-block', padding: '0.2rem 0.5rem', background: '#28a745', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>Chiama segnalante</a>
            <button onClick={() => navigator.clipboard.writeText(data.cellulare || '')} style={{ marginLeft: '0.5rem' }}>Copia</button>
          </p>

          <p><strong>Infrastruttura:</strong> {data.nome_completo_tracciato || '-'}</p>
          <p>Distanza: {data.distanza_m}m - Zona: {data.zona_id}</p>
          
          <p><strong>Acquaiolo competente:</strong></p>
          {data.acquaiolo_competente_id ? (() => {
            const acq = acquaioli.find(a => a.id === data.acquaiolo_competente_id);
            return acq ? (
              <div>
                {acq.nome} ({acq.telefono})
                <br/>
                <a href={`tel:${acq.telefono}`} style={{ display: 'inline-block', padding: '0.2rem 0.5rem', background: '#28a745', color: '#fff', textDecoration: 'none', borderRadius: '4px', marginTop: '0.5rem' }}>Chiama acquaiolo</a>
                <button onClick={() => navigator.clipboard.writeText(acq.telefono || '')} style={{ marginLeft: '0.5rem' }}>Copia</button>
              </div>
            ) : 'ID: ' + data.acquaiolo_competente_id;
          })() : 'Nessuno'}
        </div>
      </section>

      {/* 6. Registro */}
      <section style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
        <h3>Registro Eventi</h3>
        <ul>
          {data.registro?.map((evento: any) => (
            <li key={evento.id}>
              <strong>{new Date(evento.created_at).toLocaleString()}</strong> - {evento.tipo_evento} ({evento.stato})
              {evento.operatore && ` by ${evento.operatore.nome_completo}`}
              {evento.nota && <span> - Nota: {evento.nota}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

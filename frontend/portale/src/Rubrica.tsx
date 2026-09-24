// Rubrica acquaioli: i numeri che l'Operatore usa per chiamare l'Acquaiolo competente.
import { useState } from 'react'
import { Avatar, Copia, Icona, titoloNome } from './comuni'
import { usePortale } from './dati'

type Modifica = { id: number | null; nome: string; telefono: string; zona_id: number | null }

export function Rubrica() {
  const { rubrica, zone, zona, salvaAcquaiolo } = usePortale()
  const [modifica, setModifica] = useState<Modifica | null>(null)
  const [cerca, setCerca] = useState('')
  const lista = rubrica.filter((r) => `${r.nome} ${zona(r.zona_id) ?? ''}`.toLowerCase().includes(cerca.toLowerCase()))

  const salva = async () => {
    if (!modifica) return
    const { id, ...corpo } = modifica
    if (await salvaAcquaiolo(id, corpo)) setModifica(null)
  }

  const inModifica = (m: Modifica) => (
    <tr key={m.id ?? 'nuovo'} className="in-modifica">
      <td>
        <input value={m.nome} placeholder="Nome" autoFocus onChange={(e) => setModifica({ ...m, nome: e.target.value })} />
      </td>
      <td>
        <select value={m.zona_id ?? ''} onChange={(e) => setModifica({ ...m, zona_id: e.target.value ? +e.target.value : null })}>
          <option value="">Nessuna zona</option>
          {zone.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nome} · {z.acquaiolo ? titoloNome(z.acquaiolo) : 'non servita'} (zona {z.id})
            </option>
          ))}
        </select>
      </td>
      <td>
        <input value={m.telefono} placeholder="+39 …" onChange={(e) => setModifica({ ...m, telefono: e.target.value })} />
      </td>
      <td className="azioni-riga">
        <button className="btn-icona" title="Salva" disabled={!m.nome.trim() || !m.telefono.trim()} onClick={salva}>
          <Icona nome="check" />
        </button>
        <button className="btn-icona" title="Annulla" onClick={() => setModifica(null)}>
          <Icona nome="close" />
        </button>
      </td>
    </tr>
  )

  return (
    <div className="rubrica">
      <div className="riga-form">
        <label className="cerca">
          <Icona nome="search" />
          <input placeholder="Cerca acquaiolo o zona" value={cerca} onChange={(e) => setCerca(e.target.value)} />
        </label>
        <button className="btn btn-primario" onClick={() => setModifica({ id: null, nome: '', telefono: '+39 ', zona_id: null })}>
          <Icona nome="person_add" /> Nuovo acquaiolo
        </button>
      </div>
      <table className="tabella">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Zona</th>
            <th>Telefono</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {modifica?.id === null && inModifica(modifica)}
          {lista.map((r) =>
            modifica?.id === r.id ? (
              inModifica(modifica)
            ) : (
              <tr key={r.id}>
                <td>
                  <span className="persona">
                    <Avatar nome={r.nome} piccolo /> <strong>{titoloNome(r.nome)}</strong>
                  </span>
                </td>
                <td>{zona(r.zona_id) ?? <span className="muto">—</span>}</td>
                <td className="telefono">
                  <a href={`tel:${r.telefono.replace(/\s/g, '')}`}>
                    <Icona nome="call" /> {r.telefono}
                  </a>{' '}
                  <Copia testo={r.telefono} />
                </td>
                <td className="azioni-riga">
                  <button className="btn-icona" title="Modifica" onClick={() => setModifica({ id: r.id, nome: r.nome, telefono: r.telefono, zona_id: r.zona_id })}>
                    <Icona nome="edit" />
                  </button>
                </td>
              </tr>
            ),
          )}
          {lista.length === 0 && !modifica && (
            <tr>
              <td colSpan={4} className="muto">
                Nessun acquaiolo in rubrica.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

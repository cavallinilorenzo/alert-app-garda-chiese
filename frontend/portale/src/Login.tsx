import { useState, type FormEvent } from 'react'
import { api, setTokens } from './api'
import { Icona } from './comuni'

export function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: apiError } = await api.POST('/auth/token', {
      body: { username, password },
    })

    setLoading(false)
    if (apiError || !data) {
      setError('Credenziali non valide')
      return
    }

    setTokens(data.access, data.refresh)
    onLogin()
  }

  return (
    <div className="login">
      <form onSubmit={handleSubmit} className="login-card">
        <div className="login-marchio">
          <span className="login-logo">
            <Icona nome="water_drop" piena />
          </span>
          <div>
            <strong>Portale operatore</strong>
            <span className="muto">Consorzio di bonifica Garda Chiese</span>
          </div>
        </div>
        <label>
          <span className="etichetta">Nome utente</span>
          <input type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </label>
        <label>
          <span className="etichetta">Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && (
          <div className="login-errore">
            <Icona nome="error" /> {error}
          </div>
        )}
        <button type="submit" className="btn btn-primario" disabled={loading}>
          {loading ? 'Accesso in corso…' : 'Accedi'}
        </button>
      </form>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { api, clearTokens, getAccessToken, getRefreshToken } from './api'
import { PortaleProvider } from './dati'
import type { Operatore } from './dominio'
import { Login } from './Login'
import { Portale, useTema } from './Portale'

export function App() {
  useTema() // anche il login segue il tema scelto
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAccessToken())
  const [operatore, setOperatore] = useState<Operatore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated) {
        const { data, error } = await api.GET('/auth/me')
        if (error || !data) {
          clearTokens()
          setIsAuthenticated(false)
        } else {
          setOperatore(data)
        }
      }
      setLoading(false)
    }
    checkAuth()

    const handleLogout = () => setIsAuthenticated(false)
    window.addEventListener('auth-logout', handleLogout)
    return () => window.removeEventListener('auth-logout', handleLogout)
  }, [isAuthenticated])

  const esci = async () => {
    await api.POST('/auth/logout', { body: { refresh: getRefreshToken() ?? '' } })
    clearTokens()
    setOperatore(null)
    setIsAuthenticated(false)
  }

  if (loading) return <div className="caricamento">Caricamento in corso…</div>

  return isAuthenticated ? (
    <PortaleProvider>
      <Portale operatore={operatore} onEsci={esci} />
    </PortaleProvider>
  ) : (
    <Login onLogin={() => setIsAuthenticated(true)} />
  )
}

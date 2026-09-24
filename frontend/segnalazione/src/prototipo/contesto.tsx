// PROTOTIPO, da buttare (ticket #102). Contesto condiviso tra switcher, varianti e schermate.

import { createContext, useContext } from 'react'
import logo from 'shared/marchio/logo.png'
import logoScuro from 'shared/marchio/logo-scuro.png'
import simbolo from 'shared/marchio/simbolo.png'
import type { Variante } from './varianti'

export type Tema = 'chiaro' | 'scuro'
export type Contesto = {
  variante: Variante
  tema: Tema
  pericolo: boolean
  vai: (s: string) => void
  indietro: () => void
}

export const Ctx = createContext<Contesto | null>(null)
export const useProto = () => useContext(Ctx)!

export function Logo({ piccolo }: { piccolo?: boolean }) {
  const { tema } = useProto()
  return (
    <img
      className={`p-logo ${piccolo ? 'piccolo' : ''}`}
      src={tema === 'scuro' ? logoScuro : logo}
      alt="Consorzio di bonifica Garda Chiese"
    />
  )
}

export const Simbolo = () => <img className="p-simbolo" src={simbolo} alt="Consorzio di bonifica Garda Chiese" />

import logo from 'shared/marchio/logo.png'
import simbolo from 'shared/marchio/simbolo.png'

/** Numero verde emergenze del Consorzio, da chiamare quando c'è pericolo per le persone. */
export const NUMERO_VERDE = '800 608 309'
export const TEL_NUMERO_VERDE = 'tel:800608309'
/** Numero unico di emergenza: solo fuori dal comprensorio, dove il Consorzio non interviene. */
export const NUMERO_UNICO_EMERGENZA = '112'

/** Icona Material Symbols; `piena` usa la variante riempita. */
export function Icona({ n, piena, className = '' }: { n: string; piena?: boolean; className?: string }) {
  return (
    <span className={`msym ${piena ? 'piena' : ''} ${className}`} aria-hidden="true">
      {n}
    </span>
  )
}

/** Simbolo del Consorzio, per le barre dove accanto c'è già il nome. */
export function Simbolo() {
  return <img className="logo" src={simbolo} alt="" />
}

/** Logo completo del Consorzio, con il nome. */
export function Logo() {
  return <img className="logo-esteso" src={logo} alt="Consorzio di bonifica Garda Chiese" />
}

export function Spinner({ chiaro, piccolo }: { chiaro?: boolean; piccolo?: boolean }) {
  return <span className={`spinner ${chiaro ? 'chiaro' : ''} ${piccolo ? 'piccolo' : ''}`} />
}

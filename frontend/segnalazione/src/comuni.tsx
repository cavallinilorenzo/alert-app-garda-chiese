import logo from 'shared/marchio/logo.png'
import logoScuro from 'shared/marchio/logo-scuro.png'

/** Numero verde emergenze del Consorzio, da chiamare quando c'è pericolo per persone, strade o case. */
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

/** Logo completo del Consorzio, con il nome; in tema scuro quello con le scritte bianche. */
export function Logo({ piccolo }: { piccolo?: boolean }) {
  return (
    <picture>
      <source srcSet={logoScuro} media="(prefers-color-scheme: dark)" />
      <img className={`logo ${piccolo ? 'piccolo' : ''}`} src={logo} alt="Consorzio di bonifica Garda Chiese" />
    </picture>
  )
}

/** La finestra del numero verde, al primo segnale di pericolo della procedura. */
export function FinestraNumeroVerde({ onContinua }: { onContinua: () => void }) {
  return (
    <div className="velo">
      <div className="dialogo" role="alertdialog" aria-modal="true" aria-labelledby="emergenza-titolo">
        <span className="tondo rosso"><Icona n="warning" piena /></span>
        <h2 id="emergenza-titolo">Chiama subito</h2>
        <p>Numero verde emergenze del Consorzio, gratuito.</p>
        <a className="btn rosso" href={TEL_NUMERO_VERDE}>
          <Icona n="call" piena /> {NUMERO_VERDE}
        </a>
        <button className="btn testo" onClick={onContinua}>
          Continuo la segnalazione
        </button>
      </div>
    </div>
  )
}

export function Spinner({ chiaro, piccolo }: { chiaro?: boolean; piccolo?: boolean }) {
  return <span className={`spinner ${chiaro ? 'chiaro' : ''} ${piccolo ? 'piccolo' : ''}`} />
}

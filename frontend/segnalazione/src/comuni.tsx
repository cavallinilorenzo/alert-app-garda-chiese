export const NUMERO_EMERGENZA = '112'

/** Icona Material Symbols; `piena` usa la variante riempita. */
export function Icona({ n, piena, className = '' }: { n: string; piena?: boolean; className?: string }) {
  return (
    <span className={`msym ${piena ? 'piena' : ''} ${className}`} aria-hidden="true">
      {n}
    </span>
  )
}

export function Spinner({ chiaro, piccolo }: { chiaro?: boolean; piccolo?: boolean }) {
  return <span className={`spinner ${chiaro ? 'chiaro' : ''} ${piccolo ? 'piccolo' : ''}`} />
}

import { useEffect, useRef, useState } from 'react'
import { useBozza } from '../bozza'
import { Icona, Spinner } from '../comuni'
import { Schermata, useProcedura } from '../procedura'

// Lato lungo massimo della foto inviata. Tiene l'invio sotto il limite di 10 MB di nginx
// anche su rete mobile, e converte in JPEG i formati che il backend potrebbe non leggere.
const LATO_MAX = 1600

// Ridisegna la foto su un canvas. L'<img> applica già l'orientamento EXIF, quindi la foto
// resta dritta. Se qualcosa va storto si tiene l'originale.
async function riduci(file: File): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const scala = Math.min(1, LATO_MAX / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scala)
    canvas.height = Math.round(img.naturalHeight * scala)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85))
    return blob ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function Foto() {
  const { bozza, aggiorna } = useBozza()
  const { vai } = useProcedura()
  const input = useRef<HTMLInputElement>(null)
  const [preparo, setPreparo] = useState(false)
  const [anteprima, setAnteprima] = useState<string | null>(null)

  useEffect(() => {
    if (!bozza.foto) return setAnteprima(null)
    const url = URL.createObjectURL(bozza.foto)
    setAnteprima(url)
    return () => URL.revokeObjectURL(url)
  }, [bozza.foto])

  async function scelta(file: File | undefined) {
    if (!file) return
    setPreparo(true)
    aggiorna({ foto: await riduci(file) })
    setPreparo(false)
  }

  const apriFotocamera = () => input.current?.click()

  return (
    <Schermata
      titolo="Scatta una foto del problema"
      sotto="Inquadra il punto da vicino: aiuta il Consorzio a capire cosa serve."
      azione={
        <button className="btn" disabled={!bozza.foto || preparo} onClick={() => vai('descrizione')}>
          Continua
        </button>
      }
    >
      {preparo ? (
        <div className="centro">
          <Spinner />
          <p>Preparo la foto…</p>
        </div>
      ) : anteprima ? (
        <div className="foto">
          <img src={anteprima} alt="Foto del problema" />
          <button className="btn secondario" onClick={apriFotocamera}>
            <Icona n="replay" /> Rifai la foto
          </button>
        </div>
      ) : (
        <button className="scatta" onClick={apriFotocamera}>
          <Icona n="photo_camera" />
          <strong>Apri la fotocamera</strong>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          scelta(e.target.files?.[0])
          // Così si può scegliere di nuovo lo stesso file dopo "Rifai la foto".
          e.target.value = ''
        }}
      />
    </Schermata>
  )
}

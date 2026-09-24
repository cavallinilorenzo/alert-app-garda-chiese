import { useEffect, useRef, useState } from 'react'
import { useBozza } from '../bozza'
import { Icona, Spinner } from '../comuni'
import { analizzaFoto, conCampiFoto } from '../foto'
import { Schermata, useProcedura } from '../procedura'
import { CATEGORIE } from '../tassonomia'

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
  // Il messaggio sotto lo spinner mentre la foto si riduce e poi si controlla.
  const [attesa, setAttesa] = useState<string | null>(null)
  // Perché l'ultima foto è stata scartata.
  const [scartata, setScartata] = useState<string | null>(null)
  const [anteprima, setAnteprima] = useState<string | null>(null)

  useEffect(() => {
    if (!bozza.foto) return setAnteprima(null)
    const url = URL.createObjectURL(bozza.foto)
    setAnteprima(url)
    return () => URL.revokeObjectURL(url)
  }, [bozza.foto])

  async function scelta(file: File | undefined) {
    if (!file) return
    setScartata(null)
    setAttesa('Preparo la foto…')
    const foto = await riduci(file)
    setAttesa('Controllo la foto…')
    const analisi = await analizzaFoto(foto)
    setAttesa(null)
    // Una foto che non c'entra non si tiene: si chiede subito di rifarla.
    if (analisi && !analisi.pertinente) {
      aggiorna({ foto: null, campi: conCampiFoto(bozza.campi, bozza.campiFoto, {}), campiFoto: {} })
      return setScartata(analisi.motivo ?? 'La foto non sembra mostrare il problema.')
    }
    const campiFoto = analisi?.campi ?? {}
    aggiorna({ foto, campi: conCampiFoto(bozza.campi, bozza.campiFoto, campiFoto), campiFoto })
  }

  const apriFotocamera = () => input.current?.click()
  const vista = CATEGORIE.find((c) => c.valore === bozza.campiFoto.categoria)

  return (
    <Schermata
      titolo={anteprima && !attesa ? 'Va bene questa?' : 'Scatta una foto'}
      azione={
        <>
          <button className="btn" disabled={!bozza.foto || !!attesa} onClick={() => vai('descrizione')}>
            Continua
          </button>
          {anteprima && !attesa && (
            <button className="btn testo" onClick={apriFotocamera}>
              <Icona n="replay" /> Rifai la foto
            </button>
          )}
        </>
      }
    >
      {scartata && !attesa && (
        <div className="banner giallo" role="alert">
          <Icona n="image_not_supported" />
          <span>{scartata}</span>
        </div>
      )}
      {attesa ? (
        <div className="centro">
          <Spinner />
          <p>{attesa}</p>
        </div>
      ) : anteprima ? (
        <div className="foto">
          <img src={anteprima} alt="Foto del problema" />
          {vista && (
            <p className="chip">
              <Icona n="auto_awesome" /> Sembra: {vista.etichetta.toLowerCase()}
            </p>
          )}
        </div>
      ) : (
        <button className="scatta" onClick={apriFotocamera}>
          <Icona n="photo_camera" />
          <strong>{scartata ? 'Scatta un’altra foto' : 'Apri la fotocamera'}</strong>
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

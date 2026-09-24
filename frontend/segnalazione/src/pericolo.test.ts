import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { contieneParoleDiPericolo, pericoloDichiarato, segnaleDiPericolo } from './pericolo.ts'

// I casi della risoluzione del ticket #103.

describe('contieneParoleDiPericolo', () => {
  test('le parole sulle persone bastano da sole', () => {
    for (const d of [
      'C’è un uomo ferito vicino al canale',
      'Ci sono dei bambini che giocano sull’argine',
      'Un’anziana non riesce a uscire',
      'Una persona è intrappolata in auto',
      'Il ciclista è stato travolto',
      'La corrente ha trascinato via un cane',
      'Qualcuno sta annegando',
      'Un signore è svenuto',
      'Serve soccorso subito',
      'Aiuto!',
    ])
      assert.ok(contieneParoleDiPericolo(d), d)
  })

  test('crolli, voragini e frane bastano da soli', () => {
    for (const d of ['È crollato il muro', 'Si è aperta una voragine', 'C’è una frana sul sentiero', 'Due frane lungo la riva'])
      assert.ok(contieneParoleDiPericolo(d), d)
  })

  test('luogo e acqua nella stessa frase', () => {
    for (const d of [
      'La strada è allagata',
      'Il sottopasso è sommerso',
      'La macchina è finita in acqua',
      'La cantina è sott’acqua',
      'Il garage è sottacqua',
      'Casa nell’acqua fino alle finestre',
      'Via Roma allagata davanti alla scuola',
      'Allagamento sulle strade del paese',
    ])
      assert.ok(contieneParoleDiPericolo(d), d)
  })

  test('luogo e acqua in frasi diverse non bastano', () => {
    assert.equal(contieneParoleDiPericolo('Il campo è allagato. La strada è libera.'), false)
  })

  test('maiuscole e accenti non contano', () => {
    assert.ok(contieneParoleDiPericolo('UN FERITO'))
    assert.ok(contieneParoleDiPericolo('È CROLLATO TUTTO'))
    assert.ok(contieneParoleDiPericolo('SOTT’ACQUA LA CANTINA'))
  })

  test('le negazioni non si gestiscono: meglio un falso allarme', () => {
    assert.ok(contieneParoleDiPericolo('Nessun ferito'))
  })

  test('parole generiche o parziali non fanno scattare nulla', () => {
    for (const d of [
      'Esce acqua dal terreno vicino alla strada',
      'Il canale è bloccato da rami',
      'Una persona mi ha detto che succede spesso',
      'Il campo è allagato da ieri',
      'L’argine è franato in un punto',
      'In autunno succede sempre',
      'Acqua sporca con cattivo odore',
      '',
    ])
      assert.equal(contieneParoleDiPericolo(d), false, d)
  })
})

describe('segnaleDiPericolo', () => {
  test('uno qualunque dei tre pericoli a "sì"', () => {
    assert.ok(pericoloDichiarato({ pericolo_persone: 'si' }))
    assert.ok(pericoloDichiarato({ pericolo_strada: 'si' }))
    assert.ok(pericoloDichiarato({ pericolo_edifici: 'si' }))
    assert.equal(pericoloDichiarato({ pericolo_persone: 'no', pericolo_strada: 'non_so' }), false)
  })

  test('pericoli a "sì" o parole chiave nella descrizione', () => {
    assert.ok(segnaleDiPericolo({ descrizione: 'Un bambino è caduto nel canale', pericolo_persone: 'no' }))
    assert.ok(segnaleDiPericolo({ descrizione: 'Esce acqua', pericolo_strada: 'si' }))
    assert.equal(segnaleDiPericolo({ descrizione: 'Esce acqua dal terreno' }), false)
    assert.equal(segnaleDiPericolo({}), false)
  })
})

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { conQuantitaCoerente, domandeDa } from './tassonomia.ts'

// La quantità d'acqua si chiede solo se l'acqua esce (ticket #100).

describe('domandeDa', () => {
  const chiedeQuantita = (categoria?: Parameters<typeof domandeDa>[0]['categoria']) =>
    domandeDa({ categoria }).some((d) => d.campo === 'quantita_acqua')

  test('si chiede per le quattro categorie in cui l’acqua esce', () => {
    for (const c of ['acqua_che_affiora', 'perdita_dal_canale', 'canale_che_tracima', 'argine_danneggiato'] as const)
      assert.equal(chiedeQuantita(c), true, c)
  })

  test('non si chiede per le altre, né senza categoria', () => {
    for (const c of ['ostruzione', 'canale_asciutto', 'paratoia_danneggiata', 'acqua_sporca', 'altro'] as const)
      assert.equal(chiedeQuantita(c), false, c)
    assert.equal(chiedeQuantita(), false)
  })
})

describe('conQuantitaCoerente', () => {
  test('mette non_applicabile quando la domanda non si fa, anche sopra una risposta', () => {
    assert.deepEqual(conQuantitaCoerente({ categoria: 'ostruzione' }), {
      categoria: 'ostruzione',
      quantita_acqua: 'non_applicabile',
    })
    assert.equal(
      conQuantitaCoerente({ categoria: 'canale_asciutto', quantita_acqua: 'getto' }).quantita_acqua,
      'non_applicabile',
    )
  })

  test('toglie non_applicabile quando la categoria cambia e la domanda si fa', () => {
    assert.deepEqual(conQuantitaCoerente({ categoria: 'perdita_dal_canale', quantita_acqua: 'non_applicabile' }), {
      categoria: 'perdita_dal_canale',
    })
  })

  test('lascia la risposta se la domanda si fa, e tutto se manca la categoria', () => {
    const campi = { categoria: 'canale_che_tracima', quantita_acqua: 'getto' } as const
    assert.deepEqual(conQuantitaCoerente(campi), campi)
    assert.deepEqual(conQuantitaCoerente({ durata: 'da_settimane' }), { durata: 'da_settimane' })
  })
})

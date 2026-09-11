// Toets op de aanmaakroutes van /api/ats: komt er bij Airtable aan wat wij denken?
//
// Deze toets bestaat om een concrete storing: "nieuwe opdrachtgever" gaf
// "Er ging iets mis aan de serverkant." Drie aanroepers gaven `createRecords`
// een al verpakt `{ fields: {...} }`, terwijl die functie zelf verpakt. Airtable
// kreeg daardoor een record met een veld dat "fields" heet, kende dat niet, en
// antwoordde 422. Onderweg werd dat een 502 en in het scherm de algemene
// melding. Geen enkele laag noemde de oorzaak.
//
// Daarom kijkt deze toets naar het enige dat dit had gevangen: de body die het
// eindpunt daadwerkelijk naar Airtable stuurt. Geen netwerk, geen base; fetch
// staat ervoor.

import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.AIRTABLE_BASE_ID = 'appToets'
process.env.AIRTABLE_API_KEY = 'keyToets'
process.env.ATS_APP_PASSWORD = 'geheim'

const { default: handler } = await import('../../netlify/functions/ats.mjs')
const { createRecords } = await import('../../netlify/lib/airtable.mjs')

const KOP = { 'x-ats-key': 'geheim', 'content-type': 'application/json' }

/**
 * Zet een nep-Airtable neer en geeft terug wat eruit vertrokken is.
 *
 * GET levert een lege lijst, zodat de dubbelcheck op naam niets vindt. Een
 * losse record-GET levert een opdrachtgever, want maakVacature haalt die op.
 */
function metNepAirtable() {
  const verzonden = []
  globalThis.fetch = async (url, init = {}) => {
    const adres = String(url)
    verzonden.push({
      method: init.method,
      url: adres,
      body: init.body ? JSON.parse(init.body) : null,
    })
    if (init.method === 'POST') {
      return new Response(JSON.stringify({ records: [{ id: 'recNieuw', fields: {} }] }), {
        status: 200,
      })
    }
    if (/\/rec[A-Za-z0-9]+/.test(adres)) {
      return new Response(JSON.stringify({ id: 'recKlant', fields: { Naam: 'Klant' } }), {
        status: 200,
      })
    }
    return new Response(JSON.stringify({ records: [] }), { status: 200 })
  }
  return verzonden
}

const post = (pad, lijf) =>
  handler(
    new Request(`https://ats.test/api/ats/${pad}`, {
      method: 'POST',
      headers: KOP,
      body: JSON.stringify(lijf),
    }),
  )

/** De velden zoals Airtable ze te zien krijgt bij de eerste POST. */
function veldenBijAirtable(verzonden) {
  const aanmaak = verzonden.find((v) => v.method === 'POST')
  assert.ok(aanmaak, 'er is niets naar Airtable gepost')
  assert.equal(aanmaak.body.records.length, 1)
  return aanmaak.body.records[0].fields
}

test('een nieuwe opdrachtgever komt met zijn eigen velden aan, niet genest', async () => {
  const verzonden = metNepAirtable()
  const res = await post('opdrachtgever', { Naam: 'Testklant', Status: 'Prospect' })

  assert.equal(res.status, 201)
  const velden = veldenBijAirtable(verzonden)
  assert.deepEqual(velden, { Naam: 'Testklant', Status: 'Prospect' })
  // De kern: geen veld dat "fields" heet. Daar viel Airtable eerder over.
  assert.ok(!('fields' in velden))
})

test('een nieuwe vacature hangt aan zijn opdrachtgever, met platte velden', async () => {
  const verzonden = metNepAirtable()
  const res = await post('vacature', {
    opdrachtgeverId: 'recKlant',
    Titel: 'SNA Inspecteur',
    Status: 'Intake',
  })

  assert.equal(res.status, 201)
  const velden = veldenBijAirtable(verzonden)
  assert.equal(velden.Titel, 'SNA Inspecteur')
  assert.deepEqual(velden.Opdrachtgever, ['recKlant'])
  assert.ok(!('fields' in velden))
})

test('een nieuwe contactpersoon hangt aan zijn opdrachtgever, met platte velden', async () => {
  const verzonden = metNepAirtable()
  const res = await post('contactpersoon', { opdrachtgeverId: 'recKlant', Naam: 'Jan Jansen' })

  assert.equal(res.status, 201)
  const velden = veldenBijAirtable(verzonden)
  assert.equal(velden.Naam, 'Jan Jansen')
  assert.deepEqual(velden.Opdrachtgever, ['recKlant'])
  assert.ok(!('fields' in velden))
})

test('een opdrachtgever zonder naam wordt geweigerd voor er iets de deur uit gaat', async () => {
  const verzonden = metNepAirtable()
  const res = await post('opdrachtgever', { Status: 'Prospect' })

  assert.equal(res.status, 400)
  assert.equal(await res.json().then((b) => b.error), 'Naam is verplicht.')
  assert.equal(verzonden.filter((v) => v.method === 'POST').length, 0)
})

test('createRecords weigert een al verpakt record in plaats van het door te sturen', async () => {
  metNepAirtable()
  await assert.rejects(
    () => createRecords('Opdrachtgevers', [{ fields: { Naam: 'Fout' } }]),
    /al verpakt record/,
  )
})

test('een record met een gewoon veld naast fields gaat wel door', async () => {
  // De grendel mag alleen op de precieze vergissing staan, niet op alles wat
  // toevallig een sleutel "fields" heeft.
  const verzonden = metNepAirtable()
  await createRecords('Opdrachtgevers', [{ Naam: 'Echt', fields: 'tekst' }])
  assert.deepEqual(veldenBijAirtable(verzonden), { Naam: 'Echt', fields: 'tekst' })
})

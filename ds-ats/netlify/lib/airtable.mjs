// Dunne Airtable-client voor de Netlify Functions.
// De API-key leeft uitsluitend hier, server-side. De frontend praat alleen
// met /api/* en ziet de key nooit.

export const TABLES = {
  opdrachtgevers: 'Opdrachtgevers',
  contactpersonen: 'Contactpersonen',
  vacatures: 'Vacatures',
  kandidaten: 'Kandidaten',
  aanmeldingen: 'Aanmeldingen',
  activiteiten: 'Activiteiten',
  stagelog: 'Stagelog',
  scorecards: 'Scorecards',
  beoordelingen: 'Beoordelingen',
}

const API = 'https://api.airtable.com/v0'

function env(name) {
  const value = process.env[name]
  if (!value) throw new HttpError(500, `Omgevingsvariabele ${name} ontbreekt op deze Netlify-site.`)
  return value
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function request(method, path, { query, body } = {}) {
  const url = new URL(`${API}/${env('AIRTABLE_BASE_ID')}/${path}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, v))
    else if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${env('AIRTABLE_API_KEY')}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new HttpError(res.status === 404 ? 404 : 502, `Airtable ${method} ${path}: ${res.status} ${text}`)
  }
  return res.status === 204 ? null : res.json()
}

/** Haalt alle records van een tabel op, over alle pagina's heen. */
export async function listAll(table, { filterByFormula, fields, sort } = {}) {
  const records = []
  let offset

  do {
    const query = { pageSize: 100 }
    if (offset) query.offset = offset
    if (filterByFormula) query.filterByFormula = filterByFormula
    if (fields) query['fields[]'] = fields
    if (sort) {
      sort.forEach((s, i) => {
        query[`sort[${i}][field]`] = s.field
        query[`sort[${i}][direction]`] = s.direction ?? 'asc'
      })
    }
    const page = await request('GET', encodeURIComponent(table), { query })
    records.push(...page.records)
    offset = page.offset
  } while (offset)

  return records
}

export async function getRecord(table, id) {
  return request('GET', `${encodeURIComponent(table)}/${id}`)
}

export async function createRecords(table, records) {
  const created = []
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10).map((fields) => ({ fields }))
    const res = await request('POST', encodeURIComponent(table), {
      body: { records: batch, typecast: true },
    })
    created.push(...res.records)
  }
  return created
}

export async function updateRecord(table, id, fields) {
  return request('PATCH', `${encodeURIComponent(table)}/${id}`, { body: { fields, typecast: true } })
}

export async function deleteRecords(table, ids) {
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10)
    await request('DELETE', encodeURIComponent(table), { query: { 'records[]': batch } })
  }
}

export function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

export function fail(error) {
  const status = error instanceof HttpError ? error.status : 500
  // Airtable-details horen niet in een clientrespons; wel in de functielogs.
  if (status >= 500) console.error(error)
  return json(status, { error: status >= 500 ? 'Er ging iets mis aan de serverkant.' : error.message })
}

/** Vergelijkt twee strings zonder vroegtijdig af te breken op de eerste ongelijke byte. */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const encoder = new TextEncoder()
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  let diff = left.length ^ right.length
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0)
  }
  return diff === 0
}

export function requireAppKey(req) {
  const expected = process.env.ATS_APP_PASSWORD
  if (!expected) throw new HttpError(500, 'ATS_APP_PASSWORD is niet ingesteld op deze Netlify-site.')
  const given = req.headers.get('x-ats-key') ?? ''
  if (!safeEqual(given, expected)) throw new HttpError(401, 'Onjuist wachtwoord.')
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function plusDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

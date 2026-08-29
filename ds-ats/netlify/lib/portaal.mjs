// Wachtwoorden, sessies en toegangscontrole voor het klantportaal.
//
// Apart van airtable.mjs omdat dit de enige plek is waar geheimen worden
// afgeleid en gecontroleerd. Wie hier iets wijzigt, wijzigt wie er binnenkomt.
//
// Twee dingen die deze module bewust NIET doet:
//
// 1. Het wachtwoord nergens bewaren. Airtable is geen kluis — iedereen met
//    toegang tot de base leest die tabel. Er gaat een scrypt-hash in en verder
//    niets, en die is niet terug te rekenen. Een vergeten wachtwoord is dus
//    niet op te zoeken, ook niet door Dominique. Alleen opnieuw genereren.
//
// 2. Verschil maken tussen "dit e-mailadres bestaat niet" en "het wachtwoord
//    klopt niet". Beide leveren dezelfde melding en ongeveer dezelfde
//    rekentijd op, want anders is het inlogscherm een lijst van klanten.

import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { HttpError, safeEqual } from './airtable.mjs'

const scryptAsync = promisify(scrypt)

/** 64 bytes uit scrypt met de standaardparameters (N=16384, r=8, p=1). */
const HASH_BYTES = 64

export async function hashWachtwoord(wachtwoord, salt) {
  const afgeleid = await scryptAsync(String(wachtwoord).normalize('NFKC'), salt, HASH_BYTES)
  return afgeleid.toString('hex')
}

export function nieuweSalt() {
  return randomBytes(16).toString('hex')
}

/**
 * Vergelijkt zonder tijdlek. Een ontbrekende of misvormde hash levert `false`
 * op in plaats van een uitzondering: een half ingevuld record is geen reden om
 * de aanroeper te laten crashen, wél om niemand binnen te laten.
 */
export async function klopt(wachtwoord, salt, hash) {
  if (typeof salt !== 'string' || typeof hash !== 'string' || hash.length !== HASH_BYTES * 2) {
    return false
  }
  const berekend = await hashWachtwoord(wachtwoord, salt)
  return timingSafeEqual(Buffer.from(berekend, 'hex'), Buffer.from(hash, 'hex'))
}

/**
 * Een leesbaar wachtwoord dat door de telefoon voor te lezen is.
 *
 * Geen l/I/1 en geen O/0 door elkaar, want dit gaat via WhatsApp of over de
 * lijn naar iemand die het overtypt. Vier groepen van vier uit een alfabet van
 * 31 tekens is ruim 79 bits — meer dan genoeg, en ook zonder de verwarrende
 * tekens niet te raden.
 */
const ALFABET = 'abcdefghjkmnpqrstuvwxyz23456789'

export function genereerWachtwoord() {
  const bytes = randomBytes(16)
  const tekens = [...bytes].map((b) => ALFABET[b % ALFABET.length])
  return [0, 4, 8, 12].map((i) => tekens.slice(i, i + 4).join('')).join('-')
}

// ---------------------------------------------------------------------------
// Sessie
// ---------------------------------------------------------------------------

export const COOKIE = 'ds-portaal'

/**
 * Het pad is geen detail. Met `Path=/api/portal` stuurt de browser dit cookie
 * fysiek nooit mee naar `/api/ats`, ook niet als iemand daar een verzoek naartoe
 * stuurt. De scheiding tussen klant en kantoor zit daarmee niet alleen in een
 * controle die je kunt vergeten, maar in wat er überhaupt over de lijn gaat.
 *
 * HttpOnly omdat dit portaal voor buitenstaanders is: scriptcode op de pagina
 * hoort de sessie niet te kunnen oppakken.
 */
const COOKIE_PAD = '/api/portal'

/** Acht uur: een werkdag. Daarna opnieuw inloggen. */
export const SESSIE_SECONDEN = 8 * 60 * 60

function geheim() {
  const waarde = process.env.PORTAL_SESSION_SECRET
  if (!waarde || waarde.length < 32) {
    throw new HttpError(500, 'PORTAL_SESSION_SECRET ontbreekt of is te kort op deze Netlify-site.')
  }
  return waarde
}

function onderteken(nuttigeLading) {
  return createHmac('sha256', geheim()).update(nuttigeLading).digest('hex')
}

export function maakSessie(gebruikerId, nuSeconden = Math.floor(Date.now() / 1000)) {
  const verloopt = nuSeconden + SESSIE_SECONDEN
  const lading = `${gebruikerId}.${verloopt}`
  return `${lading}.${onderteken(lading)}`
}

/**
 * Geeft het gebruikers-id terug, of null. Nooit een uitzondering: een kapot,
 * verlopen of vervalst cookie is een gewone bezoeker zonder sessie.
 */
export function leesSessie(waarde, nuSeconden = Math.floor(Date.now() / 1000)) {
  if (typeof waarde !== 'string') return null
  const delen = waarde.split('.')
  if (delen.length !== 3) return null

  const [gebruikerId, verlooptTekst, handtekening] = delen
  if (!/^rec[A-Za-z0-9]{14}$/.test(gebruikerId)) return null

  const verloopt = Number(verlooptTekst)
  if (!Number.isSafeInteger(verloopt) || verloopt <= nuSeconden) return null

  if (!safeEqual(handtekening, onderteken(`${gebruikerId}.${verlooptTekst}`))) return null
  return gebruikerId
}

export function sessieCookie(waarde) {
  return `${COOKIE}=${waarde}; HttpOnly; Secure; SameSite=Strict; Path=${COOKIE_PAD}; Max-Age=${SESSIE_SECONDEN}`
}

export function wisCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=${COOKIE_PAD}; Max-Age=0`
}

/**
 * Haalt één cookie uit de header. Bewust met de hand in plaats van met een
 * bibliotheek: één regel minder afhankelijkheid in een functie die over
 * toegang gaat.
 */
export function cookieUitHeader(header, naam = COOKIE) {
  for (const stuk of String(header ?? '').split(';')) {
    const scheiding = stuk.indexOf('=')
    if (scheiding === -1) continue
    if (stuk.slice(0, scheiding).trim() === naam) return stuk.slice(scheiding + 1).trim()
  }
  return null
}

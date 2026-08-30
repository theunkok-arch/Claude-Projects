/**
 * Waarom dit bestand bestaat.
 *
 * De bewerkknop stond op de computer wel op het scherm en op de telefoon niet.
 * In de code zat geen verschil: bij 1280, 390 en 360 pixels breed rendert hij
 * identiek, binnen beeld, zichtbaar. De telefoon draaide simpelweg een oudere
 * bundel — de browser had de oude `index.html` nog en laadde daarmee het oude
 * JavaScript.
 *
 * Dat op zich is te herstellen met een harde ververs. Het echte gebrek was dat
 * niets in de app dat kon vertellen. Voor Dominique zag "de knop is er nog niet"
 * er precies hetzelfde uit als "de knop werkt niet", en dat zijn twee heel
 * verschillende problemen met twee heel verschillende oplossingen.
 *
 * De vergelijking gebruikt geen apart versiebestand dat uit de pas kan gaan
 * lopen. Vite geeft de bundel een naam met een hash erin, en de draaiende
 * pagina weet welke bundel zij zelf geladen heeft. Staat er in de `index.html`
 * op de server een andere naam, dan is er nieuwer werk uitgerold. Dat kan per
 * definitie niet verkeerd staan.
 */

/** De bundel die dit tabblad nu draait, of null op de dev-server. */
function draaiendeBundel(): string | null {
  const el = document.querySelector<HTMLScriptElement>('script[type="module"][src]')
  if (!el) return null
  const pad = new URL(el.src, location.origin).pathname
  // Op `vite dev` is dit /src/main.tsx: geen hash, dus niets te vergelijken.
  return pad.startsWith('/assets/') ? pad : null
}

const BUNDEL_IN_HTML = /<script[^>]+src="(\/assets\/[^"]+\.js)"/

/**
 * Staat er een nieuwere bundel op de server dan de draaiende?
 *
 * Faalt bewust stil. Geen netwerk, een 404, een antwoord dat niet op een
 * `index.html` lijkt: dan weten we het niet, en dan is "niets melden" beter dan
 * een melding die de gebruiker niet kan plaatsen.
 */
export async function nieuweVersie(): Promise<boolean> {
  const hier = draaiendeBundel()
  if (!hier) return false

  try {
    const antwoord = await fetch('/index.html', { cache: 'no-store' })
    if (!antwoord.ok) return false
    const daar = BUNDEL_IN_HTML.exec(await antwoord.text())?.[1]
    return Boolean(daar) && daar !== hier
  } catch {
    return false
  }
}

/**
 * Ververs zo hard als een browser toelaat.
 *
 * `location.reload()` mag volgens de specificatie uit de cache putten, en dat
 * is precies wat hier misging. Een adres dat de browser nog nooit gezien heeft
 * kan hij niet uit de cache halen, dus krijgt de URL een wegwerp-parameter mee.
 */
const VERS = 'vers'

export function herstart(): void {
  const url = new URL(location.href)
  url.searchParams.set(VERS, Date.now().toString(36))
  location.replace(url.toString())
}

/**
 * Haal die parameter weer uit de adresbalk zodra de nieuwe pagina draait.
 * Zonder dit blijft hij bij elke volgende navigatie meeliften en staat hij in
 * elke link die iemand kopieert.
 */
export function ruimHerstartOp(): void {
  const url = new URL(location.href)
  if (!url.searchParams.has(VERS)) return
  url.searchParams.delete(VERS)
  history.replaceState(null, '', url.pathname + url.search + url.hash)
}

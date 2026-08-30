import { useState } from 'react'
import { klantZiet } from '../../shared/klantweergave.mjs'
import type { Aanmelding, Kandidaat } from '../lib/types'

/**
 * Wat de opdrachtgever van deze kandidaat ziet, en de knop om dat om te zetten.
 *
 * Dit veld (`Zichtbaar voor klant`) bepaalt of een opdrachtgever op het portaal
 * een naam ziet of alleen initialen. Het stond nergens in de app: het ging
 * automatisch aan zodra iemand op Voorgesteld kwam, en verder kon je er alleen
 * in Airtable bij. Zolang het alleen om een rapport ging viel dat mee. Nu de
 * hele anonimisering van het portaal aan dit ene vinkje hangt, hoort de persoon
 * die erover gaat erbij te kunnen.
 *
 * Het is bewust geen selectievakje in het bewerkformulier geworden. Dit is een
 * besluit over een persoon die zich nooit heeft aangemeld, geen veld dat je
 * invult. Daarom staat er letterlijk wat de klant te zien krijgt — dezelfde
 * tekst die de portal opbouwt, uit dezelfde functie — in plaats van een label
 * dat je moet vertalen naar een gevolg.
 */
export default function Klantzicht({
  aanmelding,
  kandidaat,
  opdrachtgever,
  onZet,
}: {
  aanmelding: Aanmelding
  kandidaat?: Kandidaat
  opdrachtgever?: string
  onZet: (zichtbaar: boolean) => Promise<void>
}) {
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  const vrijgegeven = Boolean(aanmelding['Zichtbaar voor klant'])
  const zicht = klantZiet(kandidaat, vrijgegeven)
  const klant = opdrachtgever ?? 'De opdrachtgever'

  async function zet() {
    setBezig(true)
    setFout(null)
    try {
      await onZet(!vrijgegeven)
    } catch (error) {
      setFout(error instanceof Error ? error.message : 'Er ging iets mis.')
    } finally {
      setBezig(false)
    }
  }

  // Bewust geen oranje bij een vrijgegeven naam, hoe verleidelijk ook. Oranje
  // betekent in deze app dat iets aandacht vraagt — lege velden, een
  // overschreden servicenorm. Een vrijgegeven naam is geen alarm maar een
  // bewust besluit dat klopt. Dit scherm heeft al twee oranje knoppen; een
  // derde die iets anders bedoelt, leert de lezer om oranje te negeren.
  //
  // Het verschil zit waar het hoort: in de tekst. "T.W." naast "Tom Willems"
  // is het luidste signaal dat er is, en het vraagt geen uitleg.
  return (
    <div className="mt-2 rounded-xl border border-lijn bg-cream px-3 py-2">
      <p className="text-xs text-navy-400">{klant} ziet op het portaal</p>
      <p className="mt-0.5 font-medium">{zicht.kop}</p>
      {zicht.regel && <p className="text-sm text-navy-400">{zicht.regel}</p>}

      {fout && <p className="mt-1 text-sm text-red-700">{fout}</p>}

      <button
        type="button"
        onClick={zet}
        disabled={bezig}
        className="tik mt-2 inline-flex items-center rounded-xl border border-lijn bg-white px-4 text-sm font-medium disabled:opacity-40"
      >
        {bezig ? 'Bezig…' : vrijgegeven ? 'Naam weer verbergen' : 'Naam vrijgeven'}
      </button>
    </div>
  )
}

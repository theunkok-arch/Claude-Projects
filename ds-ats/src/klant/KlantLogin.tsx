import { useState } from 'react'
import { GeenToegang, logIn } from '../lib/klant'

/**
 * Het inlogscherm voor opdrachtgevers.
 *
 * Bewust anders van vorm dan het interne inlogscherm: hier staat de naam van
 * het portaal, want wie hier belandt moet meteen zien dat dit niet zijn eigen
 * systeem is maar dat van zijn recruiter.
 *
 * De melding komt letterlijk van de server. Die maakt geen onderscheid tussen
 * een onbekend e-mailadres en een fout wachtwoord — anders is dit scherm een
 * manier om uit te vinden welke bedrijven klant zijn.
 */
export default function KlantLogin({ onBinnen }: { onBinnen: () => void }) {
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  async function verstuur(event: React.FormEvent) {
    event.preventDefault()
    setBezig(true)
    setFout(null)
    try {
      await logIn(email, wachtwoord)
      onBinnen()
    } catch (error) {
      setFout(error instanceof GeenToegang || error instanceof Error ? error.message : 'Er ging iets mis.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <form onSubmit={verstuur} className="w-full max-w-sm">
        <p className="font-semibold tracking-tight">
          Do <span className="text-oranje">Solutions</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Kandidatenportaal</h1>
        <p className="mt-1 mb-6 text-sm text-navy-400">
          Log in met het e-mailadres en wachtwoord die je van ons hebt gekregen.
        </p>

        <label className="block text-sm font-medium" htmlFor="klant-email">
          E-mailadres
        </label>
        <input
          id="klant-email"
          type="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="tik mt-1 w-full rounded-xl border border-lijn bg-white px-4 py-3 text-base"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="klant-wachtwoord">
          Wachtwoord
        </label>
        <input
          id="klant-wachtwoord"
          type="password"
          autoComplete="current-password"
          value={wachtwoord}
          onChange={(event) => setWachtwoord(event.target.value)}
          className="tik mt-1 w-full rounded-xl border border-lijn bg-white px-4 py-3 text-base"
        />

        {fout && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {fout}
          </p>
        )}

        <button
          type="submit"
          disabled={bezig || !email || !wachtwoord}
          className="tik mt-5 w-full rounded-xl bg-navy py-3.5 font-semibold text-white disabled:opacity-40"
        >
          {bezig ? 'Bezig…' : 'Inloggen'}
        </button>

        <p className="mt-6 text-xs text-navy-400">
          Wachtwoord kwijt? Wij kunnen het niet opzoeken — het staat nergens bewaard. Vraag Do
          Solutions om een nieuw wachtwoord.
        </p>
      </form>
    </main>
  )
}

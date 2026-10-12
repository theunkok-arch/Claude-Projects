import { useState } from 'react'
import { GeenToegang, PortaalFout, logIn } from '../lib/klant'
import { foutTekst, useTaal } from './i18n'
import Taalkeuze from './Taalkeuze'

/**
 * Het inlogscherm voor opdrachtgevers.
 *
 * Bewust anders van vorm dan het interne inlogscherm: hier staat de naam van
 * het portaal, want wie hier belandt moet meteen zien dat dit niet zijn eigen
 * systeem is maar dat van zijn recruiter.
 *
 * De melding komt van de server, op code vertaald. Die maakt geen onderscheid
 * tussen een onbekend e-mailadres en een fout wachtwoord: anders is dit scherm
 * een manier om uit te vinden welke bedrijven klant zijn.
 *
 * De taalkeuze staat ook hier, en niet pas na het inloggen. Wie de Nederlandse
 * tekst niet leest, moet juist op dit scherm al kunnen omzetten.
 */
export default function KlantLogin({ onBinnen }: { onBinnen: () => void }) {
  const { t } = useTaal()
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
      setFout(
        error instanceof PortaalFout || error instanceof GeenToegang
          ? foutTekst(t, error.code, error.vars, error.message)
          : foutTekst(t, undefined, undefined, error instanceof Error ? error.message : ''),
      )
    } finally {
      setBezig(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <form onSubmit={verstuur} className="w-full max-w-sm">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold tracking-tight">
            Do <span className="text-oranje">Solutions</span>
          </p>
          <Taalkeuze />
        </div>
        <h1 className="mt-2 text-2xl font-semibold">{t.login.portaal}</h1>
        <p className="mt-1 mb-6 text-sm text-navy-400">{t.login.uitleg}</p>

        <label className="block text-sm font-medium" htmlFor="klant-email">
          {t.login.email}
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
          {t.login.wachtwoord}
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
          {bezig ? t.login.bezig : t.login.inloggen}
        </button>

        <p className="mt-6 text-xs text-navy-400">{t.login.kwijt}</p>
      </form>
    </main>
  )
}

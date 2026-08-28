import { useState } from 'react'
import { useAts } from '../store/AtsProvider'

/**
 * Eén gedeeld wachtwoord voor de hele app. Niet omdat er meerdere gebruikers
 * zijn — die zijn er niet — maar omdat hier honderden kandidaatdossiers achter
 * liggen van mensen die zich nooit hebben aangemeld.
 */
export default function LoginGate() {
  const { logIn, fout } = useAts()
  const [wachtwoord, setWachtwoord] = useState('')
  const [bezig, setBezig] = useState(false)

  async function verstuur(event: React.FormEvent) {
    event.preventDefault()
    setBezig(true)
    await logIn(wachtwoord)
    setBezig(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <form onSubmit={verstuur} className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Do Solutions ATS</h1>
        <p className="mt-1 mb-6 text-sm text-navy-400">Voer het wachtwoord in om verder te gaan.</p>

        <input
          type="password"
          autoComplete="current-password"
          value={wachtwoord}
          onChange={(event) => setWachtwoord(event.target.value)}
          className="tik w-full rounded-xl border border-lijn bg-white px-4 py-3 text-base"
          placeholder="Wachtwoord"
        />

        {fout && <p className="mt-3 text-sm text-red-700">{fout}</p>}

        <button
          type="submit"
          disabled={bezig || wachtwoord.length === 0}
          className="tik mt-4 w-full rounded-xl bg-navy py-3.5 font-semibold text-white disabled:opacity-40"
        >
          {bezig ? 'Bezig…' : 'Inloggen'}
        </button>
      </form>
    </div>
  )
}

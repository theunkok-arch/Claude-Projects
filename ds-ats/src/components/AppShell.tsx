import { NavLink, useLocation } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { useAts } from '../store/AtsProvider'
import Zoek from './Zoek'
import VersieMelding from './VersieMelding'

// `prefix` bepaalt wanneer de tab oplicht: de klantentab hoort ook actief te
// zijn op /opdrachtgever/:id, en de vacaturetab op /vacature/:id.
const TABS = [
  { pad: '/', label: 'Maandag', prefix: '/' },
  { pad: '/vacatures', label: 'Vacatures', prefix: '/vacature' },
  { pad: '/opdrachtgevers', label: 'Klanten', prefix: '/opdrachtgever' },
  { pad: '/bronnen', label: 'Bronnen', prefix: '/bronnen' },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const { laden, herlaad, logUit } = useAts()
  const { pathname } = useLocation()
  const [zoeken, setZoeken] = useState(false)

  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl pb-24">
      <header className="sticky top-0 z-30 border-b border-lijn bg-cream/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold tracking-tight">
            Do <span className="text-oranje">Solutions</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoeken(true)}
              aria-label="Zoek een kandidaat"
              className="tik flex items-center justify-center rounded-lg px-3 text-navy-400"
            >
              <svg viewBox="0 0 20 20" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="9" cy="9" r="6" />
                <path d="m13.5 13.5 4 4" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => void herlaad()}
              className="tik rounded-lg px-3 text-sm text-navy-400"
            >
              {laden ? 'Laden…' : 'Ververs'}
            </button>
            <button type="button" onClick={logUit} className="tik rounded-lg px-3 text-sm text-navy-400">
              Uit
            </button>
          </div>
        </div>
        <VersieMelding />
      </header>

      <main className="px-4 py-4">{children}</main>

      <p className="px-4 pb-2 text-center text-xs text-navy-400">versie {__VERSIE__}</p>

      <Zoek open={zoeken} onSluit={() => setZoeken(false)} />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-lijn bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map((tab) => {
            const actief = tab.prefix === '/' ? pathname === '/' : pathname.startsWith(tab.prefix)
            return (
              <NavLink
                key={tab.pad}
                to={tab.pad}
                className={`tik flex-1 py-3 text-center text-sm font-medium ${
                  actief ? 'text-oranje' : 'text-navy-400'
                }`}
              >
                {tab.label}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

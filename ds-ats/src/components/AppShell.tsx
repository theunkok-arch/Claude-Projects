import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAts } from '../store/AtsProvider'

const TABS = [
  { pad: '/', label: 'Maandag' },
  { pad: '/vacatures', label: 'Vacatures' },
  { pad: '/bronnen', label: 'Bronnen' },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const { laden, herlaad, logUit } = useAts()
  const { pathname } = useLocation()

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
      </header>

      <main className="px-4 py-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-lijn bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map((tab) => {
            const actief = tab.pad === '/' ? pathname === '/' : pathname.startsWith(tab.pad)
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

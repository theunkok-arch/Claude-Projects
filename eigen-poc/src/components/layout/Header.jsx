import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Globe, Check } from 'lucide-react'
import { useTranslation } from '../../i18n'

function LanguageToggle() {
  const { language, setLanguage, languages } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const current = languages[language]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center gap-1 h-10 px-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Change language"
      >
        <Globe size={16} className="text-gray-500" />
        <span className="text-xs font-semibold text-gray-600 uppercase">{current?.code || 'en'}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 min-w-[160px] bg-white rounded-xl shadow-lg border border-gray-200 py-1">
          {Object.values(languages).map((lng) => (
            <button
              key={lng.code}
              onClick={() => { setLanguage(lng.code); setOpen(false) }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{lng.flag}</span>
                <span className="text-gray-700">{lng.nativeName}</span>
              </span>
              {language === lng.code && <Check size={14} className="text-eigen-green" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Header({ title, flow }) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center h-14 px-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-eigen-navy" />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold text-eigen-navy truncate">
          {title}
        </h1>
        <LanguageToggle />
      </div>
    </header>
  )
}

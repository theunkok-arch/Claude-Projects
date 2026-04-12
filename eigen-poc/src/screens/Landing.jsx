import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search, ArrowRight, Sparkles, Shield, TrendingUp, EyeOff, Globe, Check } from 'lucide-react'
import useAppStore from '../stores/appStore'
import { useTranslation } from '../i18n'

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
        className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
        aria-label="Change language"
      >
        <Globe size={14} className="text-gray-500" />
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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function Landing() {
  const navigate = useNavigate()
  const setRole = useAppStore((s) => s.setRole)
  const { t } = useTranslation()

  const handleSell = () => {
    setRole('seller')
    navigate('/sell/valuation')
  }

  const handleBuy = () => {
    setRole('buyer')
    navigate('/buy/search')
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Top-right language toggle */}
      <div className="flex justify-end px-4 pt-4">
        <LanguageToggle />
      </div>
      {/* Hero */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6 pt-4 pb-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Logo */}
        <motion.div variants={item} className="mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-eigen-navy rounded-xl flex items-center justify-center">
              <Home size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-eigen-navy tracking-tight">EIGEN</span>
          </div>
        </motion.div>

        {/* Tagline */}
        <motion.h1
          variants={item}
          className="text-3xl font-bold text-eigen-navy text-center leading-tight mb-3"
        >
          {t('landing.tagline1')}
          <br />
          <span className="text-eigen-orange">{t('landing.tagline2')}</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="text-gray-500 text-center text-base mb-10 max-w-[300px]"
        >
          {t('landing.subtitle')}
        </motion.p>

        {/* Role cards */}
        <motion.div variants={item} className="w-full space-y-3 mb-10">
          {/* Sell card */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSell}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-eigen-orange bg-eigen-orange-light text-left transition-shadow hover:shadow-md"
          >
            <div className="w-12 h-12 bg-eigen-orange rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-eigen-navy text-base">{t('landing.sellTitle')}</p>
              <p className="text-sm text-gray-500">{t('landing.sellSubtitle')}</p>
            </div>
            <ArrowRight size={18} className="text-eigen-orange shrink-0" />
          </motion.button>

          {/* Buy card */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleBuy}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-eigen-blue bg-eigen-blue-light text-left transition-shadow hover:shadow-md"
          >
            <div className="w-12 h-12 bg-eigen-blue rounded-xl flex items-center justify-center shrink-0">
              <Search size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-eigen-navy text-base">{t('landing.buyTitle')}</p>
              <p className="text-sm text-gray-500">{t('landing.buySubtitle')}</p>
            </div>
            <ArrowRight size={18} className="text-eigen-blue shrink-0" />
          </motion.button>

          {/* Stille Verkoop card */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { setRole('seller'); navigate('/sell/explore') }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-purple-200 bg-purple-50 text-left transition-shadow hover:shadow-md"
          >
            <div className="w-12 h-12 bg-eigen-purple rounded-xl flex items-center justify-center shrink-0">
              <EyeOff size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-eigen-navy text-base">{t('landing.stilleTitle')}</p>
              <p className="text-sm text-gray-500">{t('landing.stilleSubtitle')}</p>
            </div>
            <ArrowRight size={18} className="text-eigen-purple shrink-0" />
          </motion.button>
        </motion.div>

        {/* Trust indicators */}
        <motion.div variants={item} className="flex items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-1">
            <Sparkles size={16} className="text-eigen-purple" />
            <span className="text-xs text-gray-500">{t('landing.trustAI')}</span>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex flex-col items-center gap-1">
            <Shield size={16} className="text-eigen-green" />
            <span className="text-xs text-gray-500">{t('landing.trustVerified')}</span>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex flex-col items-center gap-1">
            <TrendingUp size={16} className="text-eigen-orange" />
            <span className="text-xs text-gray-500">{t('landing.trustSavings')}</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <div className="px-6 py-4 text-center">
        <p className="text-xs text-gray-400">
          {t('landing.footer')}
        </p>
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search, ArrowRight, Sparkles, Shield, TrendingUp, EyeOff } from 'lucide-react'
import useAppStore from '../stores/appStore'

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
      {/* Hero */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8"
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
          Sell or buy your home
          <br />
          <span className="text-eigen-orange">without a makelaar</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="text-gray-500 text-center text-base mb-10 max-w-[300px]"
        >
          AI-powered real estate for the Netherlands. Save thousands in commission.
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
              <p className="font-semibold text-eigen-navy text-base">I want to sell</p>
              <p className="text-sm text-gray-500">Get a free AI valuation in 30 seconds</p>
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
              <p className="font-semibold text-eigen-navy text-base">I want to buy</p>
              <p className="text-sm text-gray-500">AI-powered search with smart insights</p>
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
              <p className="font-semibold text-eigen-navy text-base">Stille Verkoop</p>
              <p className="text-sm text-gray-500">Explore buyer interest without listing</p>
            </div>
            <ArrowRight size={18} className="text-eigen-purple shrink-0" />
          </motion.button>
        </motion.div>

        {/* Trust indicators */}
        <motion.div variants={item} className="flex items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-1">
            <Sparkles size={16} className="text-eigen-purple" />
            <span className="text-xs text-gray-500">AI-Powered</span>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex flex-col items-center gap-1">
            <Shield size={16} className="text-eigen-green" />
            <span className="text-xs text-gray-500">Verified</span>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex flex-col items-center gap-1">
            <TrendingUp size={16} className="text-eigen-orange" />
            <span className="text-xs text-gray-500">Save €6.000+</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <div className="px-6 py-4 text-center">
        <p className="text-xs text-gray-400">
          EIGEN PoC — Replacing the traditional makelaar with AI
        </p>
      </div>
    </div>
  )
}

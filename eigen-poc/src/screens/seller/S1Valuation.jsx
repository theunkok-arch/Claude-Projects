import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Shield, CheckCircle, Sparkles, Home, Calendar, Ruler, Banknote, ChevronDown, RotateCcw } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Accordion from '../../components/ui/Accordion'
import Modal from '../../components/ui/Modal'
import AIBubble from '../../components/ai/AIBubble'
import AITyping from '../../components/ai/AITyping'
import useSellerStore from '../../stores/sellerStore'
import useAnimateNumber from '../../hooks/useAnimateNumber'
import { searchAddresses, formatAddress } from '../../data/mockAddresses'
import { BANKS } from '../../data/constants'
import { formatCurrency } from '../../utils/formatCurrency'

const slideUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

// ---------- State 1: Address Entry ----------
function AddressEntry({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const timerRef = useRef(null)

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(timerRef.current)
    if (val.length >= 3) {
      timerRef.current = setTimeout(() => {
        setResults(searchAddresses(val))
        setShowDropdown(true)
      }, 300)
    } else {
      setResults([])
      setShowDropdown(false)
    }
  }

  const handleSelect = (addr) => {
    setQuery(formatAddress(addr))
    setShowDropdown(false)
    onSelect(addr)
  }

  return (
    <motion.div className="px-4 pt-8 pb-6" {...slideUp}>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-eigen-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Home size={28} className="text-eigen-orange" />
        </div>
        <h2 className="text-2xl font-bold text-eigen-navy mb-2">What's your home worth?</h2>
        <p className="text-gray-500">Enter your address for an instant AI valuation</p>
      </div>

      <div className="relative">
        <div className="flex items-center h-14 px-4 rounded-xl border-2 border-gray-200 focus-within:border-eigen-orange transition-colors bg-white">
          <MapPin size={18} className="text-gray-400 shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Start typing your address..."
            className="flex-1 h-full text-base outline-none bg-transparent"
            autoFocus
          />
        </div>

        <AnimatePresence>
          {showDropdown && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-20"
            >
              {results.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => handleSelect(addr)}
                  className="w-full flex items-start justify-between px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-eigen-navy">
                      {addr.street} {addr.number}
                    </p>
                    <p className="text-xs text-gray-500">
                      {addr.postcode} {addr.city}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                      <span>{addr.type}</span>
                      <span>·</span>
                      <span>{addr.m2Living} m²</span>
                      <span>·</span>
                      <span>{addr.buildYear}</span>
                    </div>
                  </div>
                  <Badge color="green" className="shrink-0 ml-2">Kadaster ✓</Badge>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {showDropdown && results.length === 0 && query.length >= 3 && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-400">No addresses found</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ---------- State 2: Identity Verification ----------
function IdentityVerification({ address, onVerified }) {
  const [showIDIN, setShowIDIN] = useState(false)
  const [idinStep, setIdinStep] = useState('explain') // explain → banks → redirecting → confirm → success
  const [selectedBank, setSelectedBank] = useState(null)

  const startIDIN = () => {
    setShowIDIN(true)
    setIdinStep('explain')
  }

  const selectBank = (bank) => {
    setSelectedBank(bank)
    setIdinStep('redirecting')
    setTimeout(() => setIdinStep('confirm'), 1500)
  }

  const confirmAuth = () => {
    setIdinStep('success')
    setTimeout(() => {
      setShowIDIN(false)
      onVerified()
    }, 1500)
  }

  return (
    <motion.div className="px-4 pt-4 pb-6" {...slideUp}>
      {/* Confirmed address card */}
      <Card className="mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
            <MapPin size={18} className="text-eigen-green" />
          </div>
          <div>
            <p className="font-semibold text-eigen-navy">{address.street} {address.number}</p>
            <p className="text-sm text-gray-500">{address.postcode} {address.city}</p>
          </div>
          <Badge color="green" className="ml-auto">Selected</Badge>
        </div>
      </Card>

      {/* Property info card */}
      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Property Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Home size={15} className="text-gray-400" />
            <span className="text-sm text-gray-700">{address.type || 'Appartement'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400" />
            <span className="text-sm text-gray-700">Built {address.buildYear || 1920}</span>
          </div>
          <div className="flex items-center gap-2">
            <Ruler size={15} className="text-gray-400" />
            <span className="text-sm text-gray-700">{address.m2Living || 85} m²</span>
          </div>
          <div className="flex items-center gap-2">
            <Banknote size={15} className="text-gray-400" />
            <span className="text-sm text-gray-700">WOZ {formatCurrency(address.wozValue || 385000)}</span>
          </div>
        </div>
      </Card>

      {/* IDIN button */}
      <Button variant="buyer" fullWidth onClick={startIDIN}>
        <div className="flex items-center justify-center gap-2">
          <Shield size={18} />
          Verify My Identity (IDIN)
        </div>
      </Button>
      <p className="text-xs text-gray-400 text-center mt-2">Secure bank verification — €0.01 authorization</p>

      {/* IDIN Modal */}
      <Modal open={showIDIN} onClose={() => setShowIDIN(false)} title="Identity Verification">
        <AnimatePresence mode="wait">
          {idinStep === 'explain' && (
            <motion.div key="explain" {...slideUp}>
              <p className="text-sm text-gray-600 mb-4">
                To confirm you own this address, we use <strong>IDIN</strong> — a secure service by your bank.
                You authorize a €0.01 payment which verifies your identity and registered address.
              </p>
              <Button fullWidth onClick={() => setIdinStep('banks')}>
                Select Your Bank
              </Button>
            </motion.div>
          )}

          {idinStep === 'banks' && (
            <motion.div key="banks" {...slideUp}>
              <p className="text-sm text-gray-600 mb-4">Select your bank:</p>
              <div className="grid grid-cols-2 gap-2">
                {BANKS.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => selectBank(bank)}
                    className="flex items-center justify-center h-14 rounded-xl font-semibold text-sm text-white transition-transform active:scale-95"
                    style={{ backgroundColor: bank.color }}
                  >
                    {bank.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {idinStep === 'redirecting' && (
            <motion.div key="redirecting" {...slideUp} className="text-center py-8">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-eigen-blue rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-600">Redirecting to {selectedBank?.name}...</p>
            </motion.div>
          )}

          {idinStep === 'confirm' && (
            <motion.div key="confirm" {...slideUp}>
              <div
                className="rounded-xl p-6 text-center text-white mb-4"
                style={{ backgroundColor: selectedBank?.color }}
              >
                <p className="font-semibold text-lg mb-2">{selectedBank?.name}</p>
                <p className="text-sm opacity-90 mb-4">
                  EIGEN requests identity verification — €0.01 authorization
                </p>
                <button
                  onClick={confirmAuth}
                  className="bg-white/20 hover:bg-white/30 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
                >
                  Confirm with your app
                </button>
              </div>
            </motion.div>
          )}

          {idinStep === 'success' && (
            <motion.div key="success" {...slideUp} className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <CheckCircle size={56} className="text-eigen-green mx-auto mb-4" />
              </motion.div>
              <p className="text-lg font-semibold text-eigen-green">Verification Successful!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>
    </motion.div>
  )
}

// ---------- State 2b: Verified — ready to analyse ----------
function VerifiedReady({ address, onAnalyse }) {
  return (
    <motion.div className="px-4 pt-4 pb-32" {...slideUp}>
      {/* Confirmed address card with verified badge */}
      <Card className="mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
            <MapPin size={18} className="text-eigen-green" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-eigen-navy">{address.street} {address.number}</p>
            <p className="text-sm text-gray-500">{address.postcode} {address.city}</p>
          </div>
          <Badge color="green">Verified ✓</Badge>
        </div>
      </Card>

      {/* Property info card */}
      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Property Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Home size={15} className="text-gray-400" />
            <span className="text-sm text-gray-700">{address.type || 'Appartement'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400" />
            <span className="text-sm text-gray-700">Built {address.buildYear || 1920}</span>
          </div>
          <div className="flex items-center gap-2">
            <Ruler size={15} className="text-gray-400" />
            <span className="text-sm text-gray-700">{address.m2Living || 85} m²</span>
          </div>
          <div className="flex items-center gap-2">
            <Banknote size={15} className="text-gray-400" />
            <span className="text-sm text-gray-700">WOZ {formatCurrency(address.wozValue || 385000)}</span>
          </div>
        </div>
      </Card>

      <BottomCTA>
        <Button variant="primary" fullWidth onClick={onAnalyse}>
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={18} />
            Analyse My Home
          </div>
        </Button>
      </BottomCTA>
    </motion.div>
  )
}

// ---------- State 3: Analysis Loading ----------
function AnalysisLoading() {
  const [phase, setPhase] = useState(0)
  const phases = [
    'Analyzing comparable sales...',
    'Calculating location premium...',
    'Generating confidence interval...',
  ]

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1000)
    const t2 = setTimeout(() => setPhase(2), 2000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const progress = ((phase + 1) / 3) * 100

  return (
    <motion.div className="px-4 pt-16 pb-6" {...slideUp}>
      <div className="text-center">
        <motion.div
          className="w-16 h-16 bg-eigen-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-6"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Sparkles size={28} className="text-eigen-purple" />
        </motion.div>

        <h2 className="text-xl font-bold text-eigen-navy mb-2">Analysing your home</h2>
        <p className="text-sm text-gray-500 mb-8">{phases[phase]}</p>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-eigen-purple rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-400">
          {phases.map((p, i) => (
            <span key={i} className={i <= phase ? 'text-eigen-purple font-medium' : ''}>
              {i + 1}/{phases.length}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ---------- State 4: Valuation Results ----------
function ValuationResults({ address, valuation, onChangeAddress }) {
  const navigate = useNavigate()
  const animatedEstimate = useAnimateNumber(valuation.estimate, 1200)
  const animatedConfidence = useAnimateNumber(valuation.confidence, 800)

  return (
    <motion.div className="px-4 pt-4 pb-32" {...slideUp}>
      {/* Selected address summary with change button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin size={14} className="text-eigen-green" />
          <span className="font-medium">{address.street} {address.number}, {address.city}</span>
        </div>
        <button
          onClick={onChangeAddress}
          className="flex items-center gap-1 text-xs text-eigen-blue font-medium hover:underline"
        >
          <RotateCcw size={12} />
          Change address
        </button>
      </div>

      {/* Valuation card — navy gradient */}
      <div className="bg-gradient-to-br from-eigen-navy to-[#1E4D7B] rounded-2xl p-6 text-white mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} className="text-purple-300" />
          <span className="text-xs font-semibold uppercase tracking-wide text-purple-300">AI Valuation</span>
        </div>
        <p className="text-4xl font-bold mb-2">{formatCurrency(animatedEstimate)}</p>
        <p className="text-sm text-white/70 mb-4">
          {formatCurrency(valuation.rangeLow)} — {formatCurrency(valuation.rangeHigh)}
        </p>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/15 text-sm font-medium">
          {animatedConfidence}% confidence
        </span>
      </div>

      {/* Comparable sales */}
      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Comparable Sales</h3>
        <div className="space-y-3">
          {valuation.comparables.map((comp, i) => (
            <div key={i} className="py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-eigen-navy">{comp.address}</p>
                </div>
                <div className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-bold text-white ${
                  comp.matchScore >= 85 ? 'bg-eigen-green' : comp.matchScore >= 75 ? 'bg-eigen-amber' : 'bg-gray-400'
                }`}>
                  {comp.matchScore}% match
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                  <span>{comp.m2} m²</span>
                  <span>·</span>
                  <span>Sold {comp.soldDate || comp.date}</span>
                  <span>·</span>
                  <span>{formatCurrency(comp.pricePerM2 || Math.round(comp.price / comp.m2))}/m²</span>
                  <span>·</span>
                  <span>{comp.distance || '—'}m away</span>
                </div>
                <p className="text-sm font-semibold text-eigen-navy ml-2 shrink-0">{formatCurrency(comp.price)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Insight */}
      <div className="mb-4">
        <AITyping text={valuation.aiInsight} speed={30} />
      </div>

      {/* How we calculated this */}
      <Accordion title="How we calculated this">
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>Comparables used:</strong> {valuation.comparables.length} recent sales within 500m</p>
          <p><strong>Date range:</strong> Last 12 months (2025-04 to 2026-04)</p>
          <p><strong>Adjustment factors:</strong> Location premium (+8%), condition (+3%), energy label (-2%)</p>
          <p><strong>Data sources:</strong> Kadaster transaction records, NVM market data, CBS statistics, WOZ valuations</p>
          <p className="text-xs text-gray-400 mt-2">This is an AI-generated estimate. For a certified valuation, contact a NWWI-certified appraiser.</p>
        </div>
      </Accordion>

      <BottomCTA>
        <Button variant="primary" fullWidth onClick={() => navigate('/sell/photos')}>
          Continue to Photos →
        </Button>
      </BottomCTA>
    </motion.div>
  )
}

// ---------- Main S1 Screen ----------
export default function S1Valuation() {
  const { address, verified, valuation, setAddress, setVerified, setValuation } = useSellerStore()
  const [screenState, setScreenState] = useState('address') // address → verify → verified → loading → results

  // Derive initial state from store
  useEffect(() => {
    if (valuation) {
      setScreenState('results')
    } else if (verified) {
      setScreenState('verified')
    } else if (address) {
      setScreenState('verify')
    }
  }, [])

  const handleAddressSelect = (addr) => {
    setAddress(addr)
    setScreenState('verify')
  }

  const handleVerified = () => {
    setVerified(true)
    setScreenState('verified')
  }

  const handleChangeAddress = () => {
    setAddress(null)
    setValuation(null)
    setVerified(false)
    setScreenState('address')
  }

  const handleAnalyse = () => {
    setScreenState('loading')
    // Simulate 3-second analysis
    setTimeout(() => {
      const val = address.valuation || {
        estimate: address.wozValue || 425000,
        rangeLow: (address.wozValue || 425000) * 0.95,
        rangeHigh: (address.wozValue || 425000) * 1.05,
        confidence: 87,
        comparables: [
          { address: 'Nearby Street 100', price: 410000, m2: 82, date: '2026-01' },
          { address: 'Nearby Street 200', price: 435000, m2: 90, date: '2025-11' },
          { address: 'Nearby Street 50', price: 420000, m2: 88, date: '2026-02' },
        ],
        aiInsight: 'Your home benefits from its central location and period character. Based on recent comparable sales, we see strong demand in this neighbourhood with an average overbidding of 4.2%.',
      }
      setValuation(val)
      setScreenState('results')
    }, 3000)
  }

  return (
    <AppShell title="Home Valuation" step={1} totalSteps={8} flow="sell">
      <AnimatePresence mode="wait">
        {screenState === 'address' && (
          <AddressEntry key="address" onSelect={handleAddressSelect} />
        )}
        {screenState === 'verify' && (
          <IdentityVerification key="verify" address={address} onVerified={handleVerified} />
        )}
        {screenState === 'verified' && (
          <VerifiedReady key="verified" address={address} onAnalyse={handleAnalyse} />
        )}
        {screenState === 'loading' && (
          <AnalysisLoading key="loading" />
        )}
        {screenState === 'results' && valuation && (
          <ValuationResults key="results" address={address} valuation={valuation} onChangeAddress={handleChangeAddress} />
        )}
      </AnimatePresence>
    </AppShell>
  )
}

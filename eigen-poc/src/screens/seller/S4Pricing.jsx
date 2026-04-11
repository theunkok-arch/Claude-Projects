import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Minus, PartyPopper } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import AIBubble from '../../components/ai/AIBubble'
import useSellerStore from '../../stores/sellerStore'
import { formatCurrency } from '../../utils/formatCurrency'
import { PACKAGES, FEATURE_LABELS, MAKELAAR_RATE, BANKS } from '../../data/constants'

function SavingsBanner({ askingPrice, packagePrice }) {
  const makelaarCost = Math.round(askingPrice * MAKELAAR_RATE)
  const savings = makelaarCost - packagePrice

  return (
    <div className="sticky top-[57px] z-30 bg-amber-50 border-l-4 border-eigen-amber px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">
          Makelaar: <span className="line-through text-eigen-red font-medium">{formatCurrency(makelaarCost)}</span>
        </span>
        <span className="text-sm text-gray-600">
          EIGEN: <span className="text-eigen-green font-medium">{formatCurrency(packagePrice)}</span>
        </span>
      </div>
      <p className="text-xl font-bold text-eigen-orange">You save {formatCurrency(savings)}</p>
    </div>
  )
}

function ConfettiEffect() {
  const colors = ['#FF6B35', '#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#EF4444']
  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: colors[i % colors.length],
            left: `${10 + Math.random() * 80}%`,
            top: -10,
          }}
          initial={{ y: -10, rotate: 0, opacity: 1 }}
          animate={{
            y: window.innerHeight + 50,
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
            opacity: 0,
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 0.5,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  )
}

export default function S4Pricing() {
  const navigate = useNavigate()
  const { address, valuation, listing, selectedPackage, setSelectedPackage, setPaid } = useSellerStore()

  const askingPrice = listing.askingPrice || valuation?.estimate || 425000
  const [showPayment, setShowPayment] = useState(false)
  const [paymentStep, setPaymentStep] = useState('banks')
  const [selectedBank, setSelectedBank] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const currentPkg = PACKAGES.find((p) => p.id === selectedPackage) || PACKAGES[1]

  const handleSelectPackage = (pkgId) => {
    setSelectedPackage(pkgId)
  }

  const handlePayment = () => {
    setShowPayment(true)
    setPaymentStep('banks')
  }

  const handleBankSelect = (bank) => {
    setSelectedBank(bank)
    setPaymentStep('processing')
    setTimeout(() => {
      setPaymentStep('success')
      setShowConfetti(true)
      setPaid()
      setTimeout(() => {
        setShowPayment(false)
        setShowConfetti(false)
        navigate('/sell/dashboard')
      }, 2500)
    }, 2000)
  }

  return (
    <AppShell title="EIGEN Package" step={4} totalSteps={8} flow="sell">
      {/* Savings Banner */}
      <SavingsBanner askingPrice={askingPrice} packagePrice={currentPkg.price} />

      <div className="px-4 pt-4 pb-32">
        {/* Your selected price summary */}
        <Card className="mb-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Your asking price</p>
              <p className="text-xl font-bold text-eigen-navy">{formatCurrency(askingPrice)}</p>
            </div>
            <Button variant="outline" className="text-xs h-8 px-3" onClick={() => navigate('/sell/listing')}>
              Adjust
            </Button>
          </div>
        </Card>

        {/* Package Comparison */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Choose Your EIGEN Package</h3>

        {/* Package cards — stacked vertically for mobile */}
        <div className="space-y-3 mb-4">
          {PACKAGES.map((pkg) => {
            const active = selectedPackage === pkg.id
            return (
              <Card
                key={pkg.id}
                className={`relative ${
                  active ? 'border-eigen-orange border-2' : ''
                }`}
              >
                {pkg.recommended && (
                  <span className="absolute -top-3 left-4 bg-eigen-orange text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
                <div className="flex items-center justify-between pt-1 mb-3">
                  <div>
                    <p className="font-bold text-eigen-navy text-lg">{pkg.name}</p>
                  </div>
                  <p className="text-2xl font-bold text-eigen-navy">{formatCurrency(pkg.price)}</p>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
                  {Object.entries(pkg.features).map(([key, enabled]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      {enabled ? (
                        <Check size={12} className="text-eigen-green shrink-0" />
                      ) : (
                        <Minus size={12} className="text-gray-300 shrink-0" />
                      )}
                      <span className={enabled ? 'text-gray-700' : 'text-gray-300'}>
                        {FEATURE_LABELS[key]}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  variant={active ? 'primary' : 'outline'}
                  fullWidth
                  className="text-sm h-10"
                  onClick={() => handleSelectPackage(pkg.id)}
                >
                  {active ? 'Selected ✓' : 'Select'}
                </Button>
              </Card>
            )
          })}
        </div>

        {/* AI Recommendation */}
        <AIBubble title="Recommendation" className="mb-4">
          Based on your home's value of {formatCurrency(valuation?.estimate || 425000)} and current market conditions
          in {address?.city || 'your area'}, we recommend <strong>Plus</strong> — the best balance of features and
          exposure for your property.
        </AIBubble>
      </div>

      {/* Bottom CTA */}
      <BottomCTA>
        <Button
          variant="primary"
          fullWidth
          disabled={!selectedPackage}
          onClick={handlePayment}
        >
          {selectedPackage ? `Pay ${formatCurrency(currentPkg.price)} & Go Live →` : 'Select a Package to Go Live'}
        </Button>
      </BottomCTA>

      {/* Payment Modal */}
      <Modal
        open={showPayment}
        onClose={() => paymentStep === 'banks' && setShowPayment(false)}
        title={`Pay ${formatCurrency(currentPkg.price)} via iDEAL`}
      >
        <AnimatePresence mode="wait">
          {paymentStep === 'banks' && (
            <motion.div key="banks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-sm text-gray-600 mb-4">Select your bank:</p>
              <div className="grid grid-cols-2 gap-2">
                {BANKS.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => handleBankSelect(bank)}
                    className="flex items-center justify-center h-14 rounded-xl font-semibold text-sm text-white transition-transform active:scale-95"
                    style={{ backgroundColor: bank.color }}
                  >
                    {bank.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {paymentStep === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-eigen-blue rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-600">Processing payment via {selectedBank?.name}...</p>
            </motion.div>
          )}

          {paymentStep === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                <PartyPopper size={48} className="text-eigen-green mx-auto mb-4" />
              </motion.div>
              <p className="text-lg font-bold text-eigen-green mb-1">Payment confirmed!</p>
              <p className="text-sm text-gray-500">Your listing is going live...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>

      {/* Confetti */}
      {showConfetti && <ConfettiEffect />}
    </AppShell>
  )
}

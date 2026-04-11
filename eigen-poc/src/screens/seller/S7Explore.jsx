import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserCircle, Check, Info, Star, Lock, Sparkles } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Chip from '../../components/ui/Chip'
import Modal from '../../components/ui/Modal'
import useSellerStore from '../../stores/sellerStore'
import { formatCurrency } from '../../utils/formatCurrency'

const MOCK_BUYERS = [
  { id: 1, matchScore: 92, type: 'Starter', prequalified: true, areaPreference: 'Utrecht-West', budget: '€350.000 — €425.000', criteria: '3-kamer, garden, close to schools', lookingFor: '4 months', revealedName: 'Anna van den Berg', mortgageApproval: 410000 },
  { id: 2, matchScore: 87, type: 'Doorstromer', prequalified: true, areaPreference: 'Amsterdam-Zuid', budget: '€500.000 — €650.000', criteria: '4+ kamers, balcony, modern kitchen', lookingFor: '2 months', revealedName: 'Mark & Lisa Jansen', mortgageApproval: 620000 },
  { id: 3, matchScore: 81, type: 'Starter', prequalified: false, areaPreference: 'Utrecht-Oost', budget: '€300.000 — €380.000', criteria: '2-kamer, near public transport', lookingFor: '6 months', revealedName: 'Thomas de Groot', mortgageApproval: null },
  { id: 4, matchScore: 76, type: 'Investor', prequalified: true, areaPreference: 'Amsterdam-Centrum', budget: '€400.000 — €550.000', criteria: 'Good rental yield, low VvE', lookingFor: '1 month', revealedName: 'R. Bakker BV', mortgageApproval: null },
  { id: 5, matchScore: 71, type: 'Doorstromer', prequalified: true, areaPreference: 'Haarlem', budget: '€350.000 — €475.000', criteria: 'Tuin, 3 slaapkamers, rustige buurt', lookingFor: '3 months', revealedName: 'Sophie & Jan Visser', mortgageApproval: 450000 },
]

const FILTERS = [
  { id: 'match80', label: 'Match > 80%' },
  { id: 'prequalified', label: 'Pre-qualified' },
  { id: 'Starter', label: 'Starters' },
  { id: 'Doorstromer', label: 'Doorstromers' },
  { id: 'Investor', label: 'Investors' },
]

function ScoreBadge({ score }) {
  const color = score >= 85 ? 'bg-eigen-green' : score >= 75 ? 'bg-eigen-amber' : 'bg-eigen-red'
  return (
    <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
      <span className="text-white text-sm font-bold">{score}%</span>
    </div>
  )
}

const TYPE_COLORS = { Starter: 'blue', Doorstromer: 'purple', Investor: 'gray' }

export default function S7Explore() {
  const navigate = useNavigate()
  const { reveals, addReveal, isPro, setIsPro } = useSellerStore()
  const [activeFilters, setActiveFilters] = useState([])
  const [showPaywall, setShowPaywall] = useState(false)
  const [showTooltip, setShowTooltip] = useState(null)
  const [revealLoading, setRevealLoading] = useState(null)

  const toggleFilter = (id) => {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const filteredBuyers = useMemo(() => {
    return MOCK_BUYERS.filter((buyer) => {
      if (activeFilters.includes('match80') && buyer.matchScore <= 80) return false
      if (activeFilters.includes('prequalified') && !buyer.prequalified) return false
      if (activeFilters.includes('Starter') && buyer.type !== 'Starter') return false
      if (activeFilters.includes('Doorstromer') && buyer.type !== 'Doorstromer') return false
      if (activeFilters.includes('Investor') && buyer.type !== 'Investor') return false
      return true
    })
  }, [activeFilters])

  const handleReveal = (buyerId) => {
    // First reveal is free, rest require Pro
    if (reveals.length === 0 || isPro) {
      setRevealLoading(buyerId)
      setTimeout(() => {
        addReveal(buyerId)
        setRevealLoading(null)
      }, 1000)
    } else {
      setShowPaywall(true)
    }
  }

  const isRevealed = (buyerId) => reveals.includes(buyerId)

  return (
    <AppShell title="Explore Buyers" step={7} totalSteps={8} flow="sell">
      <div className="px-4 pt-4 pb-32">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 mb-4">
          {FILTERS.map((filter) => (
            <Chip
              key={filter.id}
              label={filter.label}
              active={activeFilters.includes(filter.id)}
              onClick={() => toggleFilter(filter.id)}
            />
          ))}
        </div>

        {/* Buyer cards */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredBuyers.map((buyer) => {
              const revealed = isRevealed(buyer.id)
              return (
                <motion.div
                  key={buyer.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className={revealed ? 'border-eigen-green border-2' : ''}>
                    {/* Top row: score + type */}
                    <div className="flex items-start justify-between mb-3">
                      <ScoreBadge score={buyer.matchScore} />
                      <Badge color={TYPE_COLORS[buyer.type]}>{buyer.type}</Badge>
                    </div>

                    {/* Pre-qualification */}
                    <div className="mb-2">
                      {buyer.prequalified ? (
                        <span className="text-xs font-medium text-eigen-green flex items-center gap-1">
                          <Check size={12} /> Pre-qualified
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Unverified</span>
                      )}
                    </div>

                    {/* Buyer info */}
                    <div className="flex items-center gap-2 mb-2">
                      <UserCircle size={20} className="text-gray-300" />
                      <span className="text-sm font-semibold text-eigen-navy">
                        {revealed ? buyer.revealedName : `Buyer in ${buyer.areaPreference}`}
                      </span>
                    </div>

                    {revealed && buyer.mortgageApproval && (
                      <div className="mb-2 bg-green-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500">Mortgage pre-approval</p>
                        <p className="text-sm font-bold text-eigen-green">{formatCurrency(buyer.mortgageApproval)}</p>
                      </div>
                    )}

                    <p className="text-sm text-gray-600 mb-1">{buyer.criteria}</p>
                    <p className="text-xs text-gray-400 mb-3">Budget: {buyer.budget} · Looking for {buyer.lookingFor}</p>

                    {/* Reveal / Contact button */}
                    {revealed ? (
                      <Button variant="success" fullWidth className="text-sm h-10">
                        <div className="flex items-center justify-center gap-1"><Check size={14} /> Contact {buyer.revealedName.split(' ')[0]}</div>
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          fullWidth
                          className="text-sm h-10"
                          disabled={revealLoading === buyer.id}
                          onClick={() => handleReveal(buyer.id)}
                        >
                          {revealLoading === buyer.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Revealing...
                            </div>
                          ) : (
                            'Reveal This Buyer'
                          )}
                        </Button>
                        <button
                          onClick={() => setShowTooltip(showTooltip === buyer.id ? null : buyer.id)}
                          className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 shrink-0"
                        >
                          <Info size={16} className="text-gray-400" />
                        </button>
                      </div>
                    )}

                    {/* Tooltip */}
                    <AnimatePresence>
                      {showTooltip === buyer.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-500"
                        >
                          When you reveal a buyer, they receive a notification that you're interested.
                          You'll see their full name, contact preference, and mortgage pre-approval amount.
                          They'll see your listing details.
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {filteredBuyers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p>No buyers match your filters</p>
            </div>
          )}
        </div>

        {/* Pro Upgrade Banner */}
        {!isPro && (
          <Card className="mt-6 bg-purple-50 border-eigen-purple/20">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={16} className="text-eigen-purple" />
              <h3 className="font-semibold text-eigen-navy">Unlock More Buyers</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
              <div>
                <p className="font-semibold text-gray-600 mb-1">Free</p>
                <p className="text-gray-400">1 reveal/month</p>
                <p className="text-gray-400">See match scores</p>
              </div>
              <div>
                <p className="font-semibold text-eigen-purple mb-1">Pro — €49/month</p>
                <p className="text-gray-600">Unlimited reveals</p>
                <p className="text-gray-600">See mortgage amounts</p>
                <p className="text-gray-600">Priority matching</p>
              </div>
            </div>
            <Button
              variant="outline"
              fullWidth
              className="border-eigen-purple text-eigen-purple text-sm"
              onClick={() => setShowPaywall(true)}
            >
              <div className="flex items-center justify-center gap-1">
                <Sparkles size={14} /> Upgrade to Pro — €49/month
              </div>
            </Button>
          </Card>
        )}
      </div>

      {/* Pro Paywall Modal */}
      <Modal open={showPaywall} onClose={() => setShowPaywall(false)} title="Upgrade to EIGEN Pro">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-eigen-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Star size={28} className="text-eigen-purple" />
          </div>
          <h3 className="text-lg font-bold text-eigen-navy mb-1">Unlock All Buyers</h3>
          <p className="text-sm text-gray-500">Get unlimited reveals and priority matching</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-semibold text-gray-600 mb-2">Free</p>
            <ul className="space-y-1 text-xs text-gray-400">
              <li>1 reveal/month</li>
              <li>See match scores</li>
              <li>Basic buyer info</li>
            </ul>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 border border-eigen-purple/20">
            <p className="font-semibold text-eigen-purple mb-2">Pro — €49/mo</p>
            <ul className="space-y-1 text-xs text-gray-600">
              <li>✓ Unlimited reveals</li>
              <li>✓ Priority matching</li>
              <li>✓ See mortgage amounts</li>
              <li>✓ Direct contact</li>
            </ul>
          </div>
        </div>

        <Button variant="primary" fullWidth className="bg-eigen-purple hover:bg-purple-700" onClick={() => { setIsPro(true); setShowPaywall(false) }}>
          Upgrade to Pro
        </Button>
        <button className="w-full text-center text-sm text-gray-400 mt-3 py-2" onClick={() => setShowPaywall(false)}>
          Maybe later
        </button>
      </Modal>

      <BottomCTA>
        <Button variant="outline" fullWidth onClick={() => navigate('/sell/dashboard')}>
          Back to Dashboard
        </Button>
      </BottomCTA>
    </AppShell>
  )
}

import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TrendingUp, AlertTriangle, Check, Send, PartyPopper } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import AIBubble from '../../components/ai/AIBubble'
import useBuyerStore from '../../stores/buyerStore'
import { getPropertyById } from '../../data/mockProperties'
import { formatCurrency } from '../../utils/formatCurrency'
import { useTranslation } from '../../i18n'

const RISK_COLORS = { financing: 'amber', inspection: 'amber', nhg: 'green', sale: 'red' }
const RISK_LEVELS = { financing: 'medium', inspection: 'medium', nhg: 'low', sale: 'high' }

function interpolate(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? String(vars[k]) : `{${k}}`)
}

export default function B5Bid() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { placeBid } = useBuyerStore()

  const property = useMemo(() => getPropertyById(id), [id])
  const conditionList = t('b5.conditionList')

  const [bidAmount, setBidAmount] = useState('')
  const [selectedConditions, setSelectedConditions] = useState(['financing'])
  const [message, setMessage] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  if (!property) {
    return (
      <AppShell title={t('b5.title')} flow="buy">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <p className="text-gray-500">{t('b4.notFound')}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/buy/results')}>{t('b2.backToSearch')}</Button>
        </div>
      </AppShell>
    )
  }

  const parsedBid = parseInt(String(bidAmount).replace(/\D/g, ''), 10) || 0
  const suggestedBid = Math.round(property.askingPrice * (1 + property.overbidPercentage / 100) / 5000) * 5000
  const bidDiffPercent = parsedBid > 0 ? (((parsedBid - property.askingPrice) / property.askingPrice) * 100).toFixed(1) : null
  const isUnconditional = selectedConditions.length === 0

  const toggleCondition = (condId) => {
    setSelectedConditions((prev) =>
      prev.includes(condId) ? prev.filter((c) => c !== condId) : [...prev, condId]
    )
  }

  const handleSubmit = () => {
    setSubmitting(true)
    setTimeout(() => {
      placeBid({
        propertyId: property.id,
        amount: parsedBid,
        conditions: selectedConditions.map((c) => conditionList.find((x) => x.id === c)?.label).filter(Boolean),
        message,
        timestamp: new Date().toISOString(),
      })
      setSubmitting(false)
      setSubmitted(true)
      setShowReview(false)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }, 2000)
  }

  const getBidStrength = () => {
    if (parsedBid <= 0) return null
    const pct = (parsedBid / property.askingPrice) * 100
    if (pct >= 105 && isUnconditional) return { ...t('b5.strengths.veryStrong'), color: 'green' }
    if (pct >= 103) return { ...t('b5.strengths.strong'), color: 'green' }
    if (pct >= 100) return { ...t('b5.strengths.competitive'), color: 'amber' }
    if (pct >= 95) return { ...t('b5.strengths.belowAsk'), color: 'amber' }
    return { ...t('b5.strengths.low'), color: 'red' }
  }

  const strength = getBidStrength()
  const riskLabelFor = (risk) => risk === 'low' ? t('b5.riskLow') : risk === 'medium' ? t('b5.riskMedium') : t('b5.riskHigh')

  const advisorBody = interpolate(t('b5.bidAdvisorBody'), {
    pct: property.overbidPercentage,
    area: property.neighbourhood || property.city,
    suggested: formatCurrency(suggestedBid),
  })
  const advisorContext = property.daysOnMarket > 20
    ? interpolate(t('b5.bidAdvisorStale'), { days: property.daysOnMarket })
    : interpolate(t('b5.bidAdvisorFresh'), { days: property.daysOnMarket })

  return (
    <AppShell title={t('b5.title')} flow="buy">
      <div className="px-4 pt-4 pb-32">
        {submitted ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <PartyPopper size={56} className="text-eigen-green mx-auto mb-4" />
            </motion.div>
            <h2 className="text-2xl font-bold text-eigen-navy mb-2">{t('b5.bidSubmitted')}</h2>
            <p className="text-gray-500 mb-1">{t('b5.bidOn', { amount: formatCurrency(parsedBid), address: `${property.street} ${property.number}` })}</p>
            <p className="text-sm text-gray-400 mb-6">{t('b5.sellerResponse')}</p>

            <Card className="mb-4 bg-purple-50 border-eigen-purple/20 text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-eigen-purple animate-pulse" />
                <span className="text-xs font-semibold text-eigen-purple uppercase">{t('b5.nextStepsLabel')}</span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>{t('b5.nextStep1')}</p>
                <p>{t('b5.nextStep2')}</p>
                <p>{t('b5.nextStep3')}</p>
                <p>{t('b5.nextStep4')}</p>
              </div>
            </Card>

            <Button variant="buyer" fullWidth onClick={() => navigate('/buy/results')}>
              {t('b5.browseMore')}
            </Button>
            <button className="w-full text-center text-sm text-gray-400 mt-3 py-2" onClick={() => navigate(`/buy/property/${property.id}`)}>
              {t('b5.backToProperty')}
            </button>
          </motion.div>
        ) : (
          <>
            {/* Property summary */}
            <Card className="mb-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-eigen-navy">{property.street} {property.number}, {property.city}</p>
                  <p className="text-sm text-gray-500">{property.type} · {property.area}m² · {property.bedrooms} {t('b1.bed')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{t('b5.asking')}</p>
                  <p className="font-bold text-eigen-navy">{formatCurrency(property.askingPrice)}</p>
                </div>
              </div>
            </Card>

            {/* AI Suggestion */}
            <AIBubble title={t('b5.bidAdvisor')} className="mb-4">
              <span dangerouslySetInnerHTML={{ __html: advisorBody + advisorContext }} />
            </AIBubble>

            {/* Bid Amount */}
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('b5.yourBid')}</h3>
            <div className="mb-2">
              <Input
                label={t('b5.bidAmount')}
                value={parsedBid > 0 ? formatCurrency(parsedBid) : ''}
                onChange={(e) => setBidAmount(e.target.value.replace(/\D/g, ''))}
                placeholder={formatCurrency(suggestedBid)}
              />
            </div>

            {/* Quick amount buttons */}
            <div className="flex gap-2 mb-3">
              {[property.askingPrice, suggestedBid, Math.round(property.askingPrice * 1.05 / 5000) * 5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBidAmount(String(amt))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                    parsedBid === amt ? 'bg-eigen-blue text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {formatCurrency(amt)}
                </button>
              ))}
            </div>

            {/* Bid strength indicator */}
            {strength && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
                <Card className={`border-l-4 ${
                  strength.color === 'green' ? 'border-eigen-green bg-green-50' :
                  strength.color === 'amber' ? 'border-eigen-amber bg-amber-50' :
                  'border-eigen-red bg-red-50'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-eigen-navy">{t('b5.strengthLabel')}: {strength.label}</span>
                    <Badge color={strength.color}>
                      {bidDiffPercent > 0 ? '+' : ''}{bidDiffPercent}%
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{strength.desc}</p>
                </Card>
              </motion.div>
            )}

            {/* Conditions */}
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('b5.conditions')}</h3>
            <div className="space-y-2 mb-4">
              {conditionList.map((cond) => {
                const isActive = selectedConditions.includes(cond.id)
                const riskLevel = RISK_LEVELS[cond.id] || 'medium'
                const color = RISK_COLORS[cond.id] || 'amber'
                return (
                  <button
                    key={cond.id}
                    onClick={() => toggleCondition(cond.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors ${
                      isActive
                        ? 'bg-eigen-blue/10 border border-eigen-blue/30'
                        : 'bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-eigen-blue' : 'bg-gray-200'
                    }`}>
                      {isActive && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">{cond.label}</p>
                      <p className="text-xs text-gray-400">{cond.desc}</p>
                    </div>
                    <Badge color={color} className="shrink-0">{riskLabelFor(riskLevel)}</Badge>
                  </button>
                )
              })}
            </div>

            {isUnconditional && (
              <Card className="mb-4 border-l-4 border-eigen-green bg-green-50">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-eigen-green" />
                  <div>
                    <p className="text-sm font-semibold text-eigen-green">{t('b5.unconditional')}</p>
                    <p className="text-xs text-gray-600">{t('b5.unconditionalDesc')}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Message */}
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('b5.messageTitle')}</h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              placeholder={t('b5.messagePlaceholder')}
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-eigen-blue mb-1"
            />
            <p className="text-xs text-gray-400 text-right mb-4">{message.length}/500</p>
          </>
        )}
      </div>

      {/* Review Modal */}
      <Modal open={showReview} onClose={() => !submitting && setShowReview(false)} title={t('b5.reviewTitle')}>
        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('b5.property')}</span>
            <span className="font-medium text-eigen-navy">{property.street} {property.number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('b5.askingPrice')}</span>
            <span className="text-gray-700">{formatCurrency(property.askingPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('b5.yourBidLabel')}</span>
            <span className="font-bold text-eigen-navy text-lg">{formatCurrency(parsedBid)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('b5.conditionsLabel')}</span>
            <span className="text-gray-700 text-right">
              {selectedConditions.length === 0
                ? t('b5.none')
                : selectedConditions.map((c) => conditionList.find((x) => x.id === c)?.label).join(', ')}
            </span>
          </div>
        </div>

        {message && (
          <Card className="bg-gray-50 mb-4">
            <p className="text-xs text-gray-400 mb-1">{t('b5.yourMessage')}</p>
            <p className="text-sm text-gray-700">{message}</p>
          </Card>
        )}

        <div className="bg-amber-50 rounded-xl p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-eigen-amber shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600">
              {t('b5.disclaimer')}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setShowReview(false)} disabled={submitting}>
            {t('b5.goBack')}
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('b5.submitting')}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1">
                <Send size={14} /> {t('b5.submitBid')}
              </div>
            )}
          </Button>
        </div>
      </Modal>

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
          {Array.from({ length: 25 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: ['#FF6B35', '#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B'][i % 5],
                left: `${10 + Math.random() * 80}%`,
                top: -10,
              }}
              initial={{ y: -10, rotate: 0, opacity: 1 }}
              animate={{ y: window.innerHeight + 50, rotate: 360, opacity: 0 }}
              transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.5, ease: 'easeIn' }}
            />
          ))}
        </div>
      )}

      {!submitted && (
        <BottomCTA>
          <Button
            variant="primary"
            fullWidth
            disabled={parsedBid <= 0}
            onClick={() => setShowReview(true)}
          >
            {parsedBid > 0 ? t('b5.reviewBid', { amount: formatCurrency(parsedBid) }) : t('b5.enterBid')}
          </Button>
        </BottomCTA>
      )}
    </AppShell>
  )
}

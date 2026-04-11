import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Wand2, RotateCcw, ChevronRight, Sparkles, TrendingUp, Clock, Percent } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Toggle from '../../components/ui/Toggle'
import AITyping from '../../components/ai/AITyping'
import AIBubble from '../../components/ai/AIBubble'
import useSellerStore from '../../stores/sellerStore'
import useAnimateNumber from '../../hooks/useAnimateNumber'
import { formatCurrency } from '../../utils/formatCurrency'
import { getNeighbourhoodByCity } from '../../data/mockNeighbourhood'

function generateListingText(data) {
  const { street, number, city, type, m2, bedrooms, bathrooms, buildYear, energyLabel, features } = data
  return `Stunning ${type || 'home'} on the ${street || 'street'} ${number || ''} in the heart of ${city || 'Amsterdam'}. This beautifully maintained ${bedrooms || 2}-bedroom home offers ${m2 || 85}m² of living space with ${bathrooms || 1} bathroom${(bathrooms || 1) > 1 ? 's' : ''}. Built in ${buildYear || 1920}, the property seamlessly blends period character with modern comfort. The spacious living room floods with natural light, while the recently updated kitchen features high-end appliances. Located in one of ${city || 'Amsterdam'}'s most sought-after neighbourhoods, you're minutes from shops, restaurants, and public transport. Energy label ${energyLabel || 'C'}. ${features ? features : ''}Don't miss this rare opportunity.`
}

const ALTERNATIVES = [
  {
    id: 'factual',
    title: 'Factual',
    desc: 'Clear, data-driven description',
    generate: (data) =>
      `${data.type || 'Property'} at ${data.street || ''} ${data.number || ''}, ${data.city || ''}. ${data.m2 || 85}m² living space, ${data.bedrooms || 2} bedrooms, ${data.bathrooms || 1} bathroom. Built ${data.buildYear || 1920}. Energy label ${data.energyLabel || 'C'}. Well-maintained condition. Convenient location with excellent transport links. Available for viewings immediately.`,
  },
  {
    id: 'storytelling',
    title: 'Storytelling',
    desc: 'Warm, emotional narrative',
    generate: (data) =>
      `Imagine coming home to ${data.street || 'your own street'} ${data.number || ''} — where the warmth of ${data.buildYear || 1920}s architecture meets the buzz of modern ${data.city || 'city'} life. Step through the front door into ${data.m2 || 85}m² of space that's been lovingly maintained. The living room catches the morning light; the ${data.bedrooms || 2} bedrooms offer peaceful retreats at the end of the day. The neighbourhood hums with cafés, parks, and that unmistakable Dutch gezelligheid. This isn't just a house — it's the start of your next chapter.`,
  },
  {
    id: 'premium',
    title: 'Premium',
    desc: 'Luxury positioning',
    generate: (data) =>
      `An exceptional opportunity to acquire a distinguished ${data.type || 'property'} in the prestigious ${data.street || 'street'} corridor of ${data.city || 'Amsterdam'}. This ${data.m2 || 85}m² residence, dating to ${data.buildYear || 1920}, has been meticulously curated to offer discerning buyers the perfect blend of heritage and contemporary luxury. Featuring ${data.bedrooms || 2} generously proportioned bedrooms, premium finishes throughout, and an enviable ${data.city || 'Amsterdam'} address. Viewing by appointment. Energy label ${data.energyLabel || 'C'}.`,
  },
]

const SCORE_FACTORS = [
  { text: 'Mentions neighbourhood', points: 5, positive: true },
  { text: 'Emotional appeal language', points: 4, positive: true },
  { text: 'Property specs complete', points: 5, positive: true },
  { text: 'Call-to-action present', points: 3, positive: true },
  { text: 'Missing: energy label detail', points: -3, positive: false, fix: 'Energy label C — room for improvement with insulation upgrades that could significantly reduce energy costs.' },
  { text: 'No mention of nearby schools', points: -3, positive: false, fix: 'Excellent schools in the area including international options within walking distance.' },
]

// Round to nearest €5.000
function roundToNearest5k(val) {
  return Math.round(val / 5000) * 5000
}

function PriceAdvisorSlider({ address, valuation }) {
  const { priceSliderValue, setPriceSliderValue, setSuggestedPrice, setListing } = useSellerStore()
  const neighbourhood = useMemo(() => getNeighbourhoodByCity(address?.city), [address?.city])
  const baseEstimate = valuation?.estimate || 425000

  // Calculate derived values from slider position
  const sliderPct = priceSliderValue / 100 // 0..1
  // price range: 95% at far left to 108% at far right
  const priceMultiplier = 0.95 + sliderPct * 0.13
  const suggestedPrice = roundToNearest5k(baseEstimate * priceMultiplier)
  const estimatedDays = Math.round(14 + sliderPct * 76) // 14 days (fast) to 90 days (max)
  const avgOverbid = neighbourhood?.overbidHistory?.[0]?.percentage || 4.0
  // overbid chance decreases as price goes up
  const estimatedOverbid = Math.max(0, (avgOverbid * (1.3 - sliderPct * 0.8))).toFixed(1)

  // Update store when price changes
  useEffect(() => {
    setSuggestedPrice(suggestedPrice)
    setListing({ askingPrice: suggestedPrice })
  }, [suggestedPrice])

  const animatedPrice = useAnimateNumber(suggestedPrice, 400)

  // AI explanation based on slider position
  const getAIExplanation = () => {
    if (sliderPct < 0.3) {
      return `At ${formatCurrency(suggestedPrice)}, you're pricing below market to attract a quick sale. Based on ${neighbourhood?.name || 'your area'} data, homes priced 3-5% under market sell within 2-3 weeks with multiple bids. Average overbidding in your area is ${avgOverbid}%, so you may still end up above market value.`
    } else if (sliderPct < 0.7) {
      return `${formatCurrency(suggestedPrice)} is a balanced price point. You'll attract serious buyers while leaving room for negotiation. In ${neighbourhood?.name || 'your area'}, properties at market value typically sell within 4-6 weeks with an average overbid of ${avgOverbid}%.`
    } else {
      return `At ${formatCurrency(suggestedPrice)}, you're positioning above market. This may take longer but maximizes your return. Be prepared for fewer viewings initially — in ${neighbourhood?.name || 'your area'}, premium-priced homes average 8-12 weeks on market but attract more committed buyers.`
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-eigen-purple/10 rounded-lg flex items-center justify-center">
          <Sparkles size={16} className="text-eigen-purple" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-eigen-navy">AI Price Advisor</h3>
          <p className="text-[11px] text-gray-400">Adjust the slider to explore pricing strategies</p>
        </div>
      </div>

      {/* Suggested price — prominent */}
      <div className="bg-gradient-to-r from-eigen-navy to-[#1E4D7B] rounded-2xl p-5 text-center text-white mb-4">
        <p className="text-xs uppercase tracking-wider text-white/60 mb-1">Suggested Asking Price</p>
        <p className="text-3xl font-bold">{formatCurrency(animatedPrice)}</p>
      </div>

      {/* Slider */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max="100"
          value={priceSliderValue}
          onChange={(e) => setPriceSliderValue(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-eigen-purple"
        />
        <div className="flex justify-between text-xs mt-1">
          <span className="text-eigen-blue font-medium">Sell Fast</span>
          <span className="text-eigen-orange font-medium">Maximize Price</span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <Clock size={14} className="text-gray-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-eigen-navy">{estimatedDays}d</p>
          <p className="text-[10px] text-gray-400">Est. time to sell</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <Percent size={14} className="text-gray-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-eigen-navy">{estimatedOverbid}%</p>
          <p className="text-[10px] text-gray-400">Est. overbid</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <TrendingUp size={14} className="text-gray-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-eigen-navy">{neighbourhood?.priceChange12m || 5}%</p>
          <p className="text-[10px] text-gray-400">Area growth (12m)</p>
        </div>
      </div>

      {/* AI explanation bubble */}
      <AIBubble title="Price insight">
        {getAIExplanation()}
      </AIBubble>
    </div>
  )
}

export default function S3Listing() {
  const navigate = useNavigate()
  const { address, valuation, listing, setListing, listingGenerated, setListingGenerated } = useSellerStore()

  const [editMode, setEditMode] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [typingDone, setTypingDone] = useState(listingGenerated)
  const [showScore, setShowScore] = useState(false)
  const [score, setScore] = useState(listing.seoScore || 94)
  const [fixedFactors, setFixedFactors] = useState([])
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [loadingAlts, setLoadingAlts] = useState(false)
  const animatedScore = useAnimateNumber(score, 600)
  const debounceRef = useRef(null)

  // Form state derived from store (no asking price here)
  const form = {
    m2: listing.m2 || address?.m2Living || '',
    bedrooms: listing.bedrooms || 2,
    bathrooms: listing.bathrooms || 1,
    energyLabel: listing.energyLabel || address?.energyLabel || 'C',
    buildYear: listing.buildYear || address?.buildYear || '',
    features: listing.features || '',
  }

  const updateForm = (key, value) => {
    setListing({ [key]: value })
    clearTimeout(debounceRef.current)
    if (!listingGenerated) {
      debounceRef.current = setTimeout(() => triggerGeneration(), 1000)
    }
  }

  const triggerGeneration = useCallback(() => {
    if (generating) return
    setGenerating(true)
    setTypingDone(false)
    const data = {
      street: address?.street,
      number: address?.number,
      city: address?.city,
      type: address?.type,
      ...form,
    }
    const text = generateListingText(data)
    setTimeout(() => {
      setListing({ description: text })
      setGenerating(false)
      setListingGenerated(true)
    }, 2000)
  }, [address, form, generating])

  const handleRegenerate = () => {
    setTypingDone(false)
    setGenerating(true)
    setTimeout(() => {
      const data = { street: address?.street, number: address?.number, city: address?.city, type: address?.type, ...form }
      setListing({ description: generateListingText(data) + ' Ideal for young professionals and growing families alike.' })
      setGenerating(false)
      setListingGenerated(true)
    }, 2000)
  }

  const handleAutoFix = (factorIndex) => {
    const factor = SCORE_FACTORS[factorIndex]
    if (!factor.fix || fixedFactors.includes(factorIndex)) return
    setFixedFactors((prev) => [...prev, factorIndex])
    setScore((s) => s + Math.abs(factor.points))
    setListing({ description: (listing.description || '') + ' ' + factor.fix })
  }

  const handleSelectAlternative = (alt) => {
    setTypingDone(false)
    const data = { street: address?.street, number: address?.number, city: address?.city, type: address?.type, ...form }
    setListing({ description: alt.generate(data), selectedVersion: alt.id })
    setListingGenerated(true)
    setShowAlternatives(false)
  }

  const handleShowAlternatives = () => {
    setLoadingAlts(true)
    setTimeout(() => {
      setLoadingAlts(false)
      setShowAlternatives(true)
    }, 1500)
  }

  // Auto-trigger generation when form has minimum data
  useEffect(() => {
    if (!listingGenerated && form.m2 && !generating) {
      debounceRef.current = setTimeout(() => triggerGeneration(), 1000)
      return () => clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <AppShell title="Listing & Price Advice" step={3} totalSteps={8} flow="sell">
      <div className="px-4 pt-4 pb-32">
        {/* Property Details Form */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Property Details</h3>
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Living Area"
              type="number"
              value={form.m2}
              onChange={(e) => updateForm('m2', Number(e.target.value))}
              placeholder="85 m²"
            />
            <Input
              label="Bedrooms"
              type="number"
              value={form.bedrooms}
              onChange={(e) => updateForm('bedrooms', Number(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Bathrooms"
              type="number"
              value={form.bathrooms}
              onChange={(e) => updateForm('bathrooms', Number(e.target.value))}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Energy Label</label>
              <select
                value={form.energyLabel}
                onChange={(e) => updateForm('energyLabel', e.target.value)}
                className="h-12 px-4 rounded-lg border border-gray-300 text-base bg-white focus:outline-none focus:ring-2 focus:ring-eigen-blue"
              >
                {['A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <Input
            label="Build Year"
            type="number"
            value={form.buildYear}
            onChange={(e) => updateForm('buildYear', Number(e.target.value))}
            placeholder="1920"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Unique Features</label>
            <textarea
              value={form.features}
              onChange={(e) => updateForm('features', e.target.value.slice(0, 400))}
              placeholder="Describe unique features of your home..."
              rows={4}
              maxLength={400}
              className="px-4 py-3 rounded-lg border border-gray-300 text-base resize-none focus:outline-none focus:ring-2 focus:ring-eigen-blue"
            />
            <span className="text-xs text-gray-400 text-right">{(form.features || '').length} / 400</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 mb-4" />

        {/* AI-Generated Listing */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">AI-Generated Listing</h3>
          {listingGenerated && <Toggle enabled={editMode} onToggle={() => setEditMode(!editMode)} label="Edit" />}
        </div>

        {generating && !listing.description && (
          <Card className="mb-4">
            <div className="flex items-center gap-3 py-4">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-eigen-purple rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Generating your listing...</span>
            </div>
          </Card>
        )}

        {listing.description && (
          <Card className="mb-4">
            {editMode ? (
              <textarea
                value={listing.description}
                onChange={(e) => setListing({ description: e.target.value })}
                rows={8}
                className="w-full text-sm leading-relaxed text-gray-700 resize-none outline-none"
              />
            ) : typingDone ? (
              <p className="text-sm leading-relaxed text-gray-700">{listing.description}</p>
            ) : (
              <AITyping
                text={listing.description}
                speed={30}
                onComplete={() => setTypingDone(true)}
              />
            )}

            {listingGenerated && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <Button variant="outline" className="text-xs h-9 px-3" onClick={handleRegenerate}>
                  <div className="flex items-center gap-1"><Wand2 size={12} /> Regenerate</div>
                </Button>
                {editMode && (
                  <Button variant="outline" className="text-xs h-9 px-3" onClick={() => { setEditMode(false) }}>
                    <div className="flex items-center gap-1"><RotateCcw size={12} /> Done</div>
                  </Button>
                )}
              </div>
            )}
          </Card>
        )}

        {/* SEO/Quality Score */}
        {listingGenerated && typingDone && (
          <>
            <button
              onClick={() => setShowScore(!showScore)}
              className="flex items-center gap-2 mb-3"
            >
              <motion.span
                className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold text-white ${
                  score >= 90 ? 'bg-eigen-green' : score >= 70 ? 'bg-eigen-amber' : 'bg-eigen-red'
                }`}
                key={score}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {animatedScore}
              </motion.span>
              <div className="text-left">
                <p className="text-sm font-semibold text-eigen-navy">Quality Score</p>
                <p className="text-xs text-gray-400">Tap to see breakdown</p>
              </div>
              <ChevronRight size={16} className={`text-gray-400 ml-auto transition-transform ${showScore ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
              {showScore && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <Card className="mb-4">
                    <div className="space-y-2">
                      {SCORE_FACTORS.map((factor, i) => {
                        const isFixed = fixedFactors.includes(i)
                        const isPositive = factor.positive || isFixed
                        return (
                          <div key={i} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                              {isPositive ? (
                                <CheckCircle size={14} className="text-eigen-green" />
                              ) : (
                                <XCircle size={14} className="text-eigen-red" />
                              )}
                              <span className={`text-sm ${isPositive ? 'text-gray-700' : 'text-eigen-red'}`}>
                                {isFixed ? factor.text.replace('Missing: ', '') : factor.text}: {isPositive ? '+' : ''}{isFixed ? Math.abs(factor.points) : factor.points}
                              </span>
                            </div>
                            {!factor.positive && !isFixed && (
                              <button
                                onClick={() => handleAutoFix(i)}
                                className="text-xs font-medium text-eigen-blue hover:underline"
                              >
                                Auto-fix
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Alternative versions — vertical rows instead of horizontal scroll */}
            {!showAlternatives && (
              <Button
                variant="outline"
                fullWidth
                className="mb-4"
                disabled={loadingAlts}
                onClick={handleShowAlternatives}
              >
                {loadingAlts ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-eigen-navy rounded-full animate-spin" />
                    Generating alternatives...
                  </div>
                ) : (
                  'Show 3 Alternatives'
                )}
              </Button>
            )}

            <AnimatePresence>
              {showAlternatives && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 mb-4"
                >
                  {ALTERNATIVES.map((alt) => {
                    const data = { street: address?.street, number: address?.number, city: address?.city, type: address?.type, ...form }
                    const preview = alt.generate(data).slice(0, 120) + '...'
                    return (
                      <Card
                        key={alt.id}
                        className={listing.selectedVersion === alt.id ? 'border-eigen-orange border-2' : ''}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-xs font-medium text-gray-600 rounded-full">
                              {alt.title}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">{alt.desc}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed mb-3">{preview}</p>
                        <Button
                          variant={listing.selectedVersion === alt.id ? 'primary' : 'outline'}
                          fullWidth
                          className="text-xs h-9"
                          onClick={() => handleSelectAlternative(alt)}
                        >
                          {listing.selectedVersion === alt.id ? 'Selected' : 'Use This Version'}
                        </Button>
                      </Card>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Divider before price advisor */}
        {listingGenerated && typingDone && (
          <>
            <div className="border-t border-gray-200 my-6" />
            <PriceAdvisorSlider address={address} valuation={valuation} />
          </>
        )}
      </div>

      <BottomCTA>
        <Button variant="primary" fullWidth onClick={() => navigate('/sell/pricing')}>
          Continue to Package Selection →
        </Button>
      </BottomCTA>
    </AppShell>
  )
}

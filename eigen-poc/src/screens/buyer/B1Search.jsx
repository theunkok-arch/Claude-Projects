import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Sparkles, MapPin, Home, Banknote, BedDouble, Send, ArrowRight, RotateCcw } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Chip from '../../components/ui/Chip'
import useBuyerStore from '../../stores/buyerStore'
import mockProperties from '../../data/mockProperties'
import { applyFiltersWithFallback } from '../../utils/filterProperties'
import { useTranslation } from '../../i18n'
import { formatCurrency } from '../../utils/formatCurrency'

const CITY_OPTIONS = ['Amsterdam', 'Rotterdam', 'Utrecht', 'Den Haag', 'Maastricht', 'Groningen', 'Bilthoven']
const TYPE_OPTIONS = ['Appartement', 'Tussenwoning', 'Herenhuis', 'Villa', 'Twee-onder-een-kap']
const PRICE_STOPS = [null, 200000, 300000, 400000, 500000, 600000, 750000, 900000, 1100000, 1300000, 1500000, 2000000]
const BEDROOM_OPTIONS = [1, 2, 3, 4, 5]

function parseSearchQuery(query) {
  const q = query.toLowerCase()
  const filters = { cities: [], propertyTypes: [] }
  const cityMap = {
    amsterdam: 'Amsterdam', rotterdam: 'Rotterdam', utrecht: 'Utrecht',
    bilthoven: 'Bilthoven', 'de bilt': 'Bilthoven', zeist: 'Utrecht',
    'den haag': 'Den Haag', hague: 'Den Haag',
    maastricht: 'Maastricht', groningen: 'Groningen',
  }
  for (const [key, val] of Object.entries(cityMap)) {
    if (q.includes(key) && !filters.cities.includes(val)) filters.cities.push(val)
  }
  const priceMatch = q.match(/(?:under|below|max|tot|onder|€)\s*€?\s*(\d[\d.,]*)\s*(k|m|000)?/i)
  if (priceMatch) {
    let price = parseFloat(priceMatch[1].replace(/[.,]/g, ''))
    if (priceMatch[2] === 'k' || priceMatch[2] === '000') price *= 1000
    if (priceMatch[2] === 'm') price *= 1000000
    if (price < 10000) price *= 1000
    filters.maxPrice = price
  }
  const brMatch = q.match(/(\d)\s*(?:-|\s)?(?:bedroom|bed|kamer|slaapkamer|br)/i)
  if (brMatch) filters.minBedrooms = parseInt(brMatch[1])
  const typeMap = {
    apartment: 'Appartement', appartement: 'Appartement',
    villa: 'Villa',
    herenhuis: 'Herenhuis',
    'twee-onder-een-kap': 'Twee-onder-een-kap',
    tussenwoning: 'Tussenwoning',
  }
  for (const [key, val] of Object.entries(typeMap)) {
    if (q.includes(key) && !filters.propertyTypes.includes(val)) filters.propertyTypes.push(val)
  }
  // "house" and "huis" (but not "family home") → Tussenwoning
  if (filters.propertyTypes.length === 0 && /\b(house|huis)\b/.test(q) && !q.includes('family home')) {
    filters.propertyTypes.push('Tussenwoning')
  }
  // "starter" → Appartement
  if (filters.propertyTypes.length === 0 && q.includes('starter')) {
    filters.propertyTypes.push('Appartement')
  }
  // "family home" / "gezinswoning" intentionally does NOT set a type — lets all family-sized homes through
  return filters
}

function ChatMessage({ role, children }) {
  if (role === 'ai') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 mb-3">
        <div className="w-8 h-8 bg-eigen-purple/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={14} className="text-eigen-purple" />
        </div>
        <div className="flex-1 bg-purple-50 border border-eigen-purple/20 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700 leading-relaxed">
          {children}
        </div>
      </motion.div>
    )
  }
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end mb-3">
      <div className="bg-eigen-blue text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[80%]">
        {children}
      </div>
    </motion.div>
  )
}

function toggleInArray(arr, val) {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

function priceLabel(value, fallback) {
  return value == null ? fallback : formatCurrency(value)
}

export default function B1Search() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { searchQuery, searchFilters, setSearchQuery, setSearchFilters, resetFilters } = useBuyerStore()
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [processing, setProcessing] = useState(false)
  const [filtersReady, setFiltersReady] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const inputRef = useRef(null)
  const scrollRef = useRef(null)
  const [localFilters, setLocalFilters] = useState({
    cities: searchFilters.cities || [],
    minPrice: searchFilters.minPrice ?? null,
    maxPrice: searchFilters.maxPrice ?? null,
    minBedrooms: searchFilters.minBedrooms ?? null,
    propertyTypes: searchFilters.propertyTypes || [],
  })

  const quickSearches = t('b1.quickSearches')

  useEffect(() => {
    setMessages([{ role: 'ai', text: t('b1.greeting') }])
  }, [t])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Live hit count against current local filters (with fallback so it never says 0)
  const previewCount = useMemo(() => {
    const { results } = applyFiltersWithFallback(mockProperties, localFilters)
    return results.length
  }, [localFilters])

  const handleSubmit = (text) => {
    const searchText = text || query
    if (!searchText.trim()) return
    setMessages((prev) => [...prev, { role: 'user', text: searchText }])
    setQuery('')
    setProcessing(true)
    const parsed = parseSearchQuery(searchText)
    // Merge: add parsed cities/types to existing, overwrite price/bedrooms if specified
    const newFilters = {
      ...localFilters,
      cities: parsed.cities.length ? Array.from(new Set([...localFilters.cities, ...parsed.cities])) : localFilters.cities,
      propertyTypes: parsed.propertyTypes.length ? Array.from(new Set([...localFilters.propertyTypes, ...parsed.propertyTypes])) : localFilters.propertyTypes,
      maxPrice: parsed.maxPrice ?? localFilters.maxPrice,
      minBedrooms: parsed.minBedrooms ?? localFilters.minBedrooms,
    }
    setLocalFilters(newFilters)

    setTimeout(() => {
      const parts = []
      if (parsed.cities.length) parts.push(`in **${parsed.cities.join(', ')}**`)
      if (parsed.maxPrice) parts.push(`under ${formatCurrency(parsed.maxPrice)}`)
      if (parsed.minBedrooms) parts.push(`${parsed.minBedrooms}+ ${t('b1.bed')}`)
      if (parsed.propertyTypes.length) parts.push(`(${parsed.propertyTypes.join(', ')})`)

      const hasAny = parts.length > 0
      const { results } = applyFiltersWithFallback(mockProperties, newFilters)
      const responseText = hasAny
        ? t('b1.aiParseSuccess', { parts: parts.join(' '), count: results.length })
        : t('b1.aiParseEmpty')

      setMessages((prev) => [...prev, { role: 'ai', text: responseText }])
      setProcessing(false)
      if (hasAny) {
        setFiltersReady(true)
        setShowFilters(true)
      }
    }, 1200)
  }

  const toggleCity = (city) => {
    setLocalFilters((p) => ({ ...p, cities: toggleInArray(p.cities, city) }))
    setFiltersReady(true)
  }
  const toggleType = (type) => {
    setLocalFilters((p) => ({ ...p, propertyTypes: toggleInArray(p.propertyTypes, type) }))
    setFiltersReady(true)
  }
  const setBedrooms = (n) => {
    setLocalFilters((p) => ({ ...p, minBedrooms: p.minBedrooms === n ? null : n }))
    setFiltersReady(true)
  }
  const setMinPrice = (v) => {
    setLocalFilters((p) => ({ ...p, minPrice: v, maxPrice: p.maxPrice != null && v != null && p.maxPrice < v ? null : p.maxPrice }))
    setFiltersReady(true)
  }
  const setMaxPrice = (v) => {
    setLocalFilters((p) => ({ ...p, maxPrice: v, minPrice: p.minPrice != null && v != null && p.minPrice > v ? null : p.minPrice }))
    setFiltersReady(true)
  }

  const handleClearFilters = () => {
    const cleared = { cities: [], minPrice: null, maxPrice: null, minBedrooms: null, propertyTypes: [] }
    setLocalFilters(cleared)
    resetFilters()
  }

  const handleFindHomes = () => {
    setSearchQuery(query)
    setSearchFilters(localFilters)
    navigate('/buy/results')
  }

  const activeFilterCount =
    localFilters.cities.length +
    localFilters.propertyTypes.length +
    (localFilters.minPrice != null ? 1 : 0) +
    (localFilters.maxPrice != null ? 1 : 0) +
    (localFilters.minBedrooms != null ? 1 : 0)

  return (
    <AppShell title={t('b1.title')} flow="buy">
      <div className="flex flex-col min-h-[calc(100dvh-120px)]">
        <div className="flex-1 px-4 pt-4 pb-4 overflow-y-auto">
          {messages.length <= 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
              <div className="w-16 h-16 bg-eigen-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search size={28} className="text-eigen-blue" />
              </div>
              <h2 className="text-2xl font-bold text-eigen-navy mb-2">{t('b1.heroTitle')}</h2>
              <p className="text-gray-500 text-sm">{t('b1.heroSubtitle')}</p>
            </motion.div>
          )}

          <div className="space-y-1">
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role}>{msg.text}</ChatMessage>
            ))}
          </div>

          <AnimatePresence>
            {processing && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2 mb-3">
                <div className="w-8 h-8 bg-eigen-purple/10 rounded-full flex items-center justify-center shrink-0">
                  <Sparkles size={14} className="text-eigen-purple" />
                </div>
                <div className="bg-purple-50 border border-eigen-purple/20 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-eigen-purple/40 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-eigen-purple/40 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-2 h-2 bg-eigen-purple/40 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {messages.length <= 1 && !processing && Array.isArray(quickSearches) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">{t('b1.tryThese')}</p>
              <div className="space-y-2">
                {quickSearches.map((qs) => (
                  <button key={qs} onClick={() => handleSubmit(qs)} className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-eigen-blue transition-colors">
                    <Search size={14} className="inline text-gray-400 mr-2" />{qs}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                <Card className="mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('b1.refineTitle')}</h4>
                    {activeFilterCount > 0 && (
                      <button onClick={handleClearFilters} className="flex items-center gap-1 text-xs text-gray-500 hover:text-eigen-red">
                        <RotateCcw size={11} />
                        {t('b1.resetFilters')}
                      </button>
                    )}
                  </div>

                  {/* Cities — multi-select */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><MapPin size={11} /> {t('b1.cities')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CITY_OPTIONS.map((city) => (
                        <Chip key={city} label={city}
                          active={localFilters.cities.includes(city)}
                          onClick={() => toggleCity(city)}
                          className="text-xs px-3 py-1.5" />
                      ))}
                    </div>
                  </div>

                  {/* Budget — min/max range */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><Banknote size={11} /> {t('b1.budget')}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-400 block mb-1">{t('b1.minPrice')}</label>
                        <select
                          value={localFilters.minPrice == null ? '' : String(localFilters.minPrice)}
                          onChange={(e) => setMinPrice(e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full h-10 px-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-eigen-blue"
                        >
                          {PRICE_STOPS.map((v) => (
                            <option key={`min-${v}`} value={v == null ? '' : v}>
                              {priceLabel(v, t('b1.noMin'))}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="text-gray-400 pt-5">—</span>
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-400 block mb-1">{t('b1.maxPrice')}</label>
                        <select
                          value={localFilters.maxPrice == null ? '' : String(localFilters.maxPrice)}
                          onChange={(e) => setMaxPrice(e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full h-10 px-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-eigen-blue"
                        >
                          {PRICE_STOPS.map((v) => (
                            <option key={`max-${v}`} value={v == null ? '' : v}>
                              {priceLabel(v, t('b1.noMax'))}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bedrooms — single select */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><BedDouble size={11} /> {t('b1.bedrooms')}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {BEDROOM_OPTIONS.map((n) => (
                        <Chip key={n} label={`${n}+`}
                          active={localFilters.minBedrooms === n}
                          onClick={() => setBedrooms(n)}
                          className="text-xs px-3 py-1.5" />
                      ))}
                    </div>
                  </div>

                  {/* Type — multi-select */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><Home size={11} /> {t('b1.type')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {TYPE_OPTIONS.map((type) => (
                        <Chip key={type} label={type}
                          active={localFilters.propertyTypes.includes(type)}
                          onClick={() => toggleType(type)}
                          className="text-xs px-3 py-1.5" />
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={scrollRef} />
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
          {filtersReady ? (
            <Button variant="buyer" fullWidth onClick={handleFindHomes}>
              <div className="flex items-center justify-center gap-2">
                <span>{t('b1.showResults')}</span>
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{previewCount} {t('b2.results')}</span>
                <ArrowRight size={16} />
              </div>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={t('b1.placeholder')}
                className="flex-1 h-12 px-4 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-eigen-blue bg-white" />
              <button onClick={() => handleSubmit()} disabled={!query.trim() || processing}
                className="w-12 h-12 bg-eigen-blue text-white rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity"
                aria-label={t('common.submit')}>
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

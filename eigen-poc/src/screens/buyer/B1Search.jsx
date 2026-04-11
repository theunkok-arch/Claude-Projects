import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Sparkles, MapPin, Home, Banknote, BedDouble, Send, ArrowRight } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Chip from '../../components/ui/Chip'
import useBuyerStore from '../../stores/buyerStore'

const QUICK_SEARCHES = [
  'Apartment in Amsterdam under €500k',
  '3-bedroom house in Utrecht',
  'Family home with garden in Rotterdam',
  'Starter apartment in Groningen',
]

const CITY_OPTIONS = ['Amsterdam', 'Rotterdam', 'Utrecht', 'Den Haag', 'Maastricht', 'Groningen']
const TYPE_OPTIONS = ['Appartement', 'Tussenwoning', 'Herenhuis', 'Villa', 'Twee-onder-een-kap']
const PRICE_RANGES = [
  { label: '< €300k', max: 300000 },
  { label: '€300–500k', min: 300000, max: 500000 },
  { label: '€500–750k', min: 500000, max: 750000 },
  { label: '€750k–1M', min: 750000, max: 1000000 },
  { label: '> €1M', min: 1000000 },
]
const BEDROOM_OPTIONS = [1, 2, 3, 4, 5]

function parseSearchQuery(query) {
  const q = query.toLowerCase()
  const filters = {}
  const cities = { amsterdam: 'Amsterdam', rotterdam: 'Rotterdam', utrecht: 'Utrecht', 'den haag': 'Den Haag', hague: 'Den Haag', maastricht: 'Maastricht', groningen: 'Groningen' }
  for (const [key, val] of Object.entries(cities)) {
    if (q.includes(key)) { filters.city = val; break }
  }
  const priceMatch = q.match(/(?:under|below|max|tot|€)\s*€?\s*(\d[\d.,]*)\s*(k|m|000)?/i)
  if (priceMatch) {
    let price = parseFloat(priceMatch[1].replace(/[.,]/g, ''))
    if (priceMatch[2] === 'k' || priceMatch[2] === '000') price *= 1000
    if (priceMatch[2] === 'm') price *= 1000000
    if (price < 10000) price *= 1000
    filters.maxPrice = price
  }
  const brMatch = q.match(/(\d)\s*(?:-|\s)?(?:bedroom|bed|kamer|slaapkamer|br)/i)
  if (brMatch) filters.minBedrooms = parseInt(brMatch[1])
  const types = { apartment: 'Appartement', appartement: 'Appartement', house: 'Tussenwoning', huis: 'Tussenwoning', villa: 'Villa', 'family home': 'Tussenwoning', herenhuis: 'Herenhuis', starter: 'Appartement' }
  for (const [key, val] of Object.entries(types)) {
    if (q.includes(key)) { filters.propertyType = val; break }
  }
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

export default function B1Search() {
  const navigate = useNavigate()
  const { searchQuery, searchFilters, setSearchQuery, setSearchFilters } = useBuyerStore()
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [processing, setProcessing] = useState(false)
  const [filtersReady, setFiltersReady] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const inputRef = useRef(null)
  const scrollRef = useRef(null)
  const [localFilters, setLocalFilters] = useState({
    city: searchFilters.city || null,
    maxPrice: searchFilters.maxPrice || null,
    minPrice: searchFilters.minPrice || null,
    minBedrooms: searchFilters.minBedrooms || null,
    propertyType: searchFilters.propertyType || null,
  })

  useEffect(() => {
    setMessages([
      { role: 'ai', text: "Hi! I'm your EIGEN AI home finder. Tell me what you're looking for — describe your dream home, budget, and preferred area." },
    ])
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (text) => {
    const searchText = text || query
    if (!searchText.trim()) return
    setMessages((prev) => [...prev, { role: 'user', text: searchText }])
    setQuery('')
    setProcessing(true)
    const parsed = parseSearchQuery(searchText)
    const newFilters = { ...localFilters, ...parsed }
    setLocalFilters(newFilters)

    setTimeout(() => {
      const parts = []
      if (parsed.city) parts.push(`in **${parsed.city}**`)
      if (parsed.maxPrice) parts.push(`under €${(parsed.maxPrice / 1000).toFixed(0)}k`)
      if (parsed.minBedrooms) parts.push(`with ${parsed.minBedrooms}+ bedrooms`)
      if (parsed.propertyType) parts.push(`(${parsed.propertyType})`)

      const responseText = parts.length > 0
        ? `Great choice! I'm searching for properties ${parts.join(' ')}. I found several matches for you. Refine the filters below or tap "Show Results" to browse them.`
        : `I'd love to help! Could you be more specific? Try mentioning a city (e.g. Amsterdam), budget (e.g. under €500k), or number of bedrooms.`

      setMessages((prev) => [...prev, { role: 'ai', text: responseText }])
      setProcessing(false)
      if (parts.length > 0) {
        setFiltersReady(true)
        setShowFilters(true)
      }
    }, 1500)
  }

  const updateFilter = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: prev[key] === value ? null : value }))
    if (!filtersReady) setFiltersReady(true)
  }

  const handleFindHomes = () => {
    setSearchQuery(query)
    setSearchFilters(localFilters)
    navigate('/buy/results')
  }

  const activeFilterCount = Object.values(localFilters).filter(Boolean).length

  return (
    <AppShell title="AI Search" flow="buy">
      <div className="flex flex-col min-h-[calc(100dvh-120px)]">
        <div className="flex-1 px-4 pt-4 pb-4 overflow-y-auto">
          {messages.length <= 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
              <div className="w-16 h-16 bg-eigen-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search size={28} className="text-eigen-blue" />
              </div>
              <h2 className="text-2xl font-bold text-eigen-navy mb-2">Find your new home</h2>
              <p className="text-gray-500 text-sm">Describe what you're looking for in your own words</p>
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

          {messages.length <= 1 && !processing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Try these</p>
              <div className="space-y-2">
                {QUICK_SEARCHES.map((qs) => (
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
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Refine Your Search</h4>
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><MapPin size={11} /> City</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CITY_OPTIONS.map((city) => (
                        <Chip key={city} label={city} active={localFilters.city === city} onClick={() => updateFilter('city', city)} className="text-xs px-3 py-1.5" />
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><Banknote size={11} /> Budget</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRICE_RANGES.map((range) => (
                        <Chip key={range.label} label={range.label}
                          active={localFilters.maxPrice === range.max && localFilters.minPrice === (range.min || null)}
                          onClick={() => { setLocalFilters((p) => ({ ...p, minPrice: range.min || null, maxPrice: range.max || null })); if (!filtersReady) setFiltersReady(true) }}
                          className="text-xs px-3 py-1.5" />
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><BedDouble size={11} /> Bedrooms</p>
                    <div className="flex gap-1.5">
                      {BEDROOM_OPTIONS.map((n) => (
                        <Chip key={n} label={`${n}+`} active={localFilters.minBedrooms === n} onClick={() => updateFilter('minBedrooms', n)} className="text-xs px-3 py-1.5" />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><Home size={11} /> Type</p>
                    <div className="flex flex-wrap gap-1.5">
                      {TYPE_OPTIONS.map((type) => (
                        <Chip key={type} label={type} active={localFilters.propertyType === type} onClick={() => updateFilter('propertyType', type)} className="text-xs px-3 py-1.5" />
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
                Show Results
                {activeFilterCount > 0 && (
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{activeFilterCount} filters</span>
                )}
                <ArrowRight size={16} />
              </div>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Describe your dream home..."
                className="flex-1 h-12 px-4 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-eigen-blue bg-white" />
              <button onClick={() => handleSubmit()} disabled={!query.trim() || processing}
                className="w-12 h-12 bg-eigen-blue text-white rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity">
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

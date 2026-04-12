import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bed,
  Bath,
  Ruler,
  Zap,
  Heart,
  Home,
  Sparkles,
  ChevronDown,
  Clock,
  SlidersHorizontal,
} from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import Badge from '../../components/ui/Badge'
import useBuyerStore from '../../stores/buyerStore'
import { formatPrice } from '../../data/mockProperties'
import { applySmartFilters, sortProperties } from '../../utils/filterProperties'

// ---- Deterministic placeholder colors (same as B1) ----
const PLACEHOLDER_COLORS = [
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-emerald-600',
  'from-violet-400 to-violet-600',
  'from-amber-400 to-amber-600',
  'from-rose-400 to-rose-600',
  'from-cyan-400 to-cyan-600',
  'from-indigo-400 to-indigo-600',
  'from-orange-400 to-orange-600',
]

function getPlaceholderColor(id) {
  return PLACEHOLDER_COLORS[(id - 1) % PLACEHOLDER_COLORS.length]
}

const SORT_OPTIONS = [
  { value: 'match', label: 'Best match' },
  { value: 'price-asc', label: 'Price \u2191' },
  { value: 'price-desc', label: 'Price \u2193' },
  { value: 'newest', label: 'Newest' },
]

// ============================================================
// B2Results — Scored Results with Smart Filters
// ============================================================
export default function B2Results() {
  const navigate = useNavigate()
  const {
    scoredResults,
    smartFilters,
    sortBy,
    savedProperties,
    toggleSmartFilter,
    setSortBy,
    saveProperty,
    unsaveProperty,
  } = useBuyerStore()

  // Redirect if no results
  if (scoredResults.length === 0) {
    return (
      <AppShell title="Search Results" flow="buy">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Home size={28} className="text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-eigen-navy mb-2">No search results yet</h2>
          <p className="text-sm text-gray-500 mb-6">
            Start a conversation with our AI to find your perfect home.
          </p>
          <button
            onClick={() => navigate('/buy/search')}
            className="h-12 px-6 rounded-lg bg-eigen-blue text-white font-semibold text-sm active:scale-95 transition-transform"
          >
            Start AI Search
          </button>
        </div>
      </AppShell>
    )
  }

  const activeFilterKeys = smartFilters.filter((f) => f.active).map((f) => f.key)

  const displayedResults = useMemo(() => {
    const filtered = applySmartFilters(scoredResults, activeFilterKeys)
    return sortProperties(filtered, sortBy)
  }, [scoredResults, activeFilterKeys.join(','), sortBy])

  const handleToggleSave = (e, id) => {
    e.stopPropagation()
    if (savedProperties.includes(id)) {
      unsaveProperty(id)
    } else {
      saveProperty(id)
    }
  }

  return (
    <AppShell title="Search Results" step={2} totalSteps={6} flow="buy">
      <div className="pb-6">
        {/* Results header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <span className="text-sm font-semibold text-eigen-navy">
              {displayedResults.length} {displayedResults.length === 1 ? 'property' : 'properties'}
            </span>
            {activeFilterKeys.length > 0 && (
              <span className="text-xs text-gray-400 ml-1">
                (filtered from {scoredResults.length})
              </span>
            )}
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none text-xs font-medium text-gray-600 bg-gray-100 rounded-full pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-eigen-blue cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Smart filter bar */}
        {smartFilters.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-100 text-eigen-purple text-xs font-semibold flex-shrink-0">
                <Sparkles size={11} />
                Filters
              </div>

              {smartFilters.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => toggleSmartFilter(filter.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors active:scale-95 ${
                    filter.active
                      ? 'bg-eigen-navy text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Property cards */}
        {displayedResults.length > 0 ? (
          <div className="space-y-4 px-4 pt-4">
            {displayedResults.map((property, index) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <PropertyCard
                  property={property}
                  isSaved={savedProperties.includes(property.id)}
                  onTap={() => navigate(`/buy/property/${property.id}`)}
                  onToggleSave={(e) => handleToggleSave(e, property.id)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyFilterState
            onClearFilters={() => {
              smartFilters.forEach((f) => {
                if (f.active) toggleSmartFilter(f.key)
              })
            }}
            onNewSearch={() => {
              useBuyerStore.getState().clearChat()
              navigate('/buy/search')
            }}
          />
        )}
      </div>
    </AppShell>
  )
}

// ============================================================
// Sub-components
// ============================================================

function PropertyCard({ property, isSaved, onTap, onToggleSave }) {
  const colorClass = getPlaceholderColor(property.id)

  let matchColor = 'purple'
  if (property.matchScore >= 80) matchColor = 'green'
  else if (property.matchScore >= 60) matchColor = 'blue'
  else if (property.matchScore >= 40) matchColor = 'amber'

  return (
    <button
      onClick={onTap}
      className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-left hover:shadow-md transition-shadow active:scale-[0.99]"
    >
      {/* Image area */}
      <div className="relative">
        <div className={`w-full h-48 bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
          <Home size={40} className="text-white/60" />
        </div>

        <div className="absolute top-3 right-3">
          <Badge color={matchColor} className="text-sm px-2.5 py-1 shadow-sm">
            {property.matchScore}% match
          </Badge>
        </div>

        <button
          onClick={onToggleSave}
          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm active:scale-90 transition-transform"
        >
          <Heart
            size={18}
            className={isSaved ? 'fill-eigen-red text-eigen-red' : 'text-gray-500'}
          />
        </button>

        {property.daysOnMarket <= 7 && (
          <div className="absolute bottom-3 left-3">
            <Badge color="green" className="shadow-sm">
              <Clock size={10} className="mr-0.5" />
              New — {property.daysOnMarket}d ago
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-base font-semibold text-eigen-navy">
          {property.street} {property.number}
        </h3>
        <p className="text-sm text-gray-500">
          {property.city} &middot; {property.neighbourhood}
        </p>

        <p className="text-xl font-bold text-eigen-navy mt-2">{formatPrice(property.price)}</p>

        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Bed size={14} /> {property.bedrooms}</span>
          <span className="flex items-center gap-1"><Bath size={14} /> {property.bathrooms}</span>
          <span className="flex items-center gap-1"><Ruler size={14} /> {property.area}m&sup2;</span>
          <span className="flex items-center gap-1"><Zap size={14} /> {property.energyLabel}</span>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {property.features.slice(0, 3).map((f) => (
            <span key={f} className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500">
              {f}
            </span>
          ))}
          {property.features.length > 3 && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-400">
              +{property.features.length - 3}
            </span>
          )}
        </div>

        {property.daysOnMarket > 7 && (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Clock size={11} />
            Listed {property.daysOnMarket} days ago
          </p>
        )}
      </div>
    </button>
  )
}

function EmptyFilterState({ onClearFilters, onNewSearch }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <SlidersHorizontal size={24} className="text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-eigen-navy mb-1">No matches with these filters</h3>
      <p className="text-sm text-gray-500 mb-6">
        Try removing some filters to see more results.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClearFilters}
          className="h-11 px-5 rounded-lg bg-gray-100 text-eigen-navy text-sm font-semibold active:scale-95 transition-transform"
        >
          Clear filters
        </button>
        <button
          onClick={onNewSearch}
          className="h-11 px-5 rounded-lg bg-eigen-blue text-white text-sm font-semibold active:scale-95 transition-transform"
        >
          New search
        </button>
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, BedDouble, Ruler, Zap, MapPin, SlidersHorizontal, ArrowUpDown, Eye, Clock } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Chip from '../../components/ui/Chip'
import AIBubble from '../../components/ai/AIBubble'
import useBuyerStore from '../../stores/buyerStore'
import mockProperties from '../../data/mockProperties'
import { formatCurrency } from '../../utils/formatCurrency'

const CITY_REGIONS = {
  'Utrecht': ['Utrecht', 'Bilthoven', 'De Bilt', 'Zeist', 'Amersfoort'],
  'Amsterdam': ['Amsterdam', 'Amstelveen', 'Diemen'],
  'Rotterdam': ['Rotterdam', 'Schiedam', 'Capelle'],
  'Den Haag': ['Den Haag', 'Rijswijk', 'Voorburg'],
  'Maastricht': ['Maastricht'],
  'Groningen': ['Groningen'],
  'Bilthoven': ['Bilthoven', 'Utrecht', 'De Bilt', 'Zeist'],
}

const SORT_OPTIONS = [
  { id: 'match', label: 'Best Match' },
  { id: 'price_asc', label: 'Lowest Price' },
  { id: 'price_desc', label: 'Highest Price' },
  { id: 'newest', label: 'Newest' },
]

const PLACEHOLDER_COLORS = [
  'from-blue-400 to-blue-600',
  'from-teal-400 to-teal-600',
  'from-indigo-400 to-indigo-600',
  'from-cyan-400 to-cyan-600',
  'from-violet-400 to-violet-600',
  'from-sky-400 to-sky-600',
  'from-emerald-400 to-emerald-600',
  'from-purple-400 to-purple-600',
]

function PropertyCard({ property, index, isSaved, onSave, onUnsave, onClick }) {
  const overbidColor = property.overbidPercentage > 5 ? 'text-eigen-red' : property.overbidPercentage > 3 ? 'text-eigen-amber' : 'text-eigen-green'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="overflow-hidden p-0">
        {/* Photo placeholder */}
        <button onClick={onClick} className="relative w-full aspect-[16/10] block">
          <div className={`w-full h-full bg-gradient-to-br ${PLACEHOLDER_COLORS[property.id % PLACEHOLDER_COLORS.length]} flex items-center justify-center`}>
            <div className="text-center text-white/80">
              <MapPin size={24} className="mx-auto mb-1" />
              <p className="text-xs font-medium">{property.street} {property.number}</p>
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {property.daysOnMarket <= 7 && (
              <span className="px-2 py-0.5 bg-eigen-green text-white text-[10px] font-bold rounded-full">New</span>
            )}
            <span className="px-2 py-0.5 bg-black/50 text-white text-[10px] font-medium rounded-full">
              {property.daysOnMarket}d on market
            </span>
          </div>

          {/* Save button */}
          <button
            onClick={(e) => { e.stopPropagation(); isSaved ? onUnsave(property.id) : onSave(property.id) }}
            className="absolute top-2 right-2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-sm"
          >
            <Heart size={16} className={isSaved ? 'text-eigen-red fill-eigen-red' : 'text-gray-400'} />
          </button>
        </button>

        {/* Info */}
        <button onClick={onClick} className="p-3 text-left w-full">
          <div className="flex items-start justify-between mb-1">
            <p className="text-lg font-bold text-eigen-navy">{formatCurrency(property.askingPrice)}</p>
            <span className={`text-xs font-medium ${overbidColor}`}>
              +{property.overbidPercentage}% overbid
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700">{property.street} {property.number}</p>
          <p className="text-xs text-gray-400 mb-2">{property.postcode} {property.city}</p>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><BedDouble size={12} /> {property.bedrooms}</span>
            <span className="flex items-center gap-1"><Ruler size={12} /> {property.area} m²</span>
            <span className="flex items-center gap-1"><Zap size={12} /> {property.energyLabel}</span>
            <span className="flex items-center gap-1"><Eye size={12} /> {property.views}</span>
          </div>
        </button>
      </Card>
    </motion.div>
  )
}

export default function B2Results() {
  const navigate = useNavigate()
  const { searchFilters, savedProperties, saveProperty, unsaveProperty, markViewed } = useBuyerStore()
  const [sort, setSort] = useState('match')
  const [showSort, setShowSort] = useState(false)
  const [showSavedOnly, setShowSavedOnly] = useState(false)

  // Filter properties based on search criteria
  const filteredProperties = useMemo(() => {
    let results = [...mockProperties]
    const f = searchFilters

    if (f.city) {
      const regionCities = CITY_REGIONS[f.city] || [f.city]
      results = results.filter((p) => regionCities.includes(p.city))
    }
    if (f.minPrice) results = results.filter((p) => p.askingPrice >= f.minPrice)
    if (f.maxPrice) results = results.filter((p) => p.askingPrice <= f.maxPrice)
    if (f.minBedrooms) results = results.filter((p) => p.bedrooms >= f.minBedrooms)
    if (f.propertyType) results = results.filter((p) => p.type === f.propertyType)

    if (showSavedOnly) results = results.filter((p) => savedProperties.includes(p.id))

    // Sort
    switch (sort) {
      case 'price_asc': results.sort((a, b) => a.askingPrice - b.askingPrice); break
      case 'price_desc': results.sort((a, b) => b.askingPrice - a.askingPrice); break
      case 'newest': results.sort((a, b) => a.daysOnMarket - b.daysOnMarket); break
      default: results.sort((a, b) => b.saves - a.saves) // "match" → popularity
    }

    return results
  }, [searchFilters, sort, showSavedOnly, savedProperties])

  const handlePropertyClick = (property) => {
    markViewed(property.id)
    navigate(`/buy/property/${property.id}`)
  }

  // Build active filter summary
  const filterParts = []
  if (searchFilters.city) filterParts.push(searchFilters.city)
  if (searchFilters.maxPrice) filterParts.push(`< ${formatCurrency(searchFilters.maxPrice)}`)
  if (searchFilters.minBedrooms) filterParts.push(`${searchFilters.minBedrooms}+ bed`)
  if (searchFilters.propertyType) filterParts.push(searchFilters.propertyType)

  return (
    <AppShell title="Search Results" flow="buy">
      <div className="px-4 pt-4 pb-32">
        {/* Filter summary + sort */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-lg font-bold text-eigen-navy">{filteredProperties.length} results</p>
            {filterParts.length > 0 && (
              <p className="text-xs text-gray-400">{filterParts.join(' · ')}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Chip
              label={`♥ ${savedProperties.length}`}
              active={showSavedOnly}
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className="text-xs px-3 py-1.5"
            />
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-xs text-gray-600 font-medium"
            >
              <ArrowUpDown size={12} />
              Sort
            </button>
          </div>
        </div>

        {/* Sort options */}
        <AnimatePresence>
          {showSort && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="flex flex-wrap gap-1.5">
                {SORT_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.id}
                    label={opt.label}
                    active={sort === opt.id}
                    onClick={() => { setSort(opt.id); setShowSort(false) }}
                    className="text-xs px-3 py-1.5"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI insight */}
        {filteredProperties.length > 0 && (
          <AIBubble className="mb-4">
            {searchFilters.city
              ? `Properties in ${searchFilters.city} are seeing ${filteredProperties[0]?.overbidPercentage || 3}% average overbidding. I recommend saving your favourites early and scheduling viewings quickly.`
              : `I found ${filteredProperties.length} properties matching your criteria. Save the ones you like and I'll help you compare them.`}
          </AIBubble>
        )}

        {/* Property list */}
        <div className="space-y-3">
          {filteredProperties.map((property, i) => (
            <PropertyCard
              key={property.id}
              property={property}
              index={i}
              isSaved={savedProperties.includes(property.id)}
              onSave={saveProperty}
              onUnsave={unsaveProperty}
              onClick={() => handlePropertyClick(property)}
            />
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <div className="text-center py-16">
            <MapPin size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No properties found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search filters</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/buy/search')}>
              Back to Search
            </Button>
          </div>
        )}
      </div>

      <BottomCTA>
        <Button variant="outline" fullWidth onClick={() => navigate('/buy/search')}>
          <div className="flex items-center justify-center gap-2">
            <SlidersHorizontal size={16} />
            Adjust Search
          </div>
        </Button>
      </BottomCTA>
    </AppShell>
  )
}

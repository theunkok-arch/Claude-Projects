import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, BedDouble, Ruler, Zap, MapPin, SlidersHorizontal, ArrowUpDown, Eye, AlertCircle } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Chip from '../../components/ui/Chip'
import AIBubble from '../../components/ai/AIBubble'
import useBuyerStore from '../../stores/buyerStore'
import mockProperties from '../../data/mockProperties'
import { formatCurrency } from '../../utils/formatCurrency'
import { applyFiltersWithFallback } from '../../utils/filterProperties'
import { useTranslation } from '../../i18n'

const SORT_OPTIONS = [
  { id: 'match', key: 'b2.sortMatch' },
  { id: 'price_asc', key: 'b2.sortPriceAsc' },
  { id: 'price_desc', key: 'b2.sortPriceDesc' },
  { id: 'newest', key: 'b2.sortNewest' },
]

function PropertyCard({ property, index, isSaved, onSave, onUnsave, onClick, t }) {
  const overbidColor = property.overbidPercentage > 5 ? 'text-eigen-red' : property.overbidPercentage > 3 ? 'text-eigen-amber' : 'text-eigen-green'
  const heroImage = property.images?.[0]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="overflow-hidden p-0">
        {/* Photo */}
        <button onClick={onClick} className="relative w-full aspect-[16/10] block bg-gray-100 overflow-hidden">
          {heroImage ? (
            <img
              src={heroImage}
              alt={`${property.street} ${property.number}`}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white/80">
              <MapPin size={24} />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {property.daysOnMarket <= 7 && (
              <span className="px-2 py-0.5 bg-eigen-green text-white text-[10px] font-bold rounded-full">{t('b2.badgeNew')}</span>
            )}
            <span className="px-2 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded-full">
              {property.daysOnMarket}{t('b2.badgeDaysSuffix')}
            </span>
          </div>

          {/* Save button */}
          <button
            onClick={(e) => { e.stopPropagation(); isSaved ? onUnsave(property.id) : onSave(property.id) }}
            className="absolute top-2 right-2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-sm"
            aria-label={isSaved ? t('b2.unsave') : t('b2.save')}
          >
            <Heart size={16} className={isSaved ? 'text-eigen-red fill-eigen-red' : 'text-gray-400'} />
          </button>
        </button>

        {/* Info */}
        <button onClick={onClick} className="p-3 text-left w-full">
          <div className="flex items-start justify-between mb-1">
            <p className="text-lg font-bold text-eigen-navy">{formatCurrency(property.askingPrice)}</p>
            <span className={`text-xs font-medium ${overbidColor}`}>
              +{property.overbidPercentage}% {t('b2.overbid')}
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
  const { t } = useTranslation()
  const { searchFilters, savedProperties, saveProperty, unsaveProperty, markViewed } = useBuyerStore()
  const [sort, setSort] = useState('match')
  const [showSort, setShowSort] = useState(false)
  const [showSavedOnly, setShowSavedOnly] = useState(false)

  const { filteredProperties, relaxed } = useMemo(() => {
    const { results, relaxed } = applyFiltersWithFallback(mockProperties, searchFilters)
    let working = [...results]

    if (showSavedOnly) working = working.filter((p) => savedProperties.includes(p.id))

    switch (sort) {
      case 'price_asc': working.sort((a, b) => a.askingPrice - b.askingPrice); break
      case 'price_desc': working.sort((a, b) => b.askingPrice - a.askingPrice); break
      case 'newest': working.sort((a, b) => a.daysOnMarket - b.daysOnMarket); break
      default: working.sort((a, b) => b.saves - a.saves)
    }

    return { filteredProperties: working, relaxed }
  }, [searchFilters, sort, showSavedOnly, savedProperties])

  const handlePropertyClick = (property) => {
    markViewed(property.id)
    navigate(`/buy/property/${property.id}`)
  }

  // Build active filter summary
  const filterParts = []
  if (searchFilters.cities?.length) filterParts.push(searchFilters.cities.join(', '))
  if (searchFilters.minPrice || searchFilters.maxPrice) {
    const min = searchFilters.minPrice ? formatCurrency(searchFilters.minPrice) : t('b1.noMin')
    const max = searchFilters.maxPrice ? formatCurrency(searchFilters.maxPrice) : t('b1.noMax')
    filterParts.push(`${min} – ${max}`)
  }
  if (searchFilters.minBedrooms) filterParts.push(`${searchFilters.minBedrooms}+ ${t('b1.bed')}`)
  if (searchFilters.propertyTypes?.length) filterParts.push(searchFilters.propertyTypes.join(', '))

  return (
    <AppShell title={t('b2.title')} flow="buy">
      <div className="px-4 pt-4 pb-32">
        {/* Filter summary + sort */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-lg font-bold text-eigen-navy">{filteredProperties.length} {t('b2.results')}</p>
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
              {t('b2.sort')}
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
                    label={t(opt.key)}
                    active={sort === opt.id}
                    onClick={() => { setSort(opt.id); setShowSort(false) }}
                    className="text-xs px-3 py-1.5"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Relaxed-filter notice */}
        {relaxed.length > 0 && !showSavedOnly && (
          <Card className="mb-3 border-l-4 border-eigen-amber bg-amber-50">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-eigen-amber shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-eigen-navy">{t('b2.relaxedTitle')}</p>
                <p className="text-xs text-gray-600">{t('b2.relaxedDesc')}</p>
              </div>
            </div>
          </Card>
        )}

        {/* AI insight */}
        {filteredProperties.length > 0 && (
          <AIBubble className="mb-4">
            {searchFilters.cities?.length
              ? t('b2.aiInsightCity', { city: searchFilters.cities.join(', '), pct: filteredProperties[0]?.overbidPercentage || 3 })
              : t('b2.aiInsightGeneric', { count: filteredProperties.length })}
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
              t={t}
            />
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <div className="text-center py-16">
            <MapPin size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{t('b2.noResults')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('b2.noResultsHint')}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/buy/search')}>
              {t('b2.backToSearch')}
            </Button>
          </div>
        )}
      </div>

      <BottomCTA>
        <Button variant="outline" fullWidth onClick={() => navigate('/buy/search')}>
          <div className="flex items-center justify-center gap-2">
            <SlidersHorizontal size={16} />
            {t('b2.adjustSearch')}
          </div>
        </Button>
      </BottomCTA>
    </AppShell>
  )
}

import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, BedDouble, Bath, Ruler, Zap, Calendar, Eye, Clock, TrendingUp, Share2, ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Accordion from '../../components/ui/Accordion'
import AITyping from '../../components/ai/AITyping'
import useBuyerStore from '../../stores/buyerStore'
import useAnimateNumber from '../../hooks/useAnimateNumber'
import { getPropertyById } from '../../data/mockProperties'
import { getNeighbourhoodByCity } from '../../data/mockNeighbourhood'
import { formatCurrency } from '../../utils/formatCurrency'
import { useTranslation } from '../../i18n'

function generateOverbidData(avgOverbid) {
  return [
    { range: '-2%', count: 2, highlight: false },
    { range: '0%', count: 5, highlight: false },
    { range: '+2%', count: 12, highlight: avgOverbid <= 3 },
    { range: '+4%', count: 18, highlight: avgOverbid > 3 && avgOverbid <= 5 },
    { range: '+6%', count: 10, highlight: avgOverbid > 5 && avgOverbid <= 7 },
    { range: '+8%', count: 6, highlight: avgOverbid > 7 },
    { range: '+10%', count: 3, highlight: false },
  ]
}

function buildAIInsight(property, neighbourhood, pricePerM2, language) {
  const avg = neighbourhood?.avgPrice || 5000
  const aboveBelow = pricePerM2 > avg
  const bidTarget = Math.round(property.askingPrice * (1 + property.overbidPercentage / 100))
  if (language === 'nl') {
    return `Deze ${property.type.toLowerCase()} aan de ${property.street} staat geprijsd op ${formatCurrency(pricePerM2)}/m², dat is ${aboveBelow ? 'boven' : 'onder'} het gemiddelde van ${formatCurrency(avg)}/m² in ${property.city}. Met ${property.overbidPercentage}% gemiddeld overbod in deze buurt moet je rond de ${formatCurrency(bidTarget)} bieden om kans te maken.`
  }
  return `This ${property.type.toLowerCase()} on ${property.street} is priced at ${formatCurrency(pricePerM2)}/m², which is ${aboveBelow ? 'above' : 'below'} the ${property.city} average of ${formatCurrency(avg)}/m². With ${property.overbidPercentage}% average overbidding in this area, expect to bid around ${formatCurrency(bidTarget)} to be competitive.`
}

export default function B3PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, language } = useTranslation()
  const { savedProperties, saveProperty, unsaveProperty, markViewed } = useBuyerStore()

  const property = useMemo(() => getPropertyById(id), [id])
  const neighbourhood = useMemo(() => property ? getNeighbourhoodByCity(property.city) : null, [property])
  const overbidData = useMemo(() => property ? generateOverbidData(property.overbidPercentage) : [], [property])

  const isSaved = savedProperties.includes(Number(id))
  const animatedViews = useAnimateNumber(property?.views || 0, 800)
  const animatedSaves = useAnimateNumber(property?.saves || 0, 800)

  const [photoIdx, setPhotoIdx] = useState(0)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    if (property) markViewed(property.id)
  }, [property])

  useEffect(() => { setPhotoIdx(0); setImgError(false) }, [id])

  if (!property) {
    return (
      <AppShell title={t('b3.title')} flow="buy">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <p className="text-gray-500">{t('b2.noResults')}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/buy/results')}>
            {t('b2.backToSearch')}
          </Button>
        </div>
      </AppShell>
    )
  }

  const pricePerM2 = Math.round(property.askingPrice / property.area)
  const images = property.images || []
  const photoCount = images.length || 1
  const currentImg = images[photoIdx]
  const description = language === 'nl' && property.descriptionNL ? property.descriptionNL : property.description
  const insightText = buildAIInsight(property, neighbourhood, pricePerM2, language)

  const prevPhoto = () => setPhotoIdx((i) => (i - 1 + photoCount) % photoCount)
  const nextPhoto = () => setPhotoIdx((i) => (i + 1) % photoCount)

  return (
    <AppShell title={`${property.street} ${property.number}`} flow="buy">
      <div className="pb-32">
        {/* Hero image */}
        <div className="w-full aspect-[16/10] bg-gradient-to-br from-blue-400 to-indigo-600 relative overflow-hidden">
          {currentImg && !imgError && (
            <img
              src={currentImg}
              alt={`${property.street} ${property.number}`}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          )}

          {/* Prev/Next */}
          {photoCount > 1 && (
            <>
              <button
                onClick={prevPhoto}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-sm"
              >
                <ChevronLeft size={18} className="text-gray-700" />
              </button>
              <button
                onClick={nextPhoto}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-sm"
              >
                <ChevronRight size={18} className="text-gray-700" />
              </button>
            </>
          )}

          {/* Action buttons */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => isSaved ? unsaveProperty(property.id) : saveProperty(property.id)}
              className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm"
              aria-label={isSaved ? t('b2.unsave') : t('b2.save')}
            >
              <Heart size={18} className={isSaved ? 'text-eigen-red fill-eigen-red' : 'text-gray-500'} />
            </button>
            <button className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm" aria-label="Share">
              <Share2 size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Image counter */}
          <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/50 rounded-full text-white text-xs">
            {photoIdx + 1}/{photoCount} {photoCount === 1 ? t('b3.photoOf') : t('b3.photosOf')}
          </div>
        </div>

        <div className="px-4 pt-4">
          {/* Price + address */}
          <div className="mb-4">
            <div className="flex items-start justify-between mb-1">
              <p className="text-2xl font-bold text-eigen-navy">{formatCurrency(property.askingPrice)}</p>
              <Badge color="green">{property.status === 'active' ? (language === 'nl' ? 'Actief' : 'Active') : property.status}</Badge>
            </div>
            <p className="text-base font-medium text-gray-700">{property.street} {property.number}</p>
            <p className="text-sm text-gray-400">{property.postcode} {property.city}</p>
          </div>

          {/* Key stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { icon: BedDouble, label: t('b3.bedrooms'), value: property.bedrooms },
              { icon: Bath, label: t('b3.bathrooms'), value: property.bathrooms },
              { icon: Ruler, label: t('b3.area'), value: `${property.area} m²` },
              { icon: Calendar, label: t('b3.built'), value: property.yearBuilt },
              { icon: Zap, label: t('b3.energy'), value: property.energyLabel },
              { icon: TrendingUp, label: t('b3.pricePerM2'), value: formatCurrency(pricePerM2) },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label} className="text-center py-3 px-2">
                <Icon size={16} className="text-gray-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-eigen-navy">{value}</p>
                <p className="text-[10px] text-gray-400">{label}</p>
              </Card>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Eye size={12} /> {animatedViews} {t('b3.views')}</span>
            <span className="flex items-center gap-1"><Heart size={12} /> {animatedSaves} {t('b3.saves')}</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {property.daysOnMarket} {t('b3.daysOnMarket')}</span>
          </div>

          {/* Description */}
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('b3.description')}</h3>
          <Card className="mb-4">
            <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
          </Card>

          {/* Features */}
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('b3.features')}</h3>
          <Card className="mb-4">
            <div className="flex flex-wrap gap-2">
              {property.features.map((f) => (
                <span key={f} className="px-3 py-1.5 bg-gray-100 text-xs font-medium text-gray-600 rounded-full">{f}</span>
              ))}
            </div>
          </Card>

          {/* AI Insight */}
          <div className="mb-4">
            <AITyping key={`${language}-${property.id}`} text={insightText} speed={25} />
          </div>

          {/* Overbid Histogram */}
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('b3.overbidTitle')}</h3>
          <Card className="mb-4">
            <p className="text-xs text-gray-400 mb-2">{t('b3.overbidSubtitle')} {property.neighbourhood || property.city}</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={overbidData}>
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e5e5' }}
                  formatter={(v) => [`${v} ${language === 'nl' ? 'verkopen' : 'sales'}`, language === 'nl' ? 'Aantal' : 'Count']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {overbidData.map((entry, i) => (
                    <Cell key={i} fill={entry.highlight ? '#3B82F6' : '#E5E7EB'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-center text-gray-500 mt-1">
              {t('b3.avgOverbid')}: <span className="font-semibold text-eigen-blue">+{property.overbidPercentage}%</span>
            </p>
          </Card>

          {/* Neighbourhood */}
          {neighbourhood && (
            <>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('b3.neighbourhood')}</h3>
              <Card className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-eigen-navy">{neighbourhood.name}</p>
                    <p className="text-xs text-gray-400">{neighbourhood.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-eigen-navy">{neighbourhood.ratings?.overall || '8.0'}</p>
                    <p className="text-[10px] text-gray-400">{t('b3.overall')}</p>
                  </div>
                </div>
                {neighbourhood.ratings && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {Object.entries(neighbourhood.ratings).filter(([k]) => k !== 'overall').slice(0, 6).map(([key, val]) => (
                      <div key={key} className="text-center">
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                          <div className="h-full bg-eigen-blue rounded-full" style={{ width: `${val * 10}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-500 capitalize">{key}</p>
                      </div>
                    ))}
                  </div>
                )}
                {neighbourhood.transport && (
                  <div className="text-xs text-gray-500">
                    <p className="font-medium text-gray-600 mb-1">{t('b3.transport')}</p>
                    {neighbourhood.transport.map((tr, i) => <p key={i}>• {tr}</p>)}
                  </div>
                )}
              </Card>
            </>
          )}

          {/* How we calculated this */}
          <Accordion title={t('b3.sourcesTitle')}>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>{t('b3.sourcesOverbid')}:</strong> {language === 'nl' ? `Gebaseerd op ${overbidData.reduce((s, d) => s + d.count, 0)} recente verkopen in ${property.neighbourhood || property.city}` : `Based on ${overbidData.reduce((s, d) => s + d.count, 0)} recent sales in ${property.neighbourhood || property.city}`}</p>
              <p><strong>{t('b3.sourcesTrend')}:</strong> {t('b3.sourcesTrendValue', { pct: neighbourhood?.priceChange12m || 5 })}</p>
              <p><strong>{t('b3.sourcesSources')}:</strong> Kadaster, NVM, CBS</p>
            </div>
          </Accordion>
        </div>
      </div>

      <BottomCTA>
        <div className="flex gap-2">
          <Button variant="buyer" className="flex-1" onClick={() => navigate(`/buy/viewing/${property.id}`)}>
            {t('b3.scheduleViewing')}
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => navigate(`/buy/bid/${property.id}`)}>
            {t('b3.makeBid')}
          </Button>
        </div>
      </BottomCTA>
    </AppShell>
  )
}

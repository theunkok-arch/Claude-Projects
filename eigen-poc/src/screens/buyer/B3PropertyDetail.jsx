import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, BedDouble, Bath, Ruler, Zap, Calendar, MapPin, Eye, Clock, TrendingUp, ChevronRight, Share2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Accordion from '../../components/ui/Accordion'
import AIBubble from '../../components/ai/AIBubble'
import AITyping from '../../components/ai/AITyping'
import useBuyerStore from '../../stores/buyerStore'
import useAnimateNumber from '../../hooks/useAnimateNumber'
import { getPropertyById } from '../../data/mockProperties'
import { getNeighbourhoodByCity } from '../../data/mockNeighbourhood'
import { formatCurrency } from '../../utils/formatCurrency'

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

export default function B3PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { savedProperties, saveProperty, unsaveProperty, markViewed } = useBuyerStore()

  const property = useMemo(() => getPropertyById(id), [id])
  const neighbourhood = useMemo(() => property ? getNeighbourhoodByCity(property.city) : null, [property])
  const overbidData = useMemo(() => property ? generateOverbidData(property.overbidPercentage) : [], [property])

  const isSaved = savedProperties.includes(Number(id))
  const animatedViews = useAnimateNumber(property?.views || 0, 800)
  const animatedSaves = useAnimateNumber(property?.saves || 0, 800)

  useEffect(() => {
    if (property) markViewed(property.id)
  }, [property])

  if (!property) {
    return (
      <AppShell title="Property" flow="buy">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <p className="text-gray-500">Property not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/buy/results')}>
            Back to Results
          </Button>
        </div>
      </AppShell>
    )
  }

  const pricePerM2 = Math.round(property.askingPrice / property.area)

  return (
    <AppShell title={`${property.street} ${property.number}`} flow="buy">
      <div className="pb-32">
        {/* Hero image placeholder */}
        <div className={`w-full aspect-[16/10] bg-gradient-to-br ${PLACEHOLDER_COLORS[property.id % PLACEHOLDER_COLORS.length]} flex items-center justify-center relative`}>
          <div className="text-center text-white/80">
            <MapPin size={32} className="mx-auto mb-2" />
            <p className="text-sm font-medium">{property.street} {property.number}</p>
            <p className="text-xs opacity-70">{property.city}</p>
          </div>

          {/* Action buttons */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => isSaved ? unsaveProperty(property.id) : saveProperty(property.id)}
              className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm"
            >
              <Heart size={18} className={isSaved ? 'text-eigen-red fill-eigen-red' : 'text-gray-500'} />
            </button>
            <button className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm">
              <Share2 size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Image counter */}
          <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/50 rounded-full text-white text-xs">
            1/{property.images?.length || 3} photos
          </div>
        </div>

        <div className="px-4 pt-4">
          {/* Price + address */}
          <div className="mb-4">
            <div className="flex items-start justify-between mb-1">
              <p className="text-2xl font-bold text-eigen-navy">{formatCurrency(property.askingPrice)}</p>
              <Badge color="green">{property.status === 'active' ? 'Active' : property.status}</Badge>
            </div>
            <p className="text-base font-medium text-gray-700">{property.street} {property.number}</p>
            <p className="text-sm text-gray-400">{property.postcode} {property.city}</p>
          </div>

          {/* Key stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { icon: BedDouble, label: 'Bedrooms', value: property.bedrooms },
              { icon: Bath, label: 'Bathrooms', value: property.bathrooms },
              { icon: Ruler, label: 'Living area', value: `${property.area} m²` },
              { icon: Calendar, label: 'Built', value: property.yearBuilt },
              { icon: Zap, label: 'Energy', value: property.energyLabel },
              { icon: TrendingUp, label: 'Price/m²', value: formatCurrency(pricePerM2) },
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
            <span className="flex items-center gap-1"><Eye size={12} /> {animatedViews} views</span>
            <span className="flex items-center gap-1"><Heart size={12} /> {animatedSaves} saves</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {property.daysOnMarket} days on market</span>
          </div>

          {/* Description */}
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</h3>
          <Card className="mb-4">
            <p className="text-sm text-gray-700 leading-relaxed">{property.description}</p>
          </Card>

          {/* Features */}
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Features</h3>
          <Card className="mb-4">
            <div className="flex flex-wrap gap-2">
              {property.features.map((f) => (
                <span key={f} className="px-3 py-1.5 bg-gray-100 text-xs font-medium text-gray-600 rounded-full">{f}</span>
              ))}
            </div>
          </Card>

          {/* AI Insight */}
          <div className="mb-4">
            <AITyping
              text={`This ${property.type.toLowerCase()} on ${property.street} is priced at ${formatCurrency(pricePerM2)}/m², which is ${pricePerM2 > (neighbourhood?.avgPrice || 5000) ? 'above' : 'below'} the ${property.city} average of ${formatCurrency(neighbourhood?.avgPrice || 5000)}/m². With ${property.overbidPercentage}% average overbidding in this area, expect to bid around ${formatCurrency(Math.round(property.askingPrice * (1 + property.overbidPercentage / 100)))} to be competitive.`}
              speed={25}
            />
          </div>

          {/* Overbid Histogram */}
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Overbid Distribution</h3>
          <Card className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Recent sales in {property.neighbourhood || property.city}</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={overbidData}>
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e5e5' }}
                  formatter={(v) => [`${v} sales`, 'Count']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {overbidData.map((entry, i) => (
                    <Cell key={i} fill={entry.highlight ? '#3B82F6' : '#E5E7EB'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-center text-gray-500 mt-1">
              Average overbid: <span className="font-semibold text-eigen-blue">+{property.overbidPercentage}%</span>
            </p>
          </Card>

          {/* Neighbourhood */}
          {neighbourhood && (
            <>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Neighbourhood</h3>
              <Card className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-eigen-navy">{neighbourhood.name}</p>
                    <p className="text-xs text-gray-400">{neighbourhood.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-eigen-navy">{neighbourhood.ratings?.overall || '8.0'}</p>
                    <p className="text-[10px] text-gray-400">Overall</p>
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
                    <p className="font-medium text-gray-600 mb-1">Transport</p>
                    {neighbourhood.transport.map((t, i) => <p key={i}>• {t}</p>)}
                  </div>
                )}
              </Card>
            </>
          )}

          {/* How we calculated this */}
          <Accordion title="Market Data Sources">
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Overbid data:</strong> Based on {overbidData.reduce((s, d) => s + d.count, 0)} recent sales in {property.neighbourhood || property.city}</p>
              <p><strong>Price trend:</strong> {neighbourhood?.priceChange12m || 5}% increase over last 12 months</p>
              <p><strong>Sources:</strong> Kadaster, NVM, CBS statistics</p>
            </div>
          </Accordion>
        </div>
      </div>

      <BottomCTA>
        <div className="flex gap-2">
          <Button variant="buyer" className="flex-1" onClick={() => navigate(`/buy/viewing/${property.id}`)}>
            Schedule Viewing
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => navigate(`/buy/bid/${property.id}`)}>
            Make a Bid →
          </Button>
        </div>
      </BottomCTA>
    </AppShell>
  )
}

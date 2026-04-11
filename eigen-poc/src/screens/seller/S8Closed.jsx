import { useState } from 'react'
import { motion } from 'framer-motion'
import { PartyPopper, Scale, FileCheck, Search, FileText, Key, Star, Calendar, Clock, Download } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Accordion from '../../components/ui/Accordion'
import useSellerStore from '../../stores/sellerStore'
import { formatCurrency } from '../../utils/formatCurrency'

const CONFETTI_COLORS = ['#FF6B35', '#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B']

function ConfettiEffect() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            left: `${10 + Math.random() * 80}%`,
          }}
          initial={{ y: -10, rotate: 0, opacity: 1 }}
          animate={{ y: 300, rotate: 360, opacity: 0 }}
          transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.8, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}

function PartnerCard({ name, rating, price, booked, onBook }) {
  return (
    <Card className="mb-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-eigen-navy text-sm">{name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={12}
                className={i < Math.floor(rating) ? 'text-eigen-amber fill-eigen-amber' : 'text-gray-300'}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1">({rating})</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-eigen-navy">{price}</p>
          {booked ? (
            <Badge color="green">Booked ✓</Badge>
          ) : (
            <Button variant="primary" className="text-xs h-8 px-3 mt-1" onClick={onBook}>
              Book Now
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function S8Closed() {
  const { acceptedBid, closingProgress } = useSellerStore()
  const [bookedItems, setBookedItems] = useState({ inspection: null, document: false })
  const [bookingLoading, setBookingLoading] = useState(null)
  const [toast, setToast] = useState(null)

  const soldPrice = acceptedBid?.amount || 498500
  const closingDate = acceptedBid?.closingDate || '2026-06-15'

  const handleBook = (provider) => {
    setBookingLoading(provider)
    setTimeout(() => {
      setBookedItems((prev) => ({ ...prev, inspection: provider }))
      setBookingLoading(null)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)
      setToast(`Inspection booked for ${futureDate.toLocaleDateString('nl-NL')}!`)
      setTimeout(() => setToast(null), 3000)
    }, 1500)
  }

  const handleGenerateDoc = () => {
    setBookingLoading('document')
    setTimeout(() => {
      setBookedItems((prev) => ({ ...prev, document: true }))
      setBookingLoading(null)
    }, 2000)
  }

  return (
    <AppShell title="Deal Closed" step={8} totalSteps={8} flow="sell">
      <div className="px-4 pt-4 pb-24">
        {/* Celebration Banner */}
        <div className="relative bg-green-50 rounded-2xl p-6 mb-6 overflow-hidden">
          <ConfettiEffect />
          <div className="relative text-center">
            <span className="text-4xl mb-2 block">🎉</span>
            <h2 className="text-xl font-bold text-eigen-green mb-1">Congratulations!</h2>
            <p className="text-base text-gray-700">
              Your home is sold for <strong className="text-eigen-navy">{formatCurrency(soldPrice)}</strong>
            </p>
          </div>
        </div>

        {/* Closing Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-eigen-navy">Closing Progress: {closingProgress}%</p>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
            <motion.div
              className="h-full bg-eigen-green rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${closingProgress}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <p className="text-sm text-gray-500">Estimated 14 days to key transfer</p>
        </div>

        {/* Closing Checklist */}
        <div className="space-y-3">
          {/* 1: Notary - Done */}
          <Accordion title={
            <div className="flex items-center gap-3 w-full">
              <Scale size={18} className="text-gray-400" />
              <span className="flex-1 text-left">Select a Notary</span>
              <Badge color="green">Done ✓</Badge>
            </div>
          }>
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
              <span className="text-eigen-green">✓</span>
              You selected Van der Berg Notarissen
            </div>
            <PartnerCard
              name="Van der Berg Notarissen"
              rating={4.9}
              price="€1.250 fixed"
              booked={true}
            />
          </Accordion>

          {/* 2: Appraisal - Done */}
          <Accordion title={
            <div className="flex items-center gap-3 w-full">
              <FileCheck size={18} className="text-gray-400" />
              <span className="flex-1 text-left">NWWI Appraisal</span>
              <Badge color="green">Done ✓</Badge>
            </div>
          }>
            <p className="text-sm text-gray-600">
              Appraisal completed on March 20, 2026. Value confirmed at {formatCurrency(soldPrice + 5000)}.
            </p>
          </Accordion>

          {/* 3: Building Inspection - Action Required */}
          <Accordion title={
            <div className="flex items-center gap-3 w-full">
              <Search size={18} className="text-gray-400" />
              <span className="flex-1 text-left">Bouwkundige Keuring</span>
              <Badge color={bookedItems.inspection ? 'blue' : 'amber'}>
                {bookedItems.inspection ? 'In Progress' : 'Action Required ⚠️'}
              </Badge>
            </div>
          } defaultOpen={!bookedItems.inspection}>
            <p className="text-sm text-gray-600 mb-2">
              A building inspection protects both you and the buyer. Book a certified inspector through our network.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
              <Clock size={12} />
              <span>Typically takes 3-5 business days</span>
            </div>
            <PartnerCard
              name="Van der Berg Inspections"
              rating={4.8}
              price="€395 fixed"
              booked={bookedItems.inspection === 'vdb'}
              onBook={() => handleBook('vdb')}
            />
            <PartnerCard
              name="Keuringsgarant"
              rating={4.5}
              price="€349 fixed"
              booked={bookedItems.inspection === 'kg'}
              onBook={() => handleBook('kg')}
            />
            <PartnerCard
              name="Woningkeur Nederland"
              rating={4.3}
              price="€375 fixed"
              booked={bookedItems.inspection === 'wk'}
              onBook={() => handleBook('wk')}
            />
          </Accordion>

          {/* 4: Lijst van Zaken - Pending */}
          <Accordion title={
            <div className="flex items-center gap-3 w-full">
              <FileText size={18} className="text-gray-400" />
              <span className="flex-1 text-left">Lijst van Zaken</span>
              <Badge color={bookedItems.document ? 'green' : 'gray'}>
                {bookedItems.document ? 'Done ✓' : 'Pending'}
              </Badge>
            </div>
          }>
            <p className="text-sm text-gray-600 mb-3">
              An itemized list of everything included in the sale (fixtures, appliances, curtains, etc).
              We auto-generate this from your listing data.
            </p>
            {bookedItems.document ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <Download size={16} className="text-eigen-green" />
                <span className="text-sm text-eigen-green font-medium">Document ready — Download PDF</span>
              </div>
            ) : (
              <Button
                variant="primary"
                fullWidth
                disabled={bookingLoading === 'document'}
                onClick={handleGenerateDoc}
              >
                {bookingLoading === 'document' ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </div>
                ) : (
                  'Generate Document'
                )}
              </Button>
            )}
          </Accordion>

          {/* 5: Koopovereenkomst - Pending */}
          <Accordion title={
            <div className="flex items-center gap-3 w-full">
              <Key size={18} className="text-gray-400" />
              <span className="flex-1 text-left">Koopovereenkomst & Key Transfer</span>
              <Badge color="gray">Pending</Badge>
            </div>
          }>
            <p className="text-sm text-gray-600 mb-3">
              The standard purchase agreement will be prepared by your selected notary.
              Key transfer is scheduled for {closingDate}.
            </p>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-eigen-navy rounded-full flex items-center justify-center">
                  <Calendar size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-eigen-navy">Key Transfer</p>
                  <p className="text-xs text-gray-500">{closingDate}</p>
                </div>
              </div>
              <div className="flex gap-2 text-xs text-gray-400">
                <span className="px-2 py-0.5 bg-eigen-green/10 text-eigen-green rounded-full">Notary ✓</span>
                <span className="px-2 py-0.5 bg-eigen-green/10 text-eigen-green rounded-full">Appraisal ✓</span>
                <span className="px-2 py-0.5 bg-eigen-amber/10 text-eigen-amber rounded-full">Inspection...</span>
              </div>
            </div>
          </Accordion>
        </div>

        {/* Partner revenue callout */}
        <Card className="mt-6 bg-gray-50 border-0">
          <p className="text-xs text-gray-500 text-center">
            EIGEN connects you with trusted professionals at fixed, transparent prices — no surprises.
          </p>
        </Card>

        {/* Support CTA */}
        <div className="mt-6">
          <Button
            variant="outline"
            fullWidth
            onClick={() => setToast('Support chat coming soon')}
          >
            Need Help? Contact EIGEN Support
          </Button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-eigen-navy text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 max-w-[380px]"
        >
          {toast}
        </motion.div>
      )}
    </AppShell>
  )
}

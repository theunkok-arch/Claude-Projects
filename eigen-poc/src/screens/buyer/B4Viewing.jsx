import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarCheck, Clock, MapPin, CheckSquare, Square, MessageCircle, Sparkles, ArrowRight, Camera, Ruler, FileText } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import AIBubble from '../../components/ai/AIBubble'
import Modal from '../../components/ui/Modal'
import useBuyerStore from '../../stores/buyerStore'
import { getPropertyById } from '../../data/mockProperties'
import { formatCurrency } from '../../utils/formatCurrency'

const TIME_SLOTS = [
  { date: 'Tomorrow', day: 'Sat 12 Apr', times: ['10:00', '11:00', '14:00', '15:30'] },
  { date: 'Sunday', day: 'Sun 13 Apr', times: ['10:00', '11:30', '13:00'] },
  { date: 'Monday', day: 'Mon 14 Apr', times: ['17:00', '18:00', '19:00'] },
  { date: 'Tuesday', day: 'Tue 15 Apr', times: ['17:00', '18:30'] },
]

function generateChecklist(property) {
  return [
    { id: 1, category: 'Structure', text: `Check walls and ceilings for cracks (built ${property.yearBuilt})`, icon: Ruler },
    { id: 2, category: 'Structure', text: 'Look for signs of damp or moisture, especially in corners', icon: Ruler },
    { id: 3, category: 'Windows', text: 'Test all windows — check for double glazing and drafts', icon: Ruler },
    { id: 4, category: 'Kitchen', text: 'Check appliance condition and water pressure', icon: Camera },
    { id: 5, category: 'Bathroom', text: 'Run taps and flush toilet — check for leaks', icon: Camera },
    { id: 6, category: 'Energy', text: `Current label ${property.energyLabel} — ask about insulation upgrades`, icon: FileText },
    { id: 7, category: 'Storage', text: `Check storage space (${property.area}m² — is it well used?)`, icon: Ruler },
    { id: 8, category: 'Exterior', text: 'Inspect VvE maintenance state and shared areas', icon: Camera },
  ]
}

function generateQuestions(property) {
  return [
    `Why is the ${property.type.toLowerCase()} being sold?`,
    'How long have the current owners lived here?',
    'What are the monthly VvE / service charges?',
    `Has any major work been done since ${property.yearBuilt}?`,
    'Are there any known defects or planned maintenance?',
    'What are the neighbours like?',
    'What comes included in the sale (curtains, appliances)?',
    'How flexible is the closing date?',
  ]
}

export default function B4Viewing() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { scheduleViewing, scheduledViewings } = useBuyerStore()

  const property = useMemo(() => getPropertyById(id), [id])
  const checklist = useMemo(() => property ? generateChecklist(property) : [], [property])
  const questions = useMemo(() => property ? generateQuestions(property) : [], [property])

  const [selectedSlot, setSelectedSlot] = useState(null)
  const [isScheduled, setIsScheduled] = useState(
    scheduledViewings.some((v) => v.propertyId === Number(id))
  )
  const [checkedItems, setCheckedItems] = useState([])
  const [showConfirm, setShowConfirm] = useState(false)

  if (!property) {
    return (
      <AppShell title="Viewing" flow="buy">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <p className="text-gray-500">Property not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/buy/results')}>Back to Results</Button>
        </div>
      </AppShell>
    )
  }

  const toggleCheck = (itemId) => {
    setCheckedItems((prev) =>
      prev.includes(itemId) ? prev.filter((i) => i !== itemId) : [...prev, itemId]
    )
  }

  const handleSchedule = () => {
    if (!selectedSlot) return
    scheduleViewing({
      propertyId: property.id,
      date: selectedSlot.date,
      time: selectedSlot.time,
      address: `${property.street} ${property.number}, ${property.city}`,
    })
    setIsScheduled(true)
    setShowConfirm(true)
    setTimeout(() => setShowConfirm(false), 3000)
  }

  return (
    <AppShell title="Viewing Preparation" flow="buy">
      <div className="px-4 pt-4 pb-32">
        {/* Property summary */}
        <Card className="mb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-eigen-blue/10 rounded-xl flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-eigen-blue" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-eigen-navy">{property.street} {property.number}</p>
              <p className="text-xs text-gray-400">{property.postcode} {property.city}</p>
              <p className="text-sm font-bold text-eigen-navy mt-1">{formatCurrency(property.askingPrice)}</p>
            </div>
            <Badge color="blue">{property.type}</Badge>
          </div>
        </Card>

        {/* Schedule Viewing */}
        {!isScheduled ? (
          <>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Select a Time Slot</h3>
            <div className="space-y-3 mb-4">
              {TIME_SLOTS.map((slot) => (
                <Card key={slot.day}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{slot.date} — {slot.day}</p>
                  <div className="flex flex-wrap gap-2">
                    {slot.times.map((time) => {
                      const isSelected = selectedSlot?.date === slot.day && selectedSlot?.time === time
                      return (
                        <button
                          key={time}
                          onClick={() => setSelectedSlot({ date: slot.day, time })}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-eigen-blue text-white ring-2 ring-eigen-blue ring-offset-1'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {time}
                        </button>
                      )
                    })}
                  </div>
                </Card>
              ))}
            </div>

            <Button variant="buyer" fullWidth disabled={!selectedSlot} onClick={handleSchedule} className="mb-6">
              <div className="flex items-center justify-center gap-2">
                <CalendarCheck size={16} />
                {selectedSlot ? `Confirm ${selectedSlot.date} at ${selectedSlot.time}` : 'Select a time slot'}
              </div>
            </Button>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="mb-4 bg-green-50 border-eigen-green/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-eigen-green/10 rounded-xl flex items-center justify-center">
                  <CalendarCheck size={20} className="text-eigen-green" />
                </div>
                <div>
                  <p className="font-semibold text-eigen-green">Viewing Scheduled!</p>
                  <p className="text-sm text-gray-600">
                    {selectedSlot ? `${selectedSlot.date} at ${selectedSlot.time}` : 'Confirmed'}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* AI Preparation Tips */}
        <AIBubble title="Preparation Tips" className="mb-4">
          This {property.type.toLowerCase()} was built in {property.yearBuilt}. Pay special attention to the
          structure and insulation. The {property.neighbourhood || property.city} area has seen
          {property.overbidPercentage}% overbidding — if you like it, be ready to act fast.
        </AIBubble>

        {/* Viewing Checklist */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Viewing Checklist</h3>
        <Card className="mb-4">
          <div className="space-y-2">
            {checklist.map((item) => {
              const isChecked = checkedItems.includes(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className="flex items-start gap-3 w-full text-left py-1.5"
                >
                  {isChecked ? (
                    <CheckSquare size={18} className="text-eigen-green shrink-0 mt-0.5" />
                  ) : (
                    <Square size={18} className="text-gray-300 shrink-0 mt-0.5" />
                  )}
                  <span className={`text-sm ${isChecked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {item.text}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">{checkedItems.length}/{checklist.length} completed</p>
          </div>
        </Card>

        {/* Questions to Ask */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Questions to Ask</h3>
        <Card className="mb-4">
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={i} className="flex items-start gap-2 py-1">
                <MessageCircle size={14} className="text-eigen-blue shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700">{q}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Confirmation toast */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-eigen-green text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50"
          >
            ✓ Viewing confirmed! We'll send you a reminder.
          </motion.div>
        )}
      </AnimatePresence>

      <BottomCTA>
        <Button variant="primary" fullWidth onClick={() => navigate(`/buy/bid/${property.id}`)}>
          Ready to Bid? Make an Offer →
        </Button>
      </BottomCTA>
    </AppShell>
  )
}

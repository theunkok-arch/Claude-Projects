import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarCheck, MapPin, CheckSquare, Square, MessageCircle } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import AIBubble from '../../components/ai/AIBubble'
import useBuyerStore from '../../stores/buyerStore'
import { getPropertyById } from '../../data/mockProperties'
import { formatCurrency } from '../../utils/formatCurrency'
import { useTranslation } from '../../i18n'

const TIME_SLOTS = [
  { dateKey: 'tomorrow', day: 'Sat 12 Apr', times: ['10:00', '11:00', '14:00', '15:30'] },
  { dateKey: 'sunday', day: 'Sun 13 Apr', times: ['10:00', '11:30', '13:00'] },
  { dateKey: 'monday', day: 'Mon 14 Apr', times: ['17:00', '18:00', '19:00'] },
  { dateKey: 'tuesday', day: 'Tue 15 Apr', times: ['17:00', '18:30'] },
]

function interpolate(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? String(vars[k]) : `{${k}}`)
}

export default function B4Viewing() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { scheduleViewing, scheduledViewings } = useBuyerStore()

  const property = useMemo(() => getPropertyById(id), [id])

  const checklistTmpls = t('b4.checklistItems')
  const questionTmpls = t('b4.questionList')

  const checklist = useMemo(() => {
    if (!property || !Array.isArray(checklistTmpls)) return []
    return checklistTmpls.map((tpl, i) => ({
      id: i + 1,
      text: interpolate(tpl, { year: property.yearBuilt, energy: property.energyLabel, area: property.area }),
    }))
  }, [property, checklistTmpls])

  const questions = useMemo(() => {
    if (!property || !Array.isArray(questionTmpls)) return []
    return questionTmpls.map((tpl) => interpolate(tpl, { type: property.type.toLowerCase(), year: property.yearBuilt }))
  }, [property, questionTmpls])

  const [selectedSlot, setSelectedSlot] = useState(null)
  const [isScheduled, setIsScheduled] = useState(
    scheduledViewings.some((v) => v.propertyId === Number(id))
  )
  const [checkedItems, setCheckedItems] = useState([])
  const [showConfirm, setShowConfirm] = useState(false)

  if (!property) {
    return (
      <AppShell title={t('b4.title')} flow="buy">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <p className="text-gray-500">{t('b4.notFound')}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/buy/results')}>{t('b2.backToSearch')}</Button>
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

  const prepTipsBody = interpolate(t('b4.prepTipsBody'), {
    type: property.type.toLowerCase(),
    year: property.yearBuilt,
    area: property.neighbourhood || property.city,
    pct: property.overbidPercentage,
  })

  return (
    <AppShell title={t('b4.title')} flow="buy">
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
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('b4.selectSlot')}</h3>
            <div className="space-y-3 mb-4">
              {TIME_SLOTS.map((slot) => (
                <Card key={slot.day}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t(`b4.slotDates.${slot.dateKey}`)} — {slot.day}</p>
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
                {selectedSlot ? t('b4.confirmSlot', { date: selectedSlot.date, time: selectedSlot.time }) : t('b4.pickSlot')}
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
                  <p className="font-semibold text-eigen-green">{t('b4.scheduled')}</p>
                  <p className="text-sm text-gray-600">
                    {selectedSlot ? `${selectedSlot.date} · ${selectedSlot.time}` : t('b4.confirmed')}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* AI Preparation Tips */}
        <AIBubble title={t('b4.prepTipsTitle')} className="mb-4">
          {prepTipsBody}
        </AIBubble>

        {/* Viewing Checklist */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('b4.checklist')}</h3>
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
            <p className="text-xs text-gray-400">{t('b4.completed', { done: checkedItems.length, total: checklist.length })}</p>
          </div>
        </Card>

        {/* Questions to Ask */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('b4.questions')}</h3>
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
            {t('b4.confirmToast')}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomCTA>
        <Button variant="primary" fullWidth onClick={() => navigate(`/buy/bid/${property.id}`)}>
          {t('b4.readyToBid')}
        </Button>
      </BottomCTA>
    </AppShell>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Key, CheckCircle, FileText, Building2, Home, Clock } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import AIBubble from '../../components/ai/AIBubble'
import { useTranslation } from '../../i18n'

const STEP_ICONS = [CheckCircle, Clock, Building2, FileText, FileText, Key]
const STEP_DATES = ['11 Apr 2026', '11–14 Apr 2026', '16 Apr 2026', '22 Apr 2026', '28 Apr 2026', '15 May 2026']
const STEP_STATUS = ['completed', 'completed', 'completed', 'active', 'upcoming', 'upcoming']

const DOC_STATUS = [
  { status: 'ready', date: '14 Apr' },
  { status: 'ready', date: '16 Apr' },
  { status: 'pending', date: '22 Apr' },
  { status: 'pending', date: '28 Apr' },
  { status: 'ready', date: '11 Apr' },
  { status: 'ready', date: '12 Apr' },
]

function ConfettiEffect() {
  const colors = ['#FF6B35', '#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#EF4444']
  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: colors[i % colors.length], left: `${5 + Math.random() * 90}%`, top: -10 }}
          initial={{ y: -10, rotate: 0, opacity: 1 }}
          animate={{ y: window.innerHeight + 50, rotate: 360 * (Math.random() > 0.5 ? 1 : -1), opacity: 0 }}
          transition={{ duration: 2.5 + Math.random() * 2, delay: Math.random() * 0.8, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}

export default function B6Keys() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [showCelebration, setShowCelebration] = useState(false)

  const stepsText = t('b6.steps') // array of {title, desc}
  const docsText = t('b6.docs') // array of strings

  const steps = Array.isArray(stepsText)
    ? stepsText.map((s, i) => ({
        id: i + 1,
        title: s.title,
        desc: s.desc,
        date: STEP_DATES[i],
        status: STEP_STATUS[i],
        icon: STEP_ICONS[i],
      }))
    : []

  const completedSteps = steps.filter((s) => s.status === 'completed').length
  const totalSteps = steps.length
  const progress = totalSteps ? (completedSteps / totalSteps) * 100 : 0

  const keyDate = new Date('2026-05-15')
  const today = new Date()
  const daysUntilKeys = Math.max(0, Math.ceil((keyDate - today) / (1000 * 60 * 60 * 24)))

  const handleSimulateComplete = () => setShowCelebration(true)

  return (
    <AppShell title={t('b6.title')} flow="buy">
      <div className="px-4 pt-4 pb-32">
        {showCelebration ? (
          <>
            <ConfettiEffect />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <Key size={64} className="text-eigen-orange mx-auto mb-4" />
              </motion.div>
              <h2 className="text-3xl font-bold text-eigen-navy mb-2">{t('b6.congrats')}</h2>
              <p className="text-lg text-gray-600 mb-1">{t('b6.keysYours')}</p>
              <p className="text-sm text-gray-400 mb-6">{t('b6.welcome')}</p>

              <Card className="bg-gradient-to-br from-eigen-navy to-[#1E4D7B] text-white text-left mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <Home size={20} className="text-eigen-orange" />
                  <p className="font-bold text-lg">Prinsengracht 263</p>
                </div>
                <p className="text-sm text-white/70">1016 GV Amsterdam</p>
                <p className="text-sm text-white/70 mt-1">{t('b6.journeyComplete')}</p>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs text-white/50">{t('b6.savedVs')}</p>
                  <p className="text-2xl font-bold text-eigen-orange">€8.680</p>
                </div>
              </Card>

              <Button variant="primary" fullWidth onClick={() => navigate('/')}>
                {t('b6.backHome')}
              </Button>
            </motion.div>
          </>
        ) : (
          <>
            {/* Countdown card */}
            <Card className="bg-gradient-to-r from-eigen-blue to-blue-600 text-white mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/60">{t('b6.keysIn')}</p>
                  <p className="text-4xl font-bold">{daysUntilKeys}</p>
                  <p className="text-sm text-white/70">{t('b6.days')}</p>
                </div>
                <div className="text-right">
                  <Key size={32} className="text-white/30 ml-auto mb-2" />
                  <p className="text-xs text-white/60">15 May 2026</p>
                </div>
              </div>
            </Card>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-eigen-navy">{t('b6.progress')}</p>
                <p className="text-sm font-bold text-eigen-blue">{completedSteps}/{totalSteps}</p>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-eigen-blue rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Timeline */}
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('b6.timeline')}</h3>
            <div className="relative mb-6">
              {/* Vertical connector */}
              <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-gray-200" />

              <div className="space-y-1">
                {steps.map((step) => {
                  const Icon = step.icon
                  const isCompleted = step.status === 'completed'
                  const isActive = step.status === 'active'
                  return (
                    <div key={step.id} className="relative flex items-start gap-3 py-3">
                      {/* Status dot */}
                      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isCompleted ? 'bg-eigen-green' :
                        isActive ? 'bg-eigen-blue ring-4 ring-eigen-blue/20' :
                        'bg-gray-200'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle size={18} className="text-white" />
                        ) : (
                          <Icon size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-semibold ${isCompleted || isActive ? 'text-eigen-navy' : 'text-gray-400'}`}>
                            {step.title}
                          </p>
                          {isActive && <Badge color="blue">{t('b6.inProgress')}</Badge>}
                          {isCompleted && <Badge color="green">{t('b6.done')}</Badge>}
                        </div>
                        <p className={`text-xs ${isCompleted || isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                          {step.desc}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{step.date}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* AI Insight */}
            <AIBubble title={t('b6.statusUpdate')} className="mb-4">
              {t('b6.statusMessage')}
            </AIBubble>

            {/* Documents */}
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('b6.documents')}</h3>
            <Card className="mb-6">
              <div className="space-y-3">
                {Array.isArray(docsText) && docsText.map((name, i) => {
                  const meta = DOC_STATUS[i] || { status: 'pending', date: '' }
                  return (
                    <div key={i} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText size={14} className={meta.status === 'ready' ? 'text-eigen-green' : 'text-gray-300'} />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 truncate">{name}</p>
                          <p className="text-[10px] text-gray-400">{meta.status === 'ready' ? meta.date : t('b6.docExpected', { date: meta.date })}</p>
                        </div>
                      </div>
                      {meta.status === 'ready' ? (
                        <Badge color="green">{t('b6.ready')}</Badge>
                      ) : (
                        <Badge color="amber">{t('b6.pending')}</Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Simulate completion button (for demo) */}
            <Button
              variant="primary"
              fullWidth
              onClick={handleSimulateComplete}
              className="bg-eigen-orange hover:bg-orange-600"
            >
              <div className="flex items-center justify-center gap-2">
                <Key size={16} />
                {t('b6.simulateBtn')}
              </div>
            </Button>
          </>
        )}
      </div>
    </AppShell>
  )
}

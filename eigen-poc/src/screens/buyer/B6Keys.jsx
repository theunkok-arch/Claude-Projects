import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, CheckCircle, Circle, FileText, Building2, Home, PartyPopper, Calendar, Clock, Sparkles } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import AIBubble from '../../components/ai/AIBubble'

const CLOSING_STEPS = [
  {
    id: 1,
    title: 'Bid Accepted',
    desc: 'Seller accepted your offer',
    date: '11 Apr 2026',
    status: 'completed',
    icon: CheckCircle,
  },
  {
    id: 2,
    title: '3-Day Cooling Off',
    desc: 'Legal reflection period (bedenktijd)',
    date: '11–14 Apr 2026',
    status: 'completed',
    icon: Clock,
  },
  {
    id: 3,
    title: 'Building Inspection',
    desc: 'Professional structural assessment',
    date: '16 Apr 2026',
    status: 'completed',
    icon: Building2,
  },
  {
    id: 4,
    title: 'Mortgage Finalization',
    desc: 'Final mortgage offer from your bank',
    date: '22 Apr 2026',
    status: 'active',
    icon: FileText,
  },
  {
    id: 5,
    title: 'Notary Appointment',
    desc: 'Sign the koopakte (purchase deed)',
    date: '28 Apr 2026',
    status: 'upcoming',
    icon: FileText,
  },
  {
    id: 6,
    title: 'Key Handover',
    desc: 'Receive the keys to your new home!',
    date: '15 May 2026',
    status: 'upcoming',
    icon: Key,
  },
]

const DOCUMENTS = [
  { name: 'Purchase Agreement (Koopakte)', status: 'ready', date: '14 Apr' },
  { name: 'Building Inspection Report', status: 'ready', date: '16 Apr' },
  { name: 'Mortgage Offer', status: 'pending', date: 'Expected 22 Apr' },
  { name: 'Notary Transfer Deed', status: 'pending', date: 'Expected 28 Apr' },
  { name: 'Energy Label Certificate', status: 'ready', date: '11 Apr' },
  { name: 'VvE Documentation', status: 'ready', date: '12 Apr' },
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
  const [showCelebration, setShowCelebration] = useState(false)

  const completedSteps = CLOSING_STEPS.filter((s) => s.status === 'completed').length
  const totalSteps = CLOSING_STEPS.length
  const progress = (completedSteps / totalSteps) * 100

  // Days until key handover
  const keyDate = new Date('2026-05-15')
  const today = new Date()
  const daysUntilKeys = Math.max(0, Math.ceil((keyDate - today) / (1000 * 60 * 60 * 24)))

  const handleSimulateComplete = () => {
    setShowCelebration(true)
  }

  return (
    <AppShell title="Closing Process" flow="buy">
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
              <h2 className="text-3xl font-bold text-eigen-navy mb-2">Congratulations!</h2>
              <p className="text-lg text-gray-600 mb-1">The keys are yours!</p>
              <p className="text-sm text-gray-400 mb-6">Welcome to your new home at Prinsengracht 263</p>

              <Card className="bg-gradient-to-br from-eigen-navy to-[#1E4D7B] text-white text-left mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <Home size={20} className="text-eigen-orange" />
                  <p className="font-bold text-lg">Prinsengracht 263</p>
                </div>
                <p className="text-sm text-white/70">1016 GV Amsterdam</p>
                <p className="text-sm text-white/70 mt-1">Your EIGEN journey is complete. No makelaar needed.</p>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs text-white/50">Saved vs traditional makelaar</p>
                  <p className="text-2xl font-bold text-eigen-orange">€8.680</p>
                </div>
              </Card>

              <Button variant="primary" fullWidth onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </motion.div>
          </>
        ) : (
          <>
            {/* Countdown card */}
            <Card className="bg-gradient-to-r from-eigen-blue to-blue-600 text-white mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/60">Keys in</p>
                  <p className="text-4xl font-bold">{daysUntilKeys}</p>
                  <p className="text-sm text-white/70">days</p>
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
                <p className="text-sm font-semibold text-eigen-navy">Closing Progress</p>
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
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Timeline</h3>
            <div className="relative mb-6">
              {/* Vertical connector */}
              <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-gray-200" />

              <div className="space-y-1">
                {CLOSING_STEPS.map((step, i) => {
                  const Icon = step.icon
                  const isCompleted = step.status === 'completed'
                  const isActive = step.status === 'active'
                  const isUpcoming = step.status === 'upcoming'
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
                          {isActive && <Badge color="blue">In Progress</Badge>}
                          {isCompleted && <Badge color="green">Done</Badge>}
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
            <AIBubble title="Status Update" className="mb-4">
              Your mortgage finalization is in progress. Based on typical timelines, you should receive
              your final offer by April 22nd. Everything is on track for your May 15th key handover.
              I'll notify you when documents are ready for signing.
            </AIBubble>

            {/* Documents */}
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Documents</h3>
            <Card className="mb-6">
              <div className="space-y-3">
                {DOCUMENTS.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText size={14} className={doc.status === 'ready' ? 'text-eigen-green' : 'text-gray-300'} />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 truncate">{doc.name}</p>
                        <p className="text-[10px] text-gray-400">{doc.date}</p>
                      </div>
                    </div>
                    {doc.status === 'ready' ? (
                      <Badge color="green">Ready</Badge>
                    ) : (
                      <Badge color="amber">Pending</Badge>
                    )}
                  </div>
                ))}
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
                Simulate Key Handover (Demo)
              </div>
            </Button>
          </>
        )}
      </div>
    </AppShell>
  )
}

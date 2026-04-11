import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, Heart, CalendarCheck, Check, X, Clock, ChevronLeft, ChevronRight, Bell, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Chip from '../../components/ui/Chip'
import Toggle from '../../components/ui/Toggle'
import Modal from '../../components/ui/Modal'
import AIBubble from '../../components/ai/AIBubble'
import useSellerStore from '../../stores/sellerStore'
import useAnimateNumber from '../../hooks/useAnimateNumber'
import { generateAnalytics, getAnalyticsSummary } from '../../data/mockAnalytics'
import { formatCurrency } from '../../utils/formatCurrency'

const ACTIVITY_EVENTS = [
  { type: 'request', time: '2h ago', text: 'New viewing request from a buyer in Utrecht', color: 'bg-eigen-orange' },
  { type: 'save', time: '4h ago', text: 'Your listing was saved by 3 new buyers', color: 'bg-eigen-blue' },
  { type: 'view', time: '6h ago', text: '100 views milestone reached!', color: 'bg-eigen-green' },
  { type: 'request', time: '1d ago', text: 'Viewing request from pre-qualified buyer', color: 'bg-eigen-orange' },
  { type: 'save', time: '1d ago', text: 'Listing saved by a buyer in Amsterdam', color: 'bg-eigen-blue' },
  { type: 'view', time: '2d ago', text: 'Your listing appeared in 45 search results today', color: 'bg-eigen-blue' },
  { type: 'offer', time: '3d ago', text: 'First offer received!', color: 'bg-eigen-green' },
  { type: 'view', time: '3d ago', text: 'Listing went live — first 20 views in 2 hours', color: 'bg-eigen-green' },
]

const MOCK_VIEWING_REQUESTS = [
  { id: 1, buyerType: 'Starter', date: '2026-04-14', time: '14:00', message: 'Very interested, can be flexible on time', prequalified: true },
  { id: 2, buyerType: 'Doorstromer', date: '2026-04-15', time: '10:30', message: 'Would love to see the garden and kitchen', prequalified: true },
  { id: 3, buyerType: 'Investor', date: '2026-04-16', time: '16:00', message: '', prequalified: false },
]

const TYPE_COLORS = { Starter: 'blue', Doorstromer: 'purple', Investor: 'gray' }

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
]

function Sparkline({ data, dataKey, color }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data}>
        <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.1} strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function MetricCard({ icon: Icon, label, value, subtitle, subtitleColor, sparkData, sparkKey, sparkColor }) {
  const animatedValue = useAnimateNumber(value, 800)
  return (
    <Card className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={14} className="text-gray-400" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-eigen-navy">{animatedValue.toLocaleString('nl-NL')}</p>
      <p className={`text-xs font-medium ${subtitleColor || 'text-eigen-green'}`}>{subtitle}</p>
      {sparkData && (
        <div className="mt-2 -mx-1">
          <Sparkline data={sparkData} dataKey={sparkKey} color={sparkColor} />
        </div>
      )}
    </Card>
  )
}

function MiniCalendar({ confirmedDates }) {
  // Show a week view starting from today
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    return d
  })
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="grid grid-cols-7 gap-1 mt-2">
      {days.map((d, i) => {
        const dateStr = d.toISOString().slice(0, 10)
        const isConfirmed = confirmedDates.some((c) => c.date === dateStr)
        const isToday = i === 0
        return (
          <div
            key={i}
            className={`text-center py-1.5 rounded-lg text-xs ${
              isConfirmed
                ? 'bg-eigen-green text-white font-bold'
                : isToday
                ? 'bg-eigen-blue/10 text-eigen-blue font-medium'
                : 'bg-gray-50 text-gray-500'
            }`}
          >
            <p className="text-[10px]">{dayNames[d.getDay()]}</p>
            <p className="font-semibold">{d.getDate()}</p>
            {isConfirmed && <p className="text-[8px] mt-0.5">{confirmedDates.find((c) => c.date === dateStr)?.time}</p>}
          </div>
        )
      })}
    </div>
  )
}

function ViewingRequests() {
  const [requests, setRequests] = useState(MOCK_VIEWING_REQUESTS)
  const [confirmedViewings, setConfirmedViewings] = useState([])
  const [suggestModal, setSuggestModal] = useState(null)
  const [suggestedTime, setSuggestedTime] = useState('10:00')
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleAccept = (req) => {
    setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: 'accepted' } : r))
    setConfirmedViewings((prev) => [...prev, { date: req.date, time: req.time }])
    showToast(`Viewing confirmed for ${req.date} at ${req.time}`)
  }

  const handleDecline = (req) => {
    setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: 'declined' } : r))
    showToast('Viewing request declined')
  }

  const handleSuggestAlternative = () => {
    if (!suggestModal) return
    setRequests((prev) => prev.map((r) =>
      r.id === suggestModal.id ? { ...r, status: 'suggested', suggestedTime: suggestedTime } : r
    ))
    showToast(`Alternative time suggested: ${suggestedTime}`)
    setSuggestModal(null)
  }

  const pendingRequests = requests.filter((r) => !r.status)
  const handledRequests = requests.filter((r) => r.status)

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Viewing Requests
        {pendingRequests.length > 0 && (
          <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-eigen-orange text-white text-[10px] font-bold rounded-full">
            {pendingRequests.length}
          </span>
        )}
      </h3>

      {/* Pending requests */}
      <div className="space-y-3 mb-3">
        {pendingRequests.map((req) => (
          <Card key={req.id}>
            <div className="flex items-center justify-between mb-2">
              <Badge color={TYPE_COLORS[req.buyerType]}>{req.buyerType}</Badge>
              {req.prequalified && (
                <span className="text-[10px] text-eigen-green font-medium flex items-center gap-0.5">
                  <Check size={10} /> Pre-qualified
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck size={14} className="text-gray-400" />
              <span className="text-sm font-medium text-eigen-navy">{req.date}</span>
              <Clock size={14} className="text-gray-400 ml-1" />
              <span className="text-sm font-medium text-eigen-navy">{req.time}</span>
            </div>

            {req.message && (
              <p className="text-xs text-gray-500 mb-3 italic">"{req.message}"</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="success"
                className="flex-1 text-xs h-10"
                onClick={() => handleAccept(req)}
              >
                <div className="flex items-center justify-center gap-1"><Check size={12} /> Accept</div>
              </Button>
              <Button
                variant="buyer"
                className="flex-1 text-xs h-10"
                onClick={() => { setSuggestModal(req); setSuggestedTime('10:00') }}
              >
                <div className="flex items-center justify-center gap-1"><Clock size={12} /> Suggest Alt.</div>
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-xs h-10 border-gray-300"
                onClick={() => handleDecline(req)}
              >
                <div className="flex items-center justify-center gap-1"><X size={12} /> Decline</div>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Handled requests */}
      {handledRequests.length > 0 && (
        <div className="space-y-2 mb-3">
          {handledRequests.map((req) => (
            <Card key={req.id} className={`py-3 ${req.status === 'declined' ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge color={TYPE_COLORS[req.buyerType]}>{req.buyerType}</Badge>
                  <span className="text-sm text-gray-600">{req.date} at {req.status === 'suggested' ? req.suggestedTime : req.time}</span>
                </div>
                {req.status === 'accepted' && <Badge color="green">Confirmed</Badge>}
                {req.status === 'suggested' && <Badge color="amber">Alt. Sent</Badge>}
                {req.status === 'declined' && <Badge color="red">Declined</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Mini calendar for confirmed viewings */}
      {confirmedViewings.length > 0 && (
        <Card className="mb-3 bg-green-50 border-eigen-green/20">
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck size={14} className="text-eigen-green" />
            <span className="text-xs font-semibold text-eigen-green uppercase">Upcoming Viewings</span>
          </div>
          <MiniCalendar confirmedDates={confirmedViewings} />
        </Card>
      )}

      {pendingRequests.length === 0 && handledRequests.length === 0 && (
        <Card className="text-center py-6 mb-3">
          <p className="text-sm text-gray-400">No viewing requests yet</p>
        </Card>
      )}

      {/* Suggest Alternative Modal */}
      <Modal
        open={!!suggestModal}
        onClose={() => setSuggestModal(null)}
        title="Suggest Alternative Time"
      >
        {suggestModal && (
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Original request: <strong>{suggestModal.date} at {suggestModal.time}</strong>
            </p>
            <p className="text-sm font-medium text-gray-700 mb-2">Select a time:</p>
            <div className="grid grid-cols-3 gap-2 mb-4 max-h-48 overflow-y-auto">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSuggestedTime(slot)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    suggestedTime === slot
                      ? 'bg-eigen-blue text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSuggestModal(null)}>
                Cancel
              </Button>
              <Button variant="buyer" className="flex-1" onClick={handleSuggestAlternative}>
                Send Suggestion
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-eigen-green text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50"
          >
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function S5Dashboard() {
  const navigate = useNavigate()
  const { notificationPrefs, setNotificationPref, valuation } = useSellerStore()
  const [chartRange, setChartRange] = useState(14)

  const analytics = useMemo(() => generateAnalytics(30), [])
  const summary = useMemo(() => getAnalyticsSummary(analytics), [analytics])

  const chartData = analytics.slice(-chartRange)
  const last7 = analytics.slice(-7)

  const savingsAmount = formatCurrency(Math.round((valuation?.estimate || 425000) * 0.015 - 695))

  return (
    <AppShell title="LIVE Dashboard" step={5} totalSteps={8} flow="sell">
      <div className="px-4 pt-4 pb-32">
        {/* Status badge */}
        <div className="flex items-center justify-between mb-1">
          <Badge color="green">LIVE — Day 3</Badge>
        </div>
        <p className="text-sm text-eigen-orange font-medium mb-4">
          You're saving {savingsAmount} vs a makelaar
        </p>

        {/* Key metrics */}
        <div className="flex gap-3 mb-6">
          <MetricCard
            icon={Eye}
            label="Views"
            value={summary.totalViews}
            subtitle={`${summary.viewsTrend > 0 ? '+' : ''}${summary.viewsTrend}% this week`}
            subtitleColor={summary.viewsTrend > 0 ? 'text-eigen-green' : 'text-eigen-red'}
            sparkData={last7}
            sparkKey="views"
            sparkColor="#3B82F6"
          />
          <MetricCard
            icon={Heart}
            label="Saves"
            value={summary.totalSaves}
            subtitle="Top 15%"
            sparkData={last7}
            sparkKey="saves"
            sparkColor="#22C55E"
          />
          <MetricCard
            icon={CalendarCheck}
            label="Requests"
            value={summary.totalViewingRequests}
            subtitle="On track"
            sparkData={last7}
            sparkKey="viewingRequests"
            sparkColor="#FF6B35"
          />
        </div>

        {/* Engagement Funnel */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Engagement Funnel</h3>
        <Card className="mb-4">
          {[
            { label: 'Views', value: summary.totalViews, color: 'bg-eigen-navy', width: 100 },
            { label: 'Saves', value: summary.totalSaves, color: 'bg-eigen-blue', width: (summary.totalSaves / summary.totalViews) * 100 },
            { label: 'Requests', value: summary.totalViewingRequests, color: 'bg-blue-300', width: (summary.totalViewingRequests / summary.totalViews) * 100 },
            { label: 'Offers', value: 1, color: 'bg-eigen-green', width: (1 / summary.totalViews) * 100 },
          ].map((step, i, arr) => (
            <div key={step.label} className="mb-2 last:mb-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600">{step.label}</span>
                <span className="font-semibold text-eigen-navy">{step.value.toLocaleString('nl-NL')}</span>
              </div>
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${step.color} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(step.width, 2)}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                />
              </div>
              {i < arr.length - 1 && (
                <p className="text-[10px] text-gray-400 text-right mt-0.5">
                  {((arr[i + 1].value / step.value) * 100).toFixed(1)}% →
                </p>
              )}
            </div>
          ))}
        </Card>

        <AIBubble className="mb-6">
          {((summary.totalSaves / summary.totalViews) * 100).toFixed(0)}% of viewers saved your listing
          (avg: 8%) — your photos are working well.
        </AIBubble>

        {/* Views Over Time Chart */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Views Over Time</h3>
          <div className="flex gap-1">
            {[7, 14, 30].map((d) => (
              <Chip key={d} label={`${d}d`} active={chartRange === d} onClick={() => setChartRange(d)} />
            ))}
          </div>
        </div>
        <Card className="mb-6">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e5e5' }}
                labelFormatter={(l) => l}
                formatter={(v) => [v, 'Views']}
              />
              <Bar dataKey="views" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent Activity Timeline */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Activity</h3>
        <div className="relative pl-6 mb-6">
          {/* Vertical line */}
          <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-200" />
          {ACTIVITY_EVENTS.map((event, i) => (
            <div key={i} className="relative flex items-start gap-3 mb-4 last:mb-0">
              <div className={`absolute left-[-16px] top-1.5 w-3 h-3 rounded-full ${event.color} border-2 border-white`} />
              <div>
                <p className="text-sm text-gray-700">{event.text}</p>
                <p className="text-xs text-gray-400">{event.time}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Viewing Requests Section */}
        <ViewingRequests />

        {/* Notification Preferences */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Notification Preferences</h3>
        <Card>
          <div className="space-y-4">
            {[
              { key: 'viewingRequest', label: 'New viewing request' },
              { key: 'newOffer', label: 'New offer received' },
              { key: 'milestones', label: 'Listing milestones (100, 500 views)' },
              { key: 'weeklySummary', label: 'Weekly performance summary' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{label}</span>
                <Toggle
                  enabled={notificationPrefs[key]}
                  onToggle={() => setNotificationPref(key, !notificationPrefs[key])}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <BottomCTA>
        <div className="relative">
          <Button variant="primary" fullWidth onClick={() => navigate('/sell/bids')}>
            View Offers →
          </Button>
          <span className="absolute -top-2 -right-1 bg-eigen-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            1 new
          </span>
        </div>
      </BottomCTA>
    </AppShell>
  )
}

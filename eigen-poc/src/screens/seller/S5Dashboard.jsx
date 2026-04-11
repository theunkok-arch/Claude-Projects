import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, Heart, CalendarCheck, FileText, Bell, BellOff, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Chip from '../../components/ui/Chip'
import Toggle from '../../components/ui/Toggle'
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

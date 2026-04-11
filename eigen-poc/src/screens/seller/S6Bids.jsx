import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpDown, Check, MessageSquare, X, Sparkles } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import AIBubble from '../../components/ai/AIBubble'
import AITyping from '../../components/ai/AITyping'
import useSellerStore from '../../stores/sellerStore'
import { formatCurrency } from '../../utils/formatCurrency'

const INITIAL_BIDS = [
  { id: 1, bidder: 'Familie De Vries', amount: 498500, financing: 'Mortgage (ING)', conditions: ['Financing clause', 'Inspection clause'], closingDate: '2026-06-15', speed: '6-8 weeks', risk: 'Medium', status: 'pending', prequalified: true },
  { id: 2, bidder: 'J. Thompson', amount: 495000, financing: 'Mortgage (Rabobank)', conditions: ['Financing clause'], closingDate: '2026-06-01', speed: '4-6 weeks', risk: 'Medium', status: 'pending', prequalified: true },
  { id: 3, bidder: 'David R.', amount: 485000, financing: 'Cash', conditions: [], closingDate: '2026-05-15', speed: '2 weeks', risk: 'Low', status: 'pending', prequalified: true },
]

const AI_ANALYSIS = `De Vries offers €498.500 — the highest price, but includes a financing clause and inspection clause, meaning a 6-8 week close with some financing risk. Thompson offers €495.000 with only a financing clause — slightly less but fewer conditions. David R. offers €485.000 cash with zero conditions — closes in just 2 weeks. If certainty and speed matter more than maximizing price, David R. is your safest bet.`

const RISK_COLORS = { Low: 'green', Medium: 'amber', High: 'red' }

function ComparisonMatrix({ bids, sortKey, onSort }) {
  const rows = [
    { key: 'amount', label: 'Price', render: (b) => formatCurrency(b.amount), best: (vals) => Math.max(...vals) },
    { key: 'financing', label: 'Financing', render: (b) => b.financing },
    { key: 'conditions', label: 'Conditions', render: (b) => b.conditions.length === 0 ? 'None' : b.conditions.join(', '), best: (vals) => Math.min(...vals.map(v => typeof v === 'string' ? v.split(',').length : 0)) },
    { key: 'speed', label: 'Speed', render: (b) => b.speed },
    { key: 'risk', label: 'Risk', render: (b) => b.risk },
  ]

  return (
    <div className="overflow-x-auto -mx-4 px-4 mb-4">
      <table className="w-full min-w-[500px] border-collapse">
        <thead>
          <tr>
            <th className="text-left text-xs text-gray-500 font-medium p-2 w-24" />
            {bids.map((b) => (
              <th key={b.id} className={`text-center p-2 rounded-t-xl ${b.status === 'rejected' ? 'opacity-50' : ''}`}>
                <div className="bg-eigen-navy text-white text-xs font-semibold py-2 px-3 rounded-lg">
                  {b.bidder}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-gray-100">
              <td className="text-xs text-gray-500 font-medium p-2">{row.label}</td>
              {bids.map((b) => {
                const val = row.render(b)
                const isBestPrice = row.key === 'amount' && b.amount === Math.max(...bids.filter(x => x.status !== 'rejected').map(x => x.amount))
                const isBestRisk = row.key === 'risk' && b.risk === 'Low'
                const highlight = (isBestPrice || isBestRisk) && b.status !== 'rejected'
                return (
                  <td key={b.id} className={`text-center text-sm p-2 ${b.status === 'rejected' ? 'opacity-50' : ''} ${highlight ? 'text-eigen-green font-semibold' : 'text-gray-700'}`}>
                    {row.key === 'risk' ? <Badge color={RISK_COLORS[b.risk]}>{val}</Badge> : val}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function S6Bids() {
  const navigate = useNavigate()
  const { setAcceptedBid } = useSellerStore()
  const [bids, setBids] = useState(INITIAL_BIDS)
  const [sortBy, setSortBy] = useState('amount')
  const [acceptModal, setAcceptModal] = useState(null)
  const [counterModal, setCounterModal] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [counterPrice, setCounterPrice] = useState('')
  const [counterMessage, setCounterMessage] = useState('')
  const [rejectMessage, setRejectMessage] = useState('')

  const sortedBids = useMemo(() => {
    return [...bids].sort((a, b) => {
      if (sortBy === 'amount') return b.amount - a.amount
      if (sortBy === 'speed') return a.speed.localeCompare(b.speed)
      if (sortBy === 'risk') {
        const order = { Low: 0, Medium: 1, High: 2 }
        return order[a.risk] - order[b.risk]
      }
      return 0
    })
  }, [bids, sortBy])

  const handleAccept = (bid) => {
    setAcceptedBid(bid)
    setBids((prev) => prev.map((b) => ({ ...b, status: b.id === bid.id ? 'accepted' : 'rejected' })))
    setAcceptModal(null)
    setTimeout(() => navigate('/sell/closed'), 500)
  }

  const handleCounter = (bid) => {
    setBids((prev) => prev.map((b) => b.id === bid.id ? { ...b, status: 'countered' } : b))
    setCounterModal(null)
    setCounterPrice('')
    setCounterMessage('')
  }

  const handleReject = (bid) => {
    setBids((prev) => prev.map((b) => b.id === bid.id ? { ...b, status: 'rejected' } : b))
    setRejectModal(null)
    setRejectMessage('')
  }

  return (
    <AppShell title="Incoming Bids" step={6} totalSteps={8} flow="sell">
      <div className="px-4 pt-4 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-eigen-navy">You have {bids.filter(b => b.status === 'pending').length} offers</h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700"
          >
            <option value="amount">Highest Price</option>
            <option value="speed">Fastest Close</option>
            <option value="risk">Lowest Risk</option>
          </select>
        </div>

        {/* Comparison Matrix */}
        <ComparisonMatrix bids={sortedBids} />

        {/* AI Recommendation */}
        <div className="mb-6">
          <AITyping text={AI_ANALYSIS} speed={30} />
        </div>

        {/* Individual Offer Cards */}
        <div className="space-y-4">
          {sortedBids.map((bid) => (
            <motion.div key={bid.id} layout>
              <Card className={`${bid.status === 'rejected' ? 'opacity-50' : ''} ${bid.status === 'countered' ? 'border-eigen-amber' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-eigen-navy">{bid.bidder}</p>
                    <p className="text-2xl font-bold text-eigen-navy">{formatCurrency(bid.amount)}</p>
                  </div>
                  {bid.status === 'countered' && <Badge color="amber">Counter Sent</Badge>}
                  {bid.status === 'rejected' && <Badge color="red">Rejected</Badge>}
                  {bid.status === 'accepted' && <Badge color="green">Accepted</Badge>}
                  {bid.status === 'pending' && bid.prequalified && <Badge color="green">Pre-qualified</Badge>}
                </div>

                <div className="space-y-1.5 mb-3 text-sm text-gray-600">
                  <p><span className="text-gray-400">Financing:</span> {bid.financing}</p>
                  <p><span className="text-gray-400">Conditions:</span> {bid.conditions.length === 0 ? 'None' : bid.conditions.join(', ')}</p>
                  <p><span className="text-gray-400">Closing:</span> {bid.closingDate} ({bid.speed})</p>
                  <p><span className="text-gray-400">Risk:</span> <Badge color={RISK_COLORS[bid.risk]}>{bid.risk}</Badge></p>
                </div>

                {bid.status === 'pending' && (
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <Button variant="success" className="flex-1 text-sm h-10" onClick={() => setAcceptModal(bid)}>
                      <div className="flex items-center justify-center gap-1"><Check size={14} /> Accept</div>
                    </Button>
                    <Button variant="buyer" className="flex-1 text-sm h-10" onClick={() => { setCounterModal(bid); setCounterPrice(Math.round((bid.amount + (bid.amount * 1.03)) / 2).toString()) }}>
                      <div className="flex items-center justify-center gap-1"><MessageSquare size={14} /> Counter</div>
                    </Button>
                    <Button variant="outline" className="flex-1 text-sm h-10 border-eigen-red text-eigen-red" onClick={() => setRejectModal(bid)}>
                      <div className="flex items-center justify-center gap-1"><X size={14} /> Reject</div>
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Accept Modal */}
      <Modal open={!!acceptModal} onClose={() => setAcceptModal(null)} title="Accept Offer">
        {acceptModal && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Accept offer from <strong>{acceptModal.bidder}</strong> for <strong>{formatCurrency(acceptModal.amount)}</strong>?
              This will reject all other bids.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAcceptModal(null)}>Cancel</Button>
              <Button variant="success" className="flex-1" onClick={() => handleAccept(acceptModal)}>Confirm Accept</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Counter Modal */}
      <Modal open={!!counterModal} onClose={() => setCounterModal(null)} title="Counter Offer">
        {counterModal && (
          <div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Counter Price</label>
                <input
                  type="text"
                  value={counterPrice ? formatCurrency(Number(counterPrice)) : ''}
                  onChange={(e) => setCounterPrice(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 text-base"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Message to buyer</label>
                <textarea
                  value={counterMessage}
                  onChange={(e) => setCounterMessage(e.target.value.slice(0, 300))}
                  maxLength={300}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm resize-none"
                  placeholder="Optional message..."
                />
                <span className="text-xs text-gray-400">{counterMessage.length}/300</span>
              </div>
            </div>
            <AIBubble className="mb-4">
              Based on market data, we suggest countering at {formatCurrency(Math.round(counterModal.amount * 1.02))}.
              Buyers in this range typically accept counters within 3% of their original bid.
            </AIBubble>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCounterModal(null)}>Cancel</Button>
              <Button variant="buyer" className="flex-1" onClick={() => handleCounter(counterModal)}>Send Counter</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Offer">
        {rejectModal && (
          <div>
            <p className="text-sm text-gray-600 mb-3">Reject offer from <strong>{rejectModal.bidder}</strong>?</p>
            <textarea
              value={rejectMessage}
              onChange={(e) => setRejectMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm resize-none mb-4"
              placeholder="Optional message to buyer..."
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejectModal(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" onClick={() => handleReject(rejectModal)}>Confirm Rejection</Button>
            </div>
          </div>
        )}
      </Modal>

      <BottomCTA>
        <Button variant="outline" fullWidth className="border-eigen-purple text-eigen-purple" onClick={() => navigate('/sell/explore')}>
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={16} /> Not ready to accept? Try Stille Verkoop
          </div>
        </Button>
      </BottomCTA>
    </AppShell>
  )
}

import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, Search, Home, RotateCcw, Bed, Bath, Ruler, Zap, ArrowRight } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import AIBubble from '../../components/ai/AIBubble'
import AITyping from '../../components/ai/AITyping'
import Badge from '../../components/ui/Badge'
import useBuyerStore from '../../stores/buyerStore'
import mockProperties from '../../data/mockProperties'
import { formatPrice } from '../../data/mockProperties'
import {
  parseNaturalQuery,
  filterAndScore,
  generateSmartFilters,
  determineClarification,
  generateMatchReason,
} from '../../utils/filterProperties'

// ---- Animation variants ----
const msgEnter = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8 },
}

// ---- Deterministic placeholder colors ----
const PLACEHOLDER_COLORS = [
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-emerald-600',
  'from-violet-400 to-violet-600',
  'from-amber-400 to-amber-600',
  'from-rose-400 to-rose-600',
  'from-cyan-400 to-cyan-600',
  'from-indigo-400 to-indigo-600',
  'from-orange-400 to-orange-600',
]

function getPlaceholderColor(id) {
  return PLACEHOLDER_COLORS[(id - 1) % PLACEHOLDER_COLORS.length]
}

// ---- Suggestion chips ----
const SUGGESTIONS = [
  'Family home in Utrecht',
  'Apartment in Amsterdam',
  'House with garden under 500k',
]

const AI_GREETING =
  "Hi! I'm your EIGEN home-finder. Tell me what you're looking for — city, budget, size, must-haves — and I'll instantly score every listing for you. Or tap a suggestion below to get started."

// ---- Unique ID generator ----
let msgCounter = 0
function nextId() {
  return `msg-${Date.now()}-${++msgCounter}`
}

// ============================================================
// B1Search — Conversational AI Search
// ============================================================
export default function B1Search() {
  const navigate = useNavigate()
  const {
    chatMessages,
    parsedCriteria,
    addChatMessage,
    clearChat,
    setParsedCriteria,
    setScoredResults,
    setSmartFilters,
  } = useBuyerStore()

  const [input, setInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [typingMsgId, setTypingMsgId] = useState(null)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [chatMessages.length, isSearching])

  // ---- Handle user input ----
  const handleSubmit = useCallback(
    (text) => {
      const trimmed = (text || input).trim()
      if (!trimmed || isSearching) return
      setInput('')

      // Add user message
      addChatMessage({
        id: nextId(),
        role: 'user',
        text: trimmed,
        timestamp: Date.now(),
      })

      // Parse and merge criteria
      const newCriteria = parseNaturalQuery(trimmed)

      // Handle "Show all cities" / "Surprise me" — skip city filter
      const isShowAll = /show all|surprise|all cities|everywhere|heel nederland/i.test(trimmed)

      const merged = {
        ...parsedCriteria,
        ...newCriteria,
        city: isShowAll ? null : newCriteria.city || parsedCriteria.city,
        propertyType: newCriteria.propertyType || parsedCriteria.propertyType,
        minPrice: newCriteria.minPrice || parsedCriteria.minPrice,
        maxPrice: newCriteria.maxPrice || parsedCriteria.maxPrice,
        minBedrooms: newCriteria.minBedrooms || parsedCriteria.minBedrooms,
        features:
          newCriteria.features.length > 0
            ? [...new Set([...(parsedCriteria.features || []), ...newCriteria.features])]
            : parsedCriteria.features || [],
        energyLabel: newCriteria.energyLabel || parsedCriteria.energyLabel,
        minArea: newCriteria.minArea || parsedCriteria.minArea,
      }
      setParsedCriteria(merged)

      // Check if we need clarification
      const clarification = determineClarification(merged)

      if (clarification && !isShowAll) {
        const aiMsg = {
          id: nextId(),
          role: 'ai',
          text: clarification.text,
          timestamp: Date.now(),
          clarifyOptions: clarification.options,
        }
        setTypingMsgId(aiMsg.id)
        setTimeout(() => {
          addChatMessage(aiMsg)
          setTypingMsgId(null)
        }, 600)
        return
      }

      // Sufficient criteria — run search
      setIsSearching(true)
      setTimeout(() => {
        const scored = filterAndScore(mockProperties, merged)
        const filters = generateSmartFilters(scored)

        setScoredResults(scored)
        setSmartFilters(filters)

        const topMatch = scored[0]
        const count = scored.length
        let responseText
        if (count === 0) {
          responseText = "I couldn't find exact matches, but let me broaden the search for you."
        } else if (count === 1) {
          responseText = `I found 1 property that matches — a ${topMatch.type.toLowerCase()} in ${topMatch.city}'s ${topMatch.neighbourhood} at ${topMatch.matchScore}% match.`
        } else {
          responseText = `I found ${count} properties for you! Your best match is ${topMatch.matchScore}% — a ${topMatch.type.toLowerCase()} in ${topMatch.city}'s ${topMatch.neighbourhood}. Here are the top results:`
        }

        const aiMsg = {
          id: nextId(),
          role: 'ai',
          text: responseText,
          timestamp: Date.now(),
          results: scored.slice(0, 3),
        }
        setTypingMsgId(aiMsg.id)
        addChatMessage(aiMsg)
        setIsSearching(false)
      }, 1500)
    },
    [input, isSearching, parsedCriteria, addChatMessage, setParsedCriteria, setScoredResults, setSmartFilters]
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSeeAll = () => navigate('/buy/results')

  const handleNewSearch = () => {
    clearChat()
    setInput('')
    setIsSearching(false)
    setTypingMsgId(null)
  }

  const isConversationEmpty = chatMessages.length === 0

  return (
    <AppShell title="AI Search" step={1} totalSteps={6} flow="buy">
      <div className="flex flex-col h-[calc(100dvh-56px)]">
        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-3">
          {!isConversationEmpty && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleNewSearch}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-eigen-blue mx-auto mb-2"
            >
              <RotateCcw size={12} />
              New search
            </motion.button>
          )}

          {isConversationEmpty && (
            <motion.div {...msgEnter} transition={{ duration: 0.3 }}>
              <WelcomeMessage onSuggestionTap={(text) => handleSubmit(text)} />
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {chatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                {...msgEnter}
                transition={{ duration: 0.25, delay: 0.05 }}
              >
                {msg.role === 'user' ? (
                  <UserMessage text={msg.text} />
                ) : (
                  <AIMessage
                    msg={msg}
                    isTyping={msg.id === typingMsgId}
                    onTypingComplete={() => setTypingMsgId(null)}
                    onOptionTap={(text) => handleSubmit(text)}
                    onPropertyTap={(id) => navigate(`/buy/property/${id}`)}
                    onSeeAll={handleSeeAll}
                    totalResults={useBuyerStore.getState().scoredResults.length}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isSearching && (
            <motion.div {...msgEnter} transition={{ duration: 0.2 }}>
              <SearchingIndicator />
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your ideal home..."
              disabled={isSearching}
              className="flex-1 h-12 px-4 rounded-full border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-eigen-blue focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isSearching}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-eigen-blue text-white disabled:opacity-40 active:scale-95 transition-transform"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

// ============================================================
// Sub-components
// ============================================================

function WelcomeMessage({ onSuggestionTap }) {
  return (
    <div className="space-y-3">
      <AIBubble>
        <p className="text-sm text-gray-700 leading-relaxed">{AI_GREETING}</p>
      </AIBubble>
      <div className="flex flex-wrap gap-2 pl-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestionTap(s)}
            className="px-3 py-2 rounded-full text-xs font-medium bg-eigen-blue-light text-eigen-blue border border-eigen-blue/20 hover:bg-eigen-blue hover:text-white transition-colors active:scale-95"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function UserMessage({ text }) {
  return (
    <div className="flex justify-end">
      <div className="ml-auto bg-eigen-blue text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] text-sm leading-relaxed">
        {text}
      </div>
    </div>
  )
}

function AIMessage({ msg, isTyping, onTypingComplete, onOptionTap, onPropertyTap, onSeeAll, totalResults }) {
  return (
    <div className="space-y-3">
      {isTyping ? (
        <AIBubble>
          <AITyping text={msg.text} speed={50} onComplete={onTypingComplete} />
        </AIBubble>
      ) : (
        <AIBubble>
          <p className="text-sm text-gray-700 leading-relaxed">{msg.text}</p>
        </AIBubble>
      )}

      {msg.clarifyOptions && !isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 pl-1"
        >
          {msg.clarifyOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => onOptionTap(opt)}
              className="px-3 py-2 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-eigen-blue hover:text-white transition-colors active:scale-95"
            >
              {opt}
            </button>
          ))}
        </motion.div>
      )}

      {msg.results && msg.results.length > 0 && !isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2 pl-1"
        >
          {msg.results.map((property, i) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <PropertyMiniCard property={property} onTap={() => onPropertyTap(property.id)} />
            </motion.div>
          ))}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            onClick={onSeeAll}
            className="flex items-center gap-2 w-full justify-center py-3 rounded-xl bg-eigen-blue text-white text-sm font-semibold active:scale-[0.98] transition-transform"
          >
            {totalResults > 3 ? `See all ${totalResults} matches` : 'View results with AI filters'}
            <ArrowRight size={16} />
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}

function PropertyMiniCard({ property, onTap }) {
  const colorClass = getPlaceholderColor(property.id)
  const reason = generateMatchReason(property, property.matchBreakdown || {})

  return (
    <button
      onClick={onTap}
      className="w-full flex gap-3 p-3 rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-shadow text-left active:scale-[0.98]"
    >
      <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center flex-shrink-0`}>
        <Home size={24} className="text-white/80" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-eigen-navy truncate">
              {property.street} {property.number}
            </p>
            <p className="text-xs text-gray-500">{property.city} &middot; {property.neighbourhood}</p>
          </div>
          <Badge color="purple" className="flex-shrink-0">{property.matchScore}%</Badge>
        </div>
        <p className="text-sm font-bold text-eigen-navy mt-1">{formatPrice(property.price)}</p>
        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
          <span className="flex items-center gap-0.5"><Bed size={11} /> {property.bedrooms}</span>
          <span className="flex items-center gap-0.5"><Ruler size={11} /> {property.area}m&sup2;</span>
          <span className="flex items-center gap-0.5"><Zap size={11} /> {property.energyLabel}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1 truncate">{reason}</p>
      </div>
    </button>
  )
}

function SearchingIndicator() {
  return (
    <div className="border-l-4 border-eigen-purple bg-purple-50 rounded-r-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles size={14} className="text-eigen-purple" />
        </motion.div>
        <span className="text-xs font-semibold text-eigen-purple uppercase">AI</span>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-500">Analyzing {mockProperties.length} properties</p>
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-gray-400"
        >
          ...
        </motion.span>
      </div>
    </div>
  )
}

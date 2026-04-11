import { Sparkles, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'

const sentimentConfig = {
  positive: { icon: ThumbsUp, color: 'text-eigen-green', bg: 'bg-green-50', border: 'border-eigen-green' },
  negative: { icon: ThumbsDown, color: 'text-eigen-red', bg: 'bg-red-50', border: 'border-eigen-red' },
  neutral: { icon: Minus, color: 'text-eigen-amber', bg: 'bg-amber-50', border: 'border-eigen-amber' },
}

export default function AIVerdict({ sentiment = 'neutral', title, children }) {
  const config = sentimentConfig[sentiment] || sentimentConfig.neutral
  const SentimentIcon = config.icon

  return (
    <div className={`border-l-4 ${config.border} ${config.bg} rounded-r-2xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-eigen-purple" />
        <span className="text-xs font-semibold text-eigen-purple uppercase tracking-wide">
          AI Verdict
        </span>
        <SentimentIcon size={14} className={config.color} />
      </div>
      {title && (
        <p className={`text-sm font-semibold ${config.color} mb-1`}>{title}</p>
      )}
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  )
}

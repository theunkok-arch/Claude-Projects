import { Sparkles } from 'lucide-react'

export default function AIBubble({ title, children, className = '' }) {
  return (
    <div className={`border-l-4 border-eigen-purple bg-purple-50 rounded-r-2xl p-4 ${className}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles size={14} className="text-eigen-purple" />
        <span className="text-xs font-semibold text-eigen-purple uppercase tracking-wide">
          AI
        </span>
        {title && (
          <span className="text-xs font-semibold text-eigen-purple ml-1">
            — {title}
          </span>
        )}
      </div>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'

export default function AITyping({ text, speed = 30, onComplete, className = '' }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!text) return
    setDisplayed('')
    setDone(false)
    let i = 0

    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(interval)
        setDone(true)
        onComplete?.()
      }
    }, 1000 / speed)

    return () => clearInterval(interval)
  }, [text, speed, onComplete])

  return (
    <div className={`border-l-4 border-eigen-purple bg-purple-50 rounded-r-2xl p-4 ${className}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles size={14} className="text-eigen-purple" />
        <span className="text-xs font-semibold text-eigen-purple uppercase tracking-wide">
          AI
        </span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">
        {displayed}
        {!done && (
          <span className="inline-block w-0.5 h-4 bg-eigen-purple ml-0.5 animate-pulse align-middle" />
        )}
      </p>
    </div>
  )
}

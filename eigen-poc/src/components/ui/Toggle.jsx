import { motion } from 'framer-motion'

export default function Toggle({ enabled, onToggle, label }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3"
      role="switch"
      aria-checked={enabled}
    >
      <div
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          enabled ? 'bg-eigen-green' : 'bg-gray-300'
        }`}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
          animate={{ left: enabled ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </button>
  )
}

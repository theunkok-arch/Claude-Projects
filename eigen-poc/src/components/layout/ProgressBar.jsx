import { motion } from 'framer-motion'

export default function ProgressBar({ step, totalSteps, flow }) {
  const percentage = (step / totalSteps) * 100
  const barColor = flow === 'sell' ? 'bg-eigen-orange' : 'bg-eigen-blue'

  return (
    <div className="w-full h-1 bg-gray-100">
      <motion.div
        className={`h-full ${barColor}`}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  )
}

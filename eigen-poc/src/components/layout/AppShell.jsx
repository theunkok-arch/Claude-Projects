import { motion } from 'framer-motion'
import Header from './Header'
import ProgressBar from './ProgressBar'

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

export default function AppShell({ children, title, step, totalSteps, flow, hideHeader = false }) {
  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {!hideHeader && <Header title={title} flow={flow} />}
      {step && totalSteps && <ProgressBar step={step} totalSteps={totalSteps} flow={flow} />}
      <motion.main
        className="flex-1"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {children}
      </motion.main>
    </div>
  )
}

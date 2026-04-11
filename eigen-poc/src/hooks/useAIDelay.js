import { useState, useEffect } from 'react'

export default function useAIDelay(delayMs = 1500) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs])

  return ready
}

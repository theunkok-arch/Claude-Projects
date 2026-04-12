import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAppStore = create(
  persist(
    (set) => ({
      // User role
      role: null, // 'seller' | 'buyer' | null

      // Onboarding
      onboarded: false,

      // Theme (future)
      darkMode: false,

      // Language preference ('en' | 'nl' — extensible)
      language: 'en',

      // Actions
      setRole: (role) => set({ role }),
      setOnboarded: (val) => set({ onboarded: val }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setLanguage: (language) => set({ language }),
      reset: () => set({ role: null, onboarded: false, darkMode: false, language: 'en' }),
    }),
    { name: 'eigen-app' }
  )
)

export default useAppStore

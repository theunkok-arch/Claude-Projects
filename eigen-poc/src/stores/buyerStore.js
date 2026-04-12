import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_FILTERS = {
  cities: [],            // multi-select
  propertyTypes: [],     // multi-select
  minPrice: null,        // numeric
  maxPrice: null,        // numeric
  minBedrooms: null,     // single "X+" filter
}

const useBuyerStore = create(
  persist(
    (set) => ({
      // B1: Search
      searchQuery: '',
      searchFilters: { ...DEFAULT_FILTERS },

      // B2: Results
      savedProperties: [],

      // B3: Property Detail
      viewedProperties: [],

      // B4: Viewing
      scheduledViewings: [],

      // B5: Bid
      activeBids: [],

      // B6: Keys
      closedDeals: [],

      // Actions
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchFilters: (filters) =>
        set((s) => ({ searchFilters: { ...s.searchFilters, ...filters } })),
      resetFilters: () => set({ searchFilters: { ...DEFAULT_FILTERS } }),
      saveProperty: (id) =>
        set((s) => ({
          savedProperties: s.savedProperties.includes(id)
            ? s.savedProperties
            : [...s.savedProperties, id],
        })),
      unsaveProperty: (id) =>
        set((s) => ({
          savedProperties: s.savedProperties.filter((pid) => pid !== id),
        })),
      markViewed: (id) =>
        set((s) => ({
          viewedProperties: s.viewedProperties.includes(id)
            ? s.viewedProperties
            : [...s.viewedProperties, id],
        })),
      scheduleViewing: (viewing) =>
        set((s) => ({ scheduledViewings: [...s.scheduledViewings, viewing] })),
      placeBid: (bid) =>
        set((s) => ({ activeBids: [...s.activeBids, bid] })),
      closeDeal: (deal) =>
        set((s) => ({ closedDeals: [...s.closedDeals, deal] })),
      reset: () =>
        set({
          searchQuery: '',
          searchFilters: { ...DEFAULT_FILTERS },
          savedProperties: [],
          viewedProperties: [],
          scheduledViewings: [],
          activeBids: [],
          closedDeals: [],
        }),
    }),
    {
      name: 'eigen-buyer',
      version: 2,
      migrate: (persistedState) => {
        // Legacy state used singular `city` and `propertyType` — normalize to arrays
        if (!persistedState) return persistedState
        const sf = persistedState.searchFilters || {}
        persistedState.searchFilters = {
          cities: Array.isArray(sf.cities) ? sf.cities : (sf.city ? [sf.city] : []),
          propertyTypes: Array.isArray(sf.propertyTypes) ? sf.propertyTypes : (sf.propertyType ? [sf.propertyType] : []),
          minPrice: sf.minPrice ?? null,
          maxPrice: sf.maxPrice ?? null,
          minBedrooms: sf.minBedrooms ?? null,
        }
        return persistedState
      },
    }
  )
)

export default useBuyerStore

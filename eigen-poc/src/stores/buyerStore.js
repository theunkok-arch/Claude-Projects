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
      // B1: Search — conversation
      searchQuery: '',
      chatMessages: [],
      parsedCriteria: {
        city: null,
        propertyType: null,
        minPrice: null,
        maxPrice: null,
        minBedrooms: null,
        features: [],
        energyLabel: null,
        minArea: null,
      },

      // B1: Traditional filters (used by filter UI)
      searchFilters: { ...DEFAULT_FILTERS },

      // B1→B2: Scored results
      scoredResults: [],
      smartFilters: [],
      sortBy: 'match',

      // B2: Saved
      savedProperties: [],

      // B3: Property Detail
      viewedProperties: [],

      // B4: Viewing
      scheduledViewings: [],

      // B5: Bid
      activeBids: [],

      // B6: Keys
      closedDeals: [],

      // ---- Actions ----

      // Chat
      addChatMessage: (msg) =>
        set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
      clearChat: () =>
        set({
          chatMessages: [],
          parsedCriteria: {
            city: null,
            propertyType: null,
            minPrice: null,
            maxPrice: null,
            minBedrooms: null,
            features: [],
            energyLabel: null,
            minArea: null,
          },
          scoredResults: [],
          smartFilters: [],
          sortBy: 'match',
          searchQuery: '',
        }),

      // Criteria
      setParsedCriteria: (criteria) =>
        set((s) => ({
          parsedCriteria: {
            ...s.parsedCriteria,
            ...criteria,
            features: criteria.features && criteria.features.length > 0
              ? [...new Set([...(s.parsedCriteria.features || []), ...criteria.features])]
              : s.parsedCriteria.features || [],
          },
        })),

      // Results
      setScoredResults: (results) => set({ scoredResults: results }),
      setSmartFilters: (filters) => set({ smartFilters: filters }),
      toggleSmartFilter: (key) =>
        set((s) => ({
          smartFilters: s.smartFilters.map((f) =>
            f.key === key ? { ...f, active: !f.active } : f
          ),
        })),
      setSortBy: (sortBy) => set({ sortBy }),

      // Traditional filters
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchFilters: (filters) =>
        set((s) => ({ searchFilters: { ...s.searchFilters, ...filters } })),
      resetFilters: () => set({ searchFilters: { ...DEFAULT_FILTERS } }),

      // Saved properties
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

      // Viewed
      markViewed: (id) =>
        set((s) => ({
          viewedProperties: s.viewedProperties.includes(id)
            ? s.viewedProperties
            : [...s.viewedProperties, id],
        })),

      // Viewings
      scheduleViewing: (viewing) =>
        set((s) => ({ scheduledViewings: [...s.scheduledViewings, viewing] })),

      // Bids
      placeBid: (bid) =>
        set((s) => ({ activeBids: [...s.activeBids, bid] })),

      // Closing
      closeDeal: (deal) =>
        set((s) => ({ closedDeals: [...s.closedDeals, deal] })),

      // Full reset
      reset: () =>
        set({
          searchQuery: '',
          chatMessages: [],
          parsedCriteria: {
            city: null,
            propertyType: null,
            minPrice: null,
            maxPrice: null,
            minBedrooms: null,
            features: [],
            energyLabel: null,
            minArea: null,
          },
          scoredResults: [],
          smartFilters: [],
          sortBy: 'match',
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
      version: 3,
      migrate: (persistedState, version) => {
        if (!persistedState) return persistedState

        // v1→v2: normalize singular city/propertyType to arrays
        const sf = persistedState.searchFilters || {}
        persistedState.searchFilters = {
          cities: Array.isArray(sf.cities) ? sf.cities : (sf.city ? [sf.city] : []),
          propertyTypes: Array.isArray(sf.propertyTypes) ? sf.propertyTypes : (sf.propertyType ? [sf.propertyType] : []),
          minPrice: sf.minPrice ?? null,
          maxPrice: sf.maxPrice ?? null,
          minBedrooms: sf.minBedrooms ?? null,
        }

        // v2→v3: add chat/scoring state
        if (version < 3) {
          persistedState.chatMessages = persistedState.chatMessages || []
          persistedState.parsedCriteria = persistedState.parsedCriteria || {
            city: null, propertyType: null, minPrice: null, maxPrice: null,
            minBedrooms: null, features: [], energyLabel: null, minArea: null,
          }
          persistedState.scoredResults = persistedState.scoredResults || []
          persistedState.smartFilters = persistedState.smartFilters || []
          persistedState.sortBy = persistedState.sortBy || 'match'
        }

        return persistedState
      },
    }
  )
)

export default useBuyerStore

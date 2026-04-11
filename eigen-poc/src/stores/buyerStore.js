import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useBuyerStore = create(
  persist(
    (set) => ({
      // B1: Search
      searchQuery: '',
      searchFilters: {
        minPrice: null,
        maxPrice: null,
        minBedrooms: null,
        propertyType: null,
        city: null,
      },

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
          searchFilters: {
            minPrice: null,
            maxPrice: null,
            minBedrooms: null,
            propertyType: null,
            city: null,
          },
          savedProperties: [],
          viewedProperties: [],
          scheduledViewings: [],
          activeBids: [],
          closedDeals: [],
        }),
    }),
    { name: 'eigen-buyer' }
  )
)

export default useBuyerStore

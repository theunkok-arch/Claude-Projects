import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useSellerStore = create(
  persist(
    (set) => ({
      // S1: Valuation
      address: null,
      valuation: null,
      verified: false,

      // S2: Photos
      photos: [],
      photoPreset: 'natural',

      // S3: Listing
      listingDescription: '',
      listingGenerated: false,

      // S4: Pricing
      askingPrice: null,
      pricingStrategy: 'market',

      // S5: Dashboard
      listingLive: false,

      // S6: Bids
      bids: [],
      selectedBid: null,

      // S8: Closed
      dealClosed: false,

      // Actions
      setAddress: (address) => set({ address }),
      setValuation: (valuation) => set({ valuation }),
      setVerified: (verified) => set({ verified }),
      addPhoto: (photo) => set((s) => ({ photos: [...s.photos, photo] })),
      removePhoto: (index) => set((s) => ({ photos: s.photos.filter((_, i) => i !== index) })),
      setPhotoPreset: (preset) => set({ photoPreset: preset }),
      setListingDescription: (desc) => set({ listingDescription: desc, listingGenerated: true }),
      setAskingPrice: (price) => set({ askingPrice: price }),
      setPricingStrategy: (strategy) => set({ pricingStrategy: strategy }),
      setListingLive: (live) => set({ listingLive: live }),
      addBid: (bid) => set((s) => ({ bids: [...s.bids, bid] })),
      selectBid: (bid) => set({ selectedBid: bid }),
      closeDeal: () => set({ dealClosed: true }),
      reset: () =>
        set({
          address: null,
          valuation: null,
          verified: false,
          photos: [],
          photoPreset: 'natural',
          listingDescription: '',
          listingGenerated: false,
          askingPrice: null,
          pricingStrategy: 'market',
          listingLive: false,
          bids: [],
          selectedBid: null,
          dealClosed: false,
        }),
    }),
    { name: 'eigen-seller' }
  )
)

export default useSellerStore

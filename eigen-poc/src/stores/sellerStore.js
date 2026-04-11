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

      // S3: Listing
      listing: {
        askingPrice: null,
        m2: null,
        bedrooms: 2,
        bathrooms: 1,
        energyLabel: 'C',
        buildYear: null,
        features: '',
        description: '',
        selectedVersion: 'default',
        seoScore: 94,
      },
      listingGenerated: false,

      // S3b: AI Price Advisor
      priceSliderValue: 50, // 0 = Sell Fast, 100 = Maximize Price
      suggestedPrice: null,

      // S4: Pricing
      strategy: 'market',
      selectedPackage: null,
      paid: false,
      listingStatus: null,

      // S5: Dashboard
      notificationPrefs: {
        viewingRequest: true,
        newOffer: true,
        milestones: true,
        weeklySummary: false,
      },

      // S6: Bids
      bids: [],
      acceptedBid: null,

      // S7: Explore
      reveals: [],
      isPro: false,

      // S8: Closed
      closingProgress: 60,

      // Actions — S1
      setAddress: (address) => set({ address }),
      setValuation: (valuation) => set({ valuation }),
      setVerified: (verified) => set({ verified }),

      // Actions — S2
      addPhoto: (photo) => set((s) => ({ photos: [...s.photos, photo] })),
      removePhoto: (index) => set((s) => ({ photos: s.photos.filter((_, i) => i !== index) })),
      updatePhoto: (index, data) =>
        set((s) => ({
          photos: s.photos.map((p, i) => (i === index ? { ...p, ...data } : p)),
        })),

      // Actions — S3
      setListing: (data) =>
        set((s) => ({ listing: { ...s.listing, ...data } })),
      setListingGenerated: (val) => set({ listingGenerated: val }),

      // Actions — S3b: Price Advisor
      setPriceSliderValue: (val) => set({ priceSliderValue: val }),
      setSuggestedPrice: (val) => set({ suggestedPrice: val }),

      // Actions — S4
      setStrategy: (strategy) => set({ strategy }),
      setSelectedPackage: (pkg) => set({ selectedPackage: pkg }),
      setPaid: () => set({ paid: true, listingStatus: 'live' }),

      // Actions — S5
      setNotificationPref: (key, val) =>
        set((s) => ({
          notificationPrefs: { ...s.notificationPrefs, [key]: val },
        })),

      // Actions — S6
      setBids: (bids) => set({ bids }),
      updateBidStatus: (bidId, status) =>
        set((s) => ({
          bids: s.bids.map((b) =>
            b.id === bidId ? { ...b, status } : b
          ),
        })),
      setAcceptedBid: (bid) => set({ acceptedBid: bid }),

      // Actions — S7
      addReveal: (buyerId) =>
        set((s) => ({ reveals: [...s.reveals, buyerId] })),
      setIsPro: (val) => set({ isPro: val }),

      // Actions — S8
      setClosingProgress: (val) => set({ closingProgress: val }),

      // Reset
      reset: () =>
        set({
          address: null,
          valuation: null,
          verified: false,
          photos: [],
          listing: {
            askingPrice: null,
            m2: null,
            bedrooms: 2,
            bathrooms: 1,
            energyLabel: 'C',
            buildYear: null,
            features: '',
            description: '',
            selectedVersion: 'default',
            seoScore: 94,
          },
          listingGenerated: false,
          priceSliderValue: 50,
          suggestedPrice: null,
          strategy: 'market',
          selectedPackage: null,
          paid: false,
          listingStatus: null,
          notificationPrefs: {
            viewingRequest: true,
            newOffer: true,
            milestones: true,
            weeklySummary: false,
          },
          bids: [],
          acceptedBid: null,
          reveals: [],
          isPro: false,
          closingProgress: 60,
        }),
    }),
    { name: 'eigen-seller' }
  )
)

export default useSellerStore

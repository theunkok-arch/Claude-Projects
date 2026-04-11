export const PACKAGES = [
  {
    id: 'basis',
    name: 'Basis',
    price: 495,
    features: {
      aiValuation: true,
      aiListingText: true,
      photoEnhancement: true,
      virtualStaging: false,
      premiumPlacement: false,
      videoTour: false,
      viewingScheduler: false,
      offerManagement: true,
      notaryCoordination: false,
      personalAdvisor: false,
    },
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 695,
    recommended: true,
    features: {
      aiValuation: true,
      aiListingText: true,
      photoEnhancement: true,
      virtualStaging: true,
      premiumPlacement: true,
      videoTour: false,
      viewingScheduler: true,
      offerManagement: true,
      notaryCoordination: false,
      personalAdvisor: false,
    },
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 995,
    features: {
      aiValuation: true,
      aiListingText: true,
      photoEnhancement: true,
      virtualStaging: true,
      premiumPlacement: true,
      videoTour: true,
      viewingScheduler: true,
      offerManagement: true,
      notaryCoordination: true,
      personalAdvisor: true,
    },
  },
]

export const FEATURE_LABELS = {
  aiValuation: 'AI Valuation',
  aiListingText: 'AI Listing Text',
  photoEnhancement: 'Photo Enhancement',
  virtualStaging: 'Virtual Staging',
  premiumPlacement: 'Premium Placement',
  videoTour: 'Video Tour',
  viewingScheduler: 'Viewing Scheduler',
  offerManagement: 'Offer Management',
  notaryCoordination: 'Notary Coordination',
  personalAdvisor: 'Personal Advisor',
}

export const MAKELAAR_RATE = 0.015 // 1.5% commission

export const BANKS = [
  { id: 'rabobank', name: 'Rabobank', color: '#FF6600' },
  { id: 'abn', name: 'ABN AMRO', color: '#004D40' },
  { id: 'ing', name: 'ING', color: '#FF6200' },
  { id: 'sns', name: 'SNS', color: '#003882' },
  { id: 'asn', name: 'ASN Bank', color: '#00A651' },
  { id: 'triodos', name: 'Triodos', color: '#5B2D8E' },
  { id: 'bunq', name: 'bunq', color: '#00C8FF' },
]

export const ROOM_TYPES = [
  'Woonkamer',
  'Keuken',
  'Slaapkamer 1',
  'Slaapkamer 2',
  'Slaapkamer 3',
  'Badkamer',
  'Toilet',
  'Tuin',
  'Balkon',
  'Garage',
  'Hal/Entree',
  'Berging',
  'Zolder',
  'Overig',
]

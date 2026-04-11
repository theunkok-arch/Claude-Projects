import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

// Landing
import Landing from './screens/Landing'

// Seller screens
import S1Valuation from './screens/seller/S1Valuation'
import S2Photos from './screens/seller/S2Photos'
import S3Listing from './screens/seller/S3Listing'
import S4Pricing from './screens/seller/S4Pricing'
import S5Dashboard from './screens/seller/S5Dashboard'
import S6Bids from './screens/seller/S6Bids'
import S7Explore from './screens/seller/S7Explore'
import S8Closed from './screens/seller/S8Closed'

// Buyer screens
import B1Search from './screens/buyer/B1Search'
import B2Results from './screens/buyer/B2Results'
import B3PropertyDetail from './screens/buyer/B3PropertyDetail'
import B4Viewing from './screens/buyer/B4Viewing'
import B5Bid from './screens/buyer/B5Bid'
import B6Keys from './screens/buyer/B6Keys'

function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Landing */}
        <Route path="/" element={<Landing />} />

        {/* Seller flow */}
        <Route path="/sell/valuation" element={<S1Valuation />} />
        <Route path="/sell/photos" element={<S2Photos />} />
        <Route path="/sell/listing" element={<S3Listing />} />
        <Route path="/sell/pricing" element={<S4Pricing />} />
        <Route path="/sell/dashboard" element={<S5Dashboard />} />
        <Route path="/sell/bids" element={<S6Bids />} />
        <Route path="/sell/explore" element={<S7Explore />} />
        <Route path="/sell/closed" element={<S8Closed />} />

        {/* Buyer flow */}
        <Route path="/buy/search" element={<B1Search />} />
        <Route path="/buy/results" element={<B2Results />} />
        <Route path="/buy/property/:id" element={<B3PropertyDetail />} />
        <Route path="/buy/viewing/:id" element={<B4Viewing />} />
        <Route path="/buy/bid/:id" element={<B5Bid />} />
        <Route path="/buy/keys" element={<B6Keys />} />
      </Routes>
    </AnimatePresence>
  )
}

export default App

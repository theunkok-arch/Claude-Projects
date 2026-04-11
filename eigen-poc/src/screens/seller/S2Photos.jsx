import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, ChevronDown, Sparkles } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import useSellerStore from '../../stores/sellerStore'
import { ROOM_TYPES } from '../../data/constants'

const AUTO_ROOMS = ['Woonkamer', 'Keuken', 'Slaapkamer 1', 'Badkamer', 'Tuin', 'Hal/Entree']

const FILTERS = {
  natural: { label: 'Natural', css: 'brightness(1.05) contrast(1.05) saturate(1.05)' },
  bright: { label: 'Bright', css: 'brightness(1.2) contrast(0.95) saturate(1.1) sepia(0.05)' },
  magazine: { label: 'Magazine', css: 'brightness(1.1) contrast(1.15) saturate(1.2)' },
}

function PhotoSlot({ photo, index, onUpload, onRemove, onUpdateRoom, onUpdateFilter }) {
  const fileRef = useRef(null)
  const [showRoomPicker, setShowRoomPicker] = useState(false)

  if (!photo) {
    return (
      <motion.button
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => fileRef.current?.click()}
        className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 hover:border-eigen-orange hover:bg-orange-50/30 transition-colors"
      >
        <Camera size={24} className="text-gray-400" />
        <span className="text-xs text-gray-400">Add Photo</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(file, index)
          }}
        />
      </motion.button>
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      className="relative aspect-[4/3] rounded-2xl overflow-hidden group"
    >
      {/* Photo thumbnail */}
      <img
        src={photo.url}
        alt={photo.roomType}
        className="w-full h-full object-cover"
        style={{ filter: FILTERS[photo.filter || 'natural'].css }}
      />

      {/* Remove button */}
      <button
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={14} className="text-white" />
      </button>

      {/* Room label overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
        <button
          onClick={() => setShowRoomPicker(!showRoomPicker)}
          className="flex items-center gap-1 text-xs text-white font-medium"
        >
          {photo.roomType}
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Room picker dropdown */}
      <AnimatePresence>
        {showRoomPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-12 left-2 right-2 bg-white rounded-xl shadow-lg border border-gray-200 max-h-40 overflow-y-auto z-10"
          >
            {ROOM_TYPES.map((room) => (
              <button
                key={room}
                onClick={() => {
                  onUpdateRoom(index, room)
                  setShowRoomPicker(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                  photo.roomType === room ? 'text-eigen-orange font-medium' : 'text-gray-700'
                }`}
              >
                {room}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter selector pills */}
      <div className="absolute top-2 left-2 flex gap-1">
        {Object.entries(FILTERS).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => onUpdateFilter(index, key)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
              (photo.filter || 'natural') === key
                ? 'bg-eigen-orange text-white'
                : 'bg-black/40 text-white/80 hover:bg-black/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

export default function S2Photos() {
  const navigate = useNavigate()
  const { photos, addPhoto, removePhoto, updatePhoto } = useSellerStore()
  const [slots, setSlots] = useState(Math.max(6, photos.length))
  const [toast, setToast] = useState(null)
  const [showStaging, setShowStaging] = useState(false)
  const [sliderPos, setSliderPos] = useState(50)

  const handleUpload = (file, slotIndex) => {
    const url = URL.createObjectURL(file)
    const roomType = AUTO_ROOMS[photos.length] || 'Overig'
    const photo = { url, roomType, filter: 'natural', staged: false }
    addPhoto(photo)

    // Simulate AI room detection
    setTimeout(() => {
      setToast(`AI detected: ${roomType}`)
      setTimeout(() => setToast(null), 2500)
    }, 1500)
  }

  const handleRemove = (index) => {
    removePhoto(index)
  }

  const handleUpdateRoom = (index, room) => {
    updatePhoto(index, { roomType: room })
  }

  const handleUpdateFilter = (index, filter) => {
    updatePhoto(index, { filter })
  }

  const addMoreSlots = () => {
    setSlots((s) => Math.min(s + 2, 20))
  }

  const photoCount = photos.length
  const canContinue = photoCount >= 4

  return (
    <AppShell title="Professional Photos" step={2} totalSteps={8} flow="sell">
      <div className="px-4 pt-4 pb-32">
        {/* Progress counter */}
        <div className="mb-4">
          <p className="text-lg font-bold text-eigen-navy mb-1">
            {photoCount} of {slots} photos uploaded
          </p>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-eigen-orange rounded-full"
              animate={{ width: `${(photoCount / slots) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {photoCount < 4 && (
            <p className="text-xs text-gray-400 mt-1">Minimum 4 photos required to continue</p>
          )}
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <AnimatePresence>
            {Array.from({ length: slots }).map((_, i) => (
              <PhotoSlot
                key={i}
                index={i}
                photo={photos[i] || null}
                onUpload={handleUpload}
                onRemove={handleRemove}
                onUpdateRoom={handleUpdateRoom}
                onUpdateFilter={handleUpdateFilter}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Add more button */}
        {slots < 20 && (
          <Button variant="outline" fullWidth onClick={addMoreSlots} className="mb-6">
            Add More Photos +
          </Button>
        )}

        {/* Virtual Staging section */}
        {photoCount > 0 && (
          <Card className="bg-purple-50 border-eigen-purple/20 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-eigen-purple/10 rounded-lg flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-eigen-purple" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-eigen-navy text-sm">Virtual Staging Available</h3>
                <p className="text-xs text-gray-500 mt-1">Empty rooms detected — add AI-generated furniture</p>
              </div>
            </div>
            <Button
              variant="outline"
              fullWidth
              className="mt-3 border-eigen-purple text-eigen-purple"
              onClick={() => setShowStaging(!showStaging)}
            >
              {showStaging ? 'Hide Staging Preview' : 'Stage This Room'}
            </Button>

            {/* Before/After slider */}
            <AnimatePresence>
              {showStaging && photos[0] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3"
                >
                  <div className="relative rounded-xl overflow-hidden aspect-[4/3]">
                    {/* Original */}
                    <img
                      src={photos[0].url}
                      alt="Original"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Staged (warmer tone overlay) */}
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ width: `${sliderPos}%` }}
                    >
                      <img
                        src={photos[0].url}
                        alt="Staged"
                        className="w-full h-full object-cover"
                        style={{
                          filter: 'brightness(1.08) saturate(1.2) sepia(0.08)',
                          transform: 'scale(1.02)',
                          width: `${(100 / sliderPos) * 100}%`,
                          maxWidth: 'none',
                        }}
                      />
                    </div>
                    {/* Slider handle */}
                    <input
                      type="range"
                      min="5"
                      max="95"
                      value={sliderPos}
                      onChange={(e) => setSliderPos(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-5 pointer-events-none"
                      style={{ left: `${sliderPos}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                        <span className="text-xs text-gray-400">↔</span>
                      </div>
                    </div>
                    {/* Labels */}
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-[10px] rounded-full">Before</span>
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-eigen-purple/80 text-white text-[10px] rounded-full">AI Staged</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )}
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-eigen-navy text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50"
          >
            ✨ {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomCTA>
        <Button
          variant="primary"
          fullWidth
          disabled={!canContinue}
          onClick={() => navigate('/sell/listing')}
        >
          Continue to Listing →
        </Button>
      </BottomCTA>
    </AppShell>
  )
}

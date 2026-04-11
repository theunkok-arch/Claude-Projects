import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, ChevronDown, Sparkles, RefreshCw, Trash2 } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import BottomCTA from '../../components/layout/BottomCTA'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import useSellerStore from '../../stores/sellerStore'
import { ROOM_TYPES } from '../../data/constants'

const AUTO_ROOMS = ['Woonkamer', 'Keuken', 'Slaapkamer 1', 'Badkamer', 'Tuin', 'Hal/Entree']

const FILTERS = {
  natural: { label: 'Natural', css: 'brightness(1.05) contrast(1.05) saturate(1.05)' },
  bright: { label: 'Bright', css: 'brightness(1.2) contrast(0.95) saturate(1.1) sepia(0.05)' },
  magazine: { label: 'Magazine', css: 'brightness(1.1) contrast(1.15) saturate(1.2)' },
}

const STAGING_OPTIONS = [
  { id: 'study', label: 'Study / Home Office', color: 'bg-blue-100 text-blue-700', overlay: 'sepia(0.12) brightness(1.05) saturate(1.15)', badge: 'Home Office' },
  { id: 'kids', label: 'Kids Bedroom', color: 'bg-pink-100 text-pink-700', overlay: 'hue-rotate(15deg) brightness(1.1) saturate(1.2)', badge: 'Kids Room' },
  { id: 'laundry', label: 'Laundry Room', color: 'bg-cyan-100 text-cyan-700', overlay: 'brightness(1.15) contrast(1.05) saturate(0.9)', badge: 'Laundry' },
  { id: 'guest', label: 'Guest Room', color: 'bg-amber-100 text-amber-700', overlay: 'sepia(0.08) brightness(1.08) saturate(1.1) hue-rotate(-5deg)', badge: 'Guest Room' },
]

function PhotoSlot({ photo, index, onUpload, onRemove, onReplace, onUpdateRoom, onUpdateFilter, onEnlarge }) {
  const fileRef = useRef(null)
  const replaceRef = useRef(null)
  const [showRoomPicker, setShowRoomPicker] = useState(false)
  const [showActions, setShowActions] = useState(false)

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
      {/* Photo thumbnail — tap to enlarge */}
      <button
        onClick={() => onEnlarge(index)}
        className="w-full h-full block"
      >
        <img
          src={photo.url}
          alt={photo.roomType}
          className="w-full h-full object-cover"
          style={{ filter: FILTERS[photo.filter || 'natural'].css }}
        />
      </button>

      {/* Actions button (top-right) */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowActions(!showActions) }}
        className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
      >
        <span className="text-white text-xs font-bold">···</span>
      </button>

      {/* Actions dropdown */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-10 right-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-20"
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowActions(false)
                replaceRef.current?.click()
              }}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={14} className="text-gray-400" />
              Replace
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowActions(false)
                onRemove(index)
              }}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm text-eigen-red hover:bg-red-50 border-t border-gray-100"
            >
              <Trash2 size={14} />
              Remove
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden replace file input */}
      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onReplace(file, index)
        }}
      />

      {/* Room label overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
        <button
          onClick={(e) => { e.stopPropagation(); setShowRoomPicker(!showRoomPicker) }}
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
                onClick={(e) => {
                  e.stopPropagation()
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
    </motion.div>
  )
}

function FullscreenPhotoModal({ photo, open, onClose, onUpdateFilter }) {
  if (!photo) return null
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/90 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center z-10"
            >
              <X size={20} className="text-white" />
            </button>

            {/* Photo */}
            <img
              src={photo.url}
              alt={photo.roomType}
              className="max-w-full max-h-[70dvh] rounded-xl object-contain"
              style={{ filter: FILTERS[photo.filter || 'natural'].css }}
            />

            {/* Room label */}
            <p className="text-white text-sm font-medium mt-3">{photo.roomType}</p>

            {/* Filter buttons */}
            <div className="flex gap-2 mt-4">
              {Object.entries(FILTERS).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={(e) => { e.stopPropagation(); onUpdateFilter(key) }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    (photo.filter || 'natural') === key
                      ? 'bg-eigen-orange text-white'
                      : 'bg-white/15 text-white/80 hover:bg-white/25'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default function S2Photos() {
  const navigate = useNavigate()
  const { photos, addPhoto, removePhoto, updatePhoto } = useSellerStore()
  const [slots, setSlots] = useState(Math.max(6, photos.length))
  const [toast, setToast] = useState(null)
  const [enlargedIndex, setEnlargedIndex] = useState(null)
  const [selectedStaging, setSelectedStaging] = useState(null)

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

  const handleReplace = (file, index) => {
    const url = URL.createObjectURL(file)
    updatePhoto(index, { url })
    setToast('Photo replaced')
    setTimeout(() => setToast(null), 2000)
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

  const handleEnlarge = (index) => {
    setEnlargedIndex(index)
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
                onReplace={handleReplace}
                onUpdateRoom={handleUpdateRoom}
                onUpdateFilter={handleUpdateFilter}
                onEnlarge={handleEnlarge}
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

        {/* Room Transformation section */}
        {photoCount > 0 && (
          <Card className="bg-purple-50 border-eigen-purple/20 mb-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-eigen-purple/10 rounded-lg flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-eigen-purple" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-eigen-navy text-sm">Room Transformation</h3>
                <p className="text-xs text-gray-500 mt-0.5">See how an empty room could look as a different space</p>
              </div>
            </div>

            {/* Staging option buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {STAGING_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedStaging(selectedStaging === opt.id ? null : opt.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-center transition-all ${
                    selectedStaging === opt.id
                      ? 'bg-eigen-purple text-white ring-2 ring-eigen-purple ring-offset-1'
                      : opt.color
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Before/After preview */}
            <AnimatePresence>
              {selectedStaging && photos[0] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2">
                    {/* Before */}
                    <div className="relative rounded-xl overflow-hidden aspect-[4/3]">
                      <img
                        src={photos[0].url}
                        alt="Before"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-[10px] rounded-full font-medium">
                        Before
                      </span>
                    </div>
                    {/* After */}
                    <div className="relative rounded-xl overflow-hidden aspect-[4/3]">
                      <img
                        src={photos[0].url}
                        alt="After"
                        className="w-full h-full object-cover"
                        style={{
                          filter: STAGING_OPTIONS.find((o) => o.id === selectedStaging)?.overlay,
                        }}
                      />
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-eigen-purple/80 text-white text-[10px] rounded-full font-medium">
                        {STAGING_OPTIONS.find((o) => o.id === selectedStaging)?.badge}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )}
      </div>

      {/* Fullscreen Photo Modal */}
      <FullscreenPhotoModal
        photo={enlargedIndex !== null ? photos[enlargedIndex] : null}
        open={enlargedIndex !== null}
        onClose={() => setEnlargedIndex(null)}
        onUpdateFilter={(filter) => {
          if (enlargedIndex !== null) handleUpdateFilter(enlargedIndex, filter)
        }}
      />

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

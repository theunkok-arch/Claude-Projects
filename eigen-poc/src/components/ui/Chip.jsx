export default function Chip({ label, active = false, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
        ${active
          ? 'bg-eigen-navy text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } ${className}`}
    >
      {label}
    </button>
  )
}

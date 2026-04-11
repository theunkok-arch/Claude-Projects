const colorMap = {
  green: 'bg-green-100 text-eigen-green',
  orange: 'bg-orange-100 text-eigen-orange',
  blue: 'bg-blue-100 text-eigen-blue',
  purple: 'bg-purple-100 text-eigen-purple',
  amber: 'bg-amber-100 text-eigen-amber',
  red: 'bg-red-100 text-eigen-red',
  gray: 'bg-gray-100 text-gray-600',
}

export default function Badge({ children, color = 'gray', className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorMap[color] || colorMap.gray} ${className}`}
    >
      {children}
    </span>
  )
}

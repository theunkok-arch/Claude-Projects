import { motion } from 'framer-motion'

const variants = {
  primary: 'bg-eigen-orange text-white hover:bg-orange-600',
  secondary: 'bg-gray-100 text-eigen-navy hover:bg-gray-200',
  buyer: 'bg-eigen-blue text-white hover:bg-blue-600',
  outline: 'border-2 border-eigen-navy text-eigen-navy hover:bg-gray-50',
  danger: 'bg-eigen-red text-white hover:bg-red-600',
  success: 'bg-eigen-green text-white hover:bg-green-600',
}

export default function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  onClick,
  className = '',
  ...props
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        min-h-12 px-6 rounded-lg font-semibold text-base
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant] || variants.primary}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  )
}

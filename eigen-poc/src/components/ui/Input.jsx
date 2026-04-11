import { forwardRef } from 'react'

const Input = forwardRef(function Input(
  { label, error, className = '', ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        ref={ref}
        className={`h-12 px-4 rounded-lg border border-gray-300 text-base
          placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-eigen-blue focus:border-transparent
          transition-shadow
          ${error ? 'border-eigen-red ring-1 ring-eigen-red' : ''}
          ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-eigen-red">{error}</span>}
    </div>
  )
})

export default Input

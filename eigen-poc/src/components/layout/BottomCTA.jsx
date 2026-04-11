export default function BottomCTA({ children, className = '' }) {
  return (
    <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 px-4 py-3 z-40 ${className}`}>
      {children}
    </div>
  )
}

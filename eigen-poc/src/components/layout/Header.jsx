import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Header({ title, flow }) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center h-14 px-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-eigen-navy" />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold text-eigen-navy pr-8">
          {title}
        </h1>
      </div>
    </header>
  )
}

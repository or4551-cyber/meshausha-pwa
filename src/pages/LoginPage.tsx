import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const handleNumberClick = (num: number) => {
    if (pin.length < 4) {
      const newPin = pin + num
      setPin(newPin)
      
      if (newPin.length === 4) {
        setTimeout(() => {
          const success = login(newPin, rememberMe)
          if (success) {
            navigate('/')
          } else {
            setError(true)
            setTimeout(() => {
              setPin('')
              setError(false)
            }, 500)
          }
        }, 200)
      }
    }
  }

  const handleClear = () => {
    setPin('')
    setError(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-primary safe-area-inset">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-5xl sm:text-7xl font-black text-secondary leading-none tracking-tight">
            משאוושה
          </h1>
          <p className="text-secondary/90 font-bold text-base sm:text-lg mt-2">
            מערכת הזמנות רכש
          </p>
        </div>

        <div className="bg-secondary rounded-[3rem] sm:rounded-[4rem] p-8 sm:p-12 shadow-2xl">
          <div className="flex justify-center gap-4 sm:gap-5 mb-8 sm:mb-12">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: error ? [1, 1.2, 1] : 1,
                  backgroundColor: error ? '#ef4444' : pin.length > i ? '#802020' : 'transparent'
                }}
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-primary"
              />
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-primary/30 text-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-primary font-bold text-sm cursor-pointer select-none">
              זכור אותי
            </label>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                className="h-14 sm:h-16 text-3xl sm:text-4xl font-black text-primary hover:bg-primary/5 active:bg-primary/10 rounded-2xl transition-all active:scale-95 touch-manipulation"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-14 sm:h-16 text-2xl sm:text-3xl font-black text-primary/50 hover:bg-primary/5 active:bg-primary/10 rounded-2xl transition-all active:scale-95 touch-manipulation"
            >
              C
            </button>
            <button
              onClick={() => handleNumberClick(0)}
              className="h-14 sm:h-16 text-3xl sm:text-4xl font-black text-primary hover:bg-primary/5 active:bg-primary/10 rounded-2xl transition-all active:scale-95 touch-manipulation"
            >
              0
            </button>
            <div className="h-14 sm:h-16" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

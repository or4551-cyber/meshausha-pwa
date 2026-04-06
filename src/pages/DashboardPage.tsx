import { useAuthStore } from '../stores/authStore'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, History, Bell, LogOut, BarChart3 } from 'lucide-react'

export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="bg-secondary rounded-3xl p-5 mb-6 shadow-xl relative">
          <button
            onClick={handleLogout}
            className="absolute top-4 left-4 text-primary/30 hover:text-primary/50 active:text-primary/60 transition-colors p-2 touch-manipulation"
            aria-label="התנתק"
          >
            <LogOut size={20} />
          </button>
          
          <div className="text-center pt-2">
            <h2 className="font-black text-primary text-2xl mb-2">משאוושה</h2>
            <span className="text-xs bg-primary text-secondary px-3 py-1 rounded-full font-bold inline-block">
              {user?.branch}
            </span>
          </div>
        </header>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/orders')}
            className="w-full bg-secondary rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-6">
              <div className="flex-shrink-0 bg-primary/10 p-4 rounded-2xl">
                <ShoppingCart className="text-primary" size={28} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-primary text-xl mb-1">הזמנה חדשה</h3>
                <p className="text-primary/60 text-sm font-bold">צור הזמנת רכש</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/history')}
            className="w-full bg-secondary rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-primary/10 p-3 rounded-2xl">
                <History className="text-primary" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-primary text-lg mb-1">היסטוריה</h3>
                <p className="text-primary/60 text-xs font-bold">הזמנות קודמות</p>
              </div>
            </div>
          </button>

          <button
            className="w-full bg-secondary rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-primary/10 p-3 rounded-2xl">
                <Bell className="text-primary" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-primary text-lg mb-1">תזכורות</h3>
                <p className="text-primary/60 text-xs font-bold">ניהול תזכורות</p>
              </div>
            </div>
          </button>

          {user?.isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
            >
              <div className="flex items-center gap-4 p-5">
                <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                  <BarChart3 className="text-white" size={24} />
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-black text-white text-lg mb-1">פאנל אדמין</h3>
                  <p className="text-white/80 text-xs font-bold">דוחות, מחירים, התראות</p>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

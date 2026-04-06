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
    <div className="min-h-screen bg-primary p-4 sm:p-6 pb-safe">
      <div className="max-w-2xl mx-auto">
        <header className="bg-secondary rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 mb-4 sm:mb-6 shadow-xl">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h2 className="font-black text-primary text-xl sm:text-2xl">משאוושה</h2>
              <span className="text-xs bg-primary text-secondary px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold inline-block mt-1">
                {user?.branch}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-primary/30 hover:text-primary/50 active:text-primary/60 transition-colors p-2 touch-manipulation"
            >
              <LogOut size={20} className="sm:hidden" />
              <LogOut size={22} className="hidden sm:block" />
            </button>
          </div>
        </header>

        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={() => navigate('/orders')}
            className="w-full bg-secondary p-6 sm:p-8 rounded-[1.75rem] sm:rounded-[2rem] shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-between group touch-manipulation"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-primary/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl group-hover:bg-primary/20 group-active:bg-primary/25 transition-colors">
                <ShoppingCart className="text-primary sm:hidden" size={28} />
                <ShoppingCart className="text-primary hidden sm:block" size={32} />
              </div>
              <div className="text-right">
                <h3 className="font-black text-primary text-xl sm:text-2xl">הזמנה חדשה</h3>
                <p className="text-primary/60 text-xs sm:text-sm font-bold">צור הזמנת רכש</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/history')}
            className="w-full bg-secondary p-5 sm:p-6 rounded-[1.75rem] sm:rounded-[2rem] shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-between group touch-manipulation"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-primary/10 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl group-hover:bg-primary/20 group-active:bg-primary/25 transition-colors">
                <History className="text-primary sm:hidden" size={22} />
                <History className="text-primary hidden sm:block" size={24} />
              </div>
              <div className="text-right">
                <h3 className="font-black text-primary text-base sm:text-lg">היסטוריה</h3>
                <p className="text-primary/60 text-xs font-bold">הזמנות קודמות</p>
              </div>
            </div>
          </button>

          <button
            className="w-full bg-secondary p-5 sm:p-6 rounded-[1.75rem] sm:rounded-[2rem] shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-between group touch-manipulation"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-primary/10 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl group-hover:bg-primary/20 group-active:bg-primary/25 transition-colors">
                <Bell className="text-primary sm:hidden" size={22} />
                <Bell className="text-primary hidden sm:block" size={24} />
              </div>
              <div className="text-right">
                <h3 className="font-black text-primary text-base sm:text-lg">תזכורות</h3>
                <p className="text-primary/60 text-xs font-bold">ניהול תזכורות</p>
              </div>
            </div>
          </button>

          {user?.isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 p-5 sm:p-6 rounded-[1.75rem] sm:rounded-[2rem] shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-between group touch-manipulation"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-white/20 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl group-hover:bg-white/30 group-active:bg-white/40 transition-colors">
                  <BarChart3 className="text-white sm:hidden" size={22} />
                  <BarChart3 className="text-white hidden sm:block" size={24} />
                </div>
                <div className="text-right">
                  <h3 className="font-black text-white text-base sm:text-lg">פאנל אדמין</h3>
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

import { useNavigate } from 'react-router-dom'
import { ChevronRight, DollarSign, FileText, BarChart3, Plus } from 'lucide-react'
import { useOrdersStore } from '../stores/ordersStore'
import { useSuppliersStore } from '../stores/suppliersStore'

export default function AdminPage() {
  const navigate = useNavigate()
  const { getAllOrders } = useOrdersStore()
  const { getAllSuppliers } = useSuppliersStore()
  const totalOrders = getAllOrders().length
  const totalSuppliers = getAllSuppliers().length

  return (
    <div className="min-h-screen bg-primary p-4 sm:p-6 pb-safe">
      <div className="max-w-2xl mx-auto">
        <header className="bg-secondary rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 mb-4 sm:mb-6 shadow-xl">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
            >
              <ChevronRight size={24} className="sm:hidden" />
              <ChevronRight size={28} className="hidden sm:block" />
            </button>
                 • {totalSuppliers} ספקים
             
            <div className="flex-1 text-center">
              <h2 className="font-black text-primary text-xl sm:text-2xl">פאנל אדמין</h2>
              <p className="text-primary/60 text-xs font-bold mt-1">{totalOrders} הזמנות במערכת</p>
            </div>
            <div className="w-6 sm:w-7" />
          </div>
        </header>

        <div className="space-y-3 sm:space-y-4">
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="w-full bg-gradient-to-br from-accent to-[#7a6348] p-5 sm:p-6 rounded-[1.75rem] sm:rounded-[2rem] shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-between group touch-manipulation"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-white/20 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl group-hover:bg-white/30 group-active:bg-white/40 transition-colors">
                <BarChart3 className="text-white" size={22} />
                <BarChart3 className="text-white hidden sm:block" size={24} />
              </div>
              <div className="text-right">
                <h3 className="font-black text-white text-base sm:text-lg">דשבורד אנליטי מתקדם</h3>
                <p className="text-white/80 text-xs font-bold">גרפים אינטראקטיביים וסטטיסטיקות</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/admin/add-supplier')}
            className="w-full bg-gradient-to-br from-bot to-[#96a556] p-5 sm:p-6 rounded-[1.75rem] sm:rounded-[2rem] shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-between group touch-manipulation"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-white/20 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl group-hover:bg-white/30 group-active:bg-white/40 transition-colors">
                <Plus className="text-white" size={22} />
                <Plus className="text-white hidden sm:block" size={24} />
              </div>
              <div className="text-right">
                <h3 className="font-black text-white text-base sm:text-lg">הוספת ספק חדש</h3>
                <p className="text-white/80 text-xs font-bold">ספק + מוצרים + ימי הזמנה</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/admin/prices')}
            className="w-full bg-secondary p-5 sm:p-6 rounded-[1.75rem] sm:rounded-[2rem] shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-between group touch-manipulation"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-primary/10 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl group-hover:bg-primary/20 group-active:bg-primary/25 transition-colors">
                <DollarSign className="text-primary" size={22} />
                <DollarSign className="text-primary hidden sm:block" size={24} />
              </div>
              <div className="text-right">
                <h3 className="font-black text-primary text-base sm:text-lg">ניהול מחירים</h3>
                <p className="text-primary/60 text-xs font-bold">עדכון מחירי מוצרים</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/admin/reports')}
            className="w-full bg-secondary p-5 sm:p-6 rounded-[1.75rem] sm:rounded-[2rem] shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-between group touch-manipulation"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-primary/10 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl group-hover:bg-primary/20 group-active:bg-primary/25 transition-colors">
                <FileText className="text-primary" size={22} />
                <FileText className="text-primary hidden sm:block" size={24} />
              </div>
              <div className="text-right">
                <h3 className="font-black text-primary text-base sm:text-lg">דוחות כלכליים</h3>
                <p className="text-primary/60 text-xs font-bold">דוחות לפי סניף וספק</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

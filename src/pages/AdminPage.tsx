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
    <div className="min-h-screen bg-primary pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="bg-secondary rounded-3xl p-5 mb-6 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
            >
              <ChevronRight size={24} />
            </button>
            <div className="flex-1 text-center">
              <h2 className="font-black text-primary text-xl mb-1">פאנל אדמין</h2>
              <p className="text-primary/60 text-xs font-bold">{totalOrders} הזמנות • {totalSuppliers} ספקים</p>
            </div>
            <div className="w-8" />
          </div>
        </header>

        <div className="space-y-3">
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="w-full bg-gradient-to-br from-accent to-[#7a6348] rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                <BarChart3 className="text-white" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-white text-lg mb-1">דשבורד אנליטי מתקדם</h3>
                <p className="text-white/80 text-xs font-bold">גרפים אינטראקטיביים וסטטיסטיקות</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/admin/add-supplier')}
            className="w-full bg-gradient-to-br from-bot to-[#96a556] rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                <Plus className="text-white" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-white text-lg mb-1">הוספת ספק חדש</h3>
                <p className="text-white/80 text-xs font-bold">ספק + מוצרים + ימי הזמנה</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/admin/prices')}
            className="w-full bg-secondary rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-primary/10 p-3 rounded-2xl">
                <DollarSign className="text-primary" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-primary text-lg mb-1">ניהול מחירים</h3>
                <p className="text-primary/60 text-xs font-bold">עדכון מחירי מוצרים</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/admin/reports')}
            className="w-full bg-secondary rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-primary/10 p-3 rounded-2xl">
                <FileText className="text-primary" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-primary text-lg mb-1">דוחות כלכליים</h3>
                <p className="text-primary/60 text-xs font-bold">דוחות לפי סניף וספק</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

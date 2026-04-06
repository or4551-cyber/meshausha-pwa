import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Search, Star, ShoppingCart } from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { useSuppliersStore } from '../stores/suppliersStore'
import { PRODUCTS as staticProducts } from '../data/products'
import ProductCard from '../components/ProductCard'

export default function OrdersPage() {
  const navigate = useNavigate()
  const { favorites, getTotalItems } = useCartStore()
  const { getAllProducts, getAllSuppliers } = useSuppliersStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')

  // שילוב מוצרים סטטיים ודינמיים
  const allProducts = useMemo(() => {
    const dynamicProducts = getAllProducts()
    return [...staticProducts, ...dynamicProducts]
  }, [getAllProducts])

  const suppliers = useMemo(() => {
    const dynamicSuppliers = getAllSuppliers()
    const staticSupplierNames = Array.from(new Set(staticProducts.map((p: any) => p.supplier)))
    const dynamicSupplierNames = dynamicSuppliers.map(s => s.name)
    const allSupplierNames = Array.from(new Set([...staticSupplierNames, ...dynamicSupplierNames]))
    return allSupplierNames.sort()
  }, [getAllSuppliers])

  const filteredProducts = useMemo(() => {
    let products = allProducts

    if (selectedSupplier) {
      products = products.filter(p => p.supplier === selectedSupplier)
    }

    if (searchTerm) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (showFavoritesOnly) {
      products = products.filter(p => favorites.includes(p.id))
    }

    return products
  }, [selectedSupplier, searchTerm, showFavoritesOnly, favorites])

  if (!selectedSupplier) {
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
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl sm:text-2xl">בחר ספק</h2>
              </div>
              <div className="w-6 sm:w-7" />
            </div>
          </header>

          <div className="space-y-3 sm:space-y-4">
            {suppliers.map((supplier: string) => (
              <button
                key={supplier}
                onClick={() => setSelectedSupplier(supplier)}
                className="w-full bg-secondary p-5 sm:p-6 rounded-[1.75rem] sm:rounded-[2rem] shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-between group touch-manipulation"
              >
                <span className="font-black text-primary text-base sm:text-lg">{supplier}</span>
                <ChevronRight className="text-primary/20 group-hover:text-primary/40 group-active:text-primary/50 transition-colors rotate-180" size={20} />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary pb-24">
      <div className="sticky top-0 z-10 bg-primary p-4 sm:p-6 pb-3">
        <div className="max-w-2xl mx-auto">
          <div className="bg-secondary rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 mb-3 shadow-xl">
            <div className="flex items-center gap-3 sm:gap-4 mb-3">
              <button
                onClick={() => setSelectedSupplier('')}
                className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
              >
                <ChevronRight size={24} className="sm:hidden" />
                <ChevronRight size={28} className="hidden sm:block" />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-lg sm:text-xl">{selectedSupplier}</h2>
              </div>
              <div className="w-6 sm:w-7" />
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40" size={20} />
              <input
                type="text"
                placeholder="חיפוש מוצר..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-primary/5 text-primary placeholder:text-primary/40 rounded-xl py-3 pr-10 pl-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all touch-manipulation ${
                showFavoritesOnly
                  ? 'bg-amber-500 text-white'
                  : 'bg-secondary text-primary'
              }`}
            >
              <Star size={16} className={showFavoritesOnly ? 'fill-white' : ''} />
              <span>מועדפים</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-secondary/60 font-bold">לא נמצאו מוצרים</p>
          </div>
        )}
      </div>

      {getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-primary/95 backdrop-blur-sm border-t-2 border-secondary/20">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => navigate('/summary')}
              className="w-full bg-secondary text-primary font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-xl touch-manipulation"
            >
              <ShoppingCart size={24} />
              <span>סל הקניות ({getTotalItems()})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

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
                <h2 className="font-black text-primary text-xl">בחר ספק</h2>
              </div>
              <div className="w-8" />
            </div>
          </header>

          <div className="space-y-3">
            {suppliers.map((supplier: string) => (
              <button
                key={supplier}
                onClick={() => setSelectedSupplier(supplier)}
                className="w-full bg-secondary rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
              >
                <div className="flex items-center justify-between p-5">
                  <span className="font-black text-primary text-lg">{supplier}</span>
                  <ChevronRight className="text-primary/30 transition-colors rotate-180" size={20} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary pb-24">
      <div className="sticky top-0 z-10 bg-primary pt-4 pb-3">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-secondary rounded-3xl p-4 mb-3 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setSelectedSupplier('')}
                className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
              >
                <ChevronRight size={24} />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-lg">{selectedSupplier}</h2>
              </div>
              <div className="w-8" />
            </div>

            <div className="relative mb-3">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40" size={18} />
              <input
                type="text"
                placeholder="חיפוש מוצר..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-primary/5 text-primary placeholder:text-primary/40 rounded-xl py-2.5 pr-10 pl-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all touch-manipulation ${
                showFavoritesOnly
                  ? 'bg-amber-500 text-white'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              <Star size={16} className={showFavoritesOnly ? 'fill-white' : ''} />
              <span>מועדפים</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        <div className="space-y-3">
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
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-primary/95 backdrop-blur-sm border-t-2 border-secondary/20 safe-bottom">
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

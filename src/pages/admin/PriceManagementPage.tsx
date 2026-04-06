import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Search, Edit2, Save, X } from 'lucide-react'
import { PRODUCTS as staticProducts } from '../../data/products'
import { useSuppliersStore } from '../../stores/suppliersStore'
import { formatPrice } from '../../lib/utils'
import { motion } from 'framer-motion'

export default function PriceManagementPage() {
  const navigate = useNavigate()
  const { getAllProducts, updateProduct } = useSuppliersStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  
  // שילוב מוצרים סטטיים ודינמיים
  const allProducts = useMemo(() => {
    const dynamicProducts = getAllProducts()
    return [...staticProducts, ...dynamicProducts]
  }, [getAllProducts])
  
  const [products, setProducts] = useState(allProducts)

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [products, searchTerm])

  const handleSave = (id: string) => {
    const price = parseFloat(editPrice)
    if (!isNaN(price) && price > 0) {
      // עדכן ב-state המקומי
      setProducts(products.map(p => 
        p.id === id ? { ...p, price } : p
      ))
      
      // עדכן גם ב-store אם זה מוצר דינמי
      const product = products.find(p => p.id === id)
      if (product && id.startsWith('product_')) {
        updateProduct(id, { price })
      }
      
      setEditingId(null)
      setEditPrice('')
    }
  }

  const handleStartEdit = (productId: string, currentPrice: number) => {
    setEditingId(productId)
    setEditPrice(currentPrice.toString())
  }

  return (
    <div className="min-h-screen bg-primary pb-safe">
      <div className="sticky top-0 z-10 bg-primary p-4 sm:p-6 pb-3">
        <div className="max-w-2xl mx-auto">
          <div className="bg-secondary rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 mb-3 shadow-xl">
            <div className="flex items-center gap-3 sm:gap-4 mb-3">
              <button
                onClick={() => navigate('/admin')}
                className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
              >
                <ChevronRight size={24} className="sm:hidden" />
                <ChevronRight size={28} className="hidden sm:block" />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl sm:text-2xl">ניהול מחירים</h2>
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
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-2">
        {filteredProducts.map((product) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-secondary rounded-xl p-4 shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <h3 className="font-bold text-primary text-sm mb-1">{product.name}</h3>
                <p className="text-primary/60 text-xs">{product.supplier}</p>
              </div>
              
              {editingId === product.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-24 bg-primary/5 text-primary text-center font-bold rounded-lg py-2 px-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSave(product.id)}
                    className="p-2 bg-green-500 text-white rounded-lg touch-manipulation"
                  >
                    <Save size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null)
                      setEditPrice('')
                    }}
                    className="p-2 bg-red-500 text-white rounded-lg touch-manipulation"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-left">
                    <p className="font-black text-primary text-lg">{formatPrice(product.price)}</p>
                  </div>
                  <button
                    onClick={() => handleStartEdit(product.id, product.price)}
                    className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors touch-manipulation"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

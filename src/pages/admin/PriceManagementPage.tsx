import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Search, Edit2, Save, X, Trash2, Plus, Eye, EyeOff } from 'lucide-react'
import { useSuppliersStore } from '../../stores/suppliersStore'
import { formatPrice } from '../../lib/utils'

export default function PriceManagementPage() {
  const navigate = useNavigate()
  const { updateProduct, deleteProduct, addProducts } = useSuppliersStore()
  const products = useSuppliersStore(s => s.products)

  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [addingSupplier, setAddingSupplier] = useState<string | null>(null)
  const [newProductName, setNewProductName] = useState('')
  const [newProductPrice, setNewProductPrice] = useState('')
  const [newProductAdminOnly, setNewProductAdminOnly] = useState(false)
  const [filterAdminOnly, setFilterAdminOnly] = useState(false)

  const adminOnlyCount = useMemo(() => products.filter(p => p.adminOnly).length, [products])

  // קבץ לפי ספק, עם סינון חיפוש + פילטר אדמין
  const grouped = useMemo(() => {
    const lower = searchTerm.toLowerCase()
    let filtered = products.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.supplier.toLowerCase().includes(lower)
    )
    if (filterAdminOnly) {
      filtered = filtered.filter(p => p.adminOnly)
    }
    const map = new Map<string, typeof filtered>()
    for (const p of filtered) {
      if (!map.has(p.supplier)) map.set(p.supplier, [])
      map.get(p.supplier)!.push(p)
    }
    return map
  }, [products, searchTerm, filterAdminOnly])

  const handleSave = (id: string) => {
    const price = parseFloat(editPrice)
    if (!isNaN(price) && price > 0) {
      updateProduct(id, { price })
      setEditingId(null)
      setEditPrice('')
    }
  }

  const handleStartEdit = (id: string, currentPrice: number) => {
    setEditingId(id)
    setEditPrice(currentPrice.toString())
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`למחוק את "${name}"?`)) {
      deleteProduct(id)
    }
  }

  const handleAdd = (supplier: string) => {
    const price = parseFloat(newProductPrice)
    if (!newProductName.trim() || isNaN(price) || price <= 0) return
    addProducts([{ name: newProductName.trim(), supplier, price, adminOnly: newProductAdminOnly || undefined }])
    setNewProductName('')
    setNewProductPrice('')
    setNewProductAdminOnly(false)
    setAddingSupplier(null)
  }

  const handleCancelAdd = () => {
    setNewProductName('')
    setNewProductPrice('')
    setNewProductAdminOnly(false)
    setAddingSupplier(null)
  }

  return (
    <div className="min-h-screen bg-primary pb-safe">
      {/* Header */}
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
                <h2 className="font-black text-primary text-xl sm:text-2xl">ניהול מחירים ומוצרים</h2>
              </div>
              <div className="w-6 sm:w-7" />
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40" size={20} />
              <input
                type="text"
                placeholder="חיפוש מוצר או ספק..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-primary/5 text-primary placeholder:text-primary/40 rounded-xl py-3 pr-10 pl-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {adminOnlyCount > 0 && (
              <button
                onClick={() => setFilterAdminOnly(f => !f)}
                className={`mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors touch-manipulation ${filterAdminOnly ? 'bg-amber-100 text-amber-700' : 'bg-primary/5 text-primary/50 hover:bg-primary/10'}`}
              >
                <EyeOff size={14} />
                <span>מוצרי אדמין בלבד ({adminOnlyCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content — grouped by supplier */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4 pb-8">
        {[...grouped.entries()].map(([supplier, supplierProducts]) => (
          <div key={supplier} className="bg-secondary rounded-2xl shadow-md overflow-hidden">
            {/* Supplier header */}
            <div className="px-4 py-3 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
              <div>
                <h3 className="font-black text-primary text-base">{supplier}</h3>
                <p className="text-primary/50 text-xs">{supplierProducts.length} מוצרים</p>
              </div>
            </div>

            {/* Products */}
            {supplierProducts.map((product, idx) => (
              <div
                key={product.id}
                className={`flex items-center gap-3 px-4 py-3 ${idx < supplierProducts.length - 1 ? 'border-b border-primary/5' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-primary text-sm leading-snug">
                    {product.name}
                    {product.adminOnly && <span className="text-amber-500 text-xs mr-1">(אדמין)</span>}
                  </p>
                </div>

                {editingId === product.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave(product.id)}
                      className="w-20 bg-primary/5 text-primary text-center font-bold rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSave(product.id)}
                      className="p-1.5 bg-green-500 text-white rounded-lg touch-manipulation"
                    >
                      <Save size={15} />
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditPrice('') }}
                      className="p-1.5 bg-red-500 text-white rounded-lg touch-manipulation"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <p className="font-black text-primary text-base min-w-[3rem] text-left">{formatPrice(product.price)}</p>
                    <button
                      onClick={() => handleStartEdit(product.id, product.price)}
                      className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors touch-manipulation"
                      title="ערוך מחיר"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => updateProduct(product.id, { adminOnly: !product.adminOnly })}
                      className={`p-1.5 rounded-lg transition-colors touch-manipulation ${product.adminOnly ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary/40 hover:bg-primary/20'}`}
                      title={product.adminOnly ? 'מוצר אדמין בלבד — לחץ להצגה לסניפים' : 'גלוי לסניפים — לחץ להסתרה'}
                    >
                      {product.adminOnly ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 transition-colors touch-manipulation"
                      title="מחק מוצר"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Add product row */}
            {addingSupplier === supplier ? (
              <div className="px-4 py-3 bg-green-50/50 border-t border-primary/10 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="שם מוצר"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="flex-1 bg-white text-primary placeholder:text-primary/40 rounded-lg py-2 px-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-green-400/40 border border-primary/10"
                    autoFocus
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="מחיר"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd(supplier)}
                    className="w-20 bg-white text-primary placeholder:text-primary/40 rounded-lg py-2 px-2 font-bold text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-400/40 border border-primary/10"
                  />
                  <button
                    onClick={() => handleAdd(supplier)}
                    className="p-2 bg-green-500 text-white rounded-lg touch-manipulation shrink-0"
                    title="הוסף"
                  >
                    <Save size={16} />
                  </button>
                  <button
                    onClick={handleCancelAdd}
                    className="p-2 bg-red-500 text-white rounded-lg touch-manipulation shrink-0"
                    title="ביטול"
                  >
                    <X size={16} />
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-primary/60 cursor-pointer touch-manipulation">
                  <input
                    type="checkbox"
                    checked={newProductAdminOnly}
                    onChange={(e) => setNewProductAdminOnly(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <EyeOff size={13} className="text-amber-500" />
                  <span>מוצר אדמין בלבד (מוסתר מהסניפים)</span>
                </label>
              </div>
            ) : (
              <button
                onClick={() => { setAddingSupplier(supplier); setEditingId(null) }}
                className="w-full px-4 py-2.5 flex items-center gap-2 text-primary/40 hover:text-primary/70 hover:bg-primary/5 transition-colors border-t border-primary/5 touch-manipulation"
              >
                <Plus size={16} />
                <span className="text-sm font-bold">הוסף מוצר</span>
              </button>
            )}
          </div>
        ))}

        {grouped.size === 0 && (
          <div className="text-center text-primary/40 py-12 font-bold">
            לא נמצאו מוצרים
          </div>
        )}
      </div>
    </div>
  )
}

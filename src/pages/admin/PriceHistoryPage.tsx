import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, TrendingUp, TrendingDown, Minus, Search } from 'lucide-react'
import { usePriceHistoryStore } from '../../stores/priceHistoryStore'
import { formatPrice } from '../../lib/utils'

export default function PriceHistoryPage() {
  const navigate = useNavigate()
  const { getKnownProducts, getProductHistory, getPriceTrend } = usePriceHistoryStore()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const products = getKnownProducts()

  const filtered = useMemo(() =>
    products.filter(p =>
      p.productName.includes(search) || p.supplier.includes(search)
    ), [products, search])

  const selectedHistory = selectedId ? getProductHistory(selectedId) : []
  const trend = selectedId ? getPriceTrend(selectedId) : null
  const selectedProduct = products.find(p => p.productId === selectedId)

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-primary pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-secondary rounded-3xl p-4 shadow-xl mb-4 flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="text-primary p-1 touch-manipulation">
              <ChevronRight size={24} />
            </button>
            <h2 className="flex-1 text-center font-black text-primary text-xl">מעקב מחירים</h2>
            <div className="w-8" />
          </div>
          <div className="text-center py-16">
            <TrendingUp className="mx-auto text-secondary/30 mb-4" size={56} />
            <p className="text-secondary/60 font-bold text-lg">אין היסטוריית מחירים עדיין</p>
            <p className="text-secondary/40 text-sm mt-1">מחירים יירשמו אוטומטית עם כל הזמנה שנשלחת</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="sticky top-0 z-10 bg-primary pt-4 pb-3">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-secondary rounded-3xl p-4 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => navigate('/admin')} className="text-primary p-1 touch-manipulation">
                <ChevronRight size={24} />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl">מעקב מחירים</h2>
                <p className="text-primary/60 text-xs mt-0.5">{products.length} מוצרים עם היסטוריה</p>
              </div>
              <div className="w-8" />
            </div>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40" size={16} />
              <input
                type="text"
                placeholder="חיפוש מוצר או ספק..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-primary/5 text-primary placeholder:text-primary/30 rounded-xl py-2.5 pr-9 pl-4 font-bold text-sm focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-2">

        {/* פרטי מוצר נבחר */}
        {selectedId && selectedProduct && (
          <div className="bg-secondary rounded-3xl p-4 shadow-xl">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-black text-primary text-base">{selectedProduct.productName}</h3>
                <p className="text-primary/60 text-xs">{selectedProduct.supplier}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-primary/40 p-1 touch-manipulation">✕</button>
            </div>

            {/* סיכום מגמה */}
            {trend && (
              <div className={`rounded-2xl p-3 mb-3 flex items-center gap-3 ${
                trend.changePct > 5 ? 'bg-red-50' :
                trend.changePct < -5 ? 'bg-green-50' : 'bg-primary/5'
              }`}>
                {trend.changePct > 5
                  ? <TrendingUp className="text-red-500" size={20} />
                  : trend.changePct < -5
                    ? <TrendingDown className="text-green-600" size={20} />
                    : <Minus className="text-primary/40" size={20} />
                }
                <div>
                  <p className={`font-black text-sm ${
                    trend.changePct > 5 ? 'text-red-700' :
                    trend.changePct < -5 ? 'text-green-700' : 'text-primary'
                  }`}>
                    {trend.changePct > 0 ? '+' : ''}{trend.changePct.toFixed(1)}% מאז ההזמנה הראשונה
                  </p>
                  <p className="text-primary/50 text-xs">
                    {formatPrice(trend.first)} → {formatPrice(trend.last)}
                  </p>
                </div>
              </div>
            )}

            {/* טבלת היסטוריה */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {selectedHistory.map((point, i) => {
                const prev = i > 0 ? selectedHistory[i - 1].price : null
                const diff = prev !== null ? point.price - prev : null
                return (
                  <div key={i} className="flex items-center justify-between text-sm bg-primary/5 rounded-xl px-3 py-2">
                    <span className="text-primary/60 text-xs font-bold">
                      {new Date(point.orderedAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-2">
                      {diff !== null && diff !== 0 && (
                        <span className={`text-xs font-bold ${diff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {diff > 0 ? '+' : ''}{formatPrice(diff)}
                        </span>
                      )}
                      <span className="font-black text-primary">{formatPrice(point.price)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* רשימת מוצרים */}
        {filtered.map(product => {
          const trend = getPriceTrend(product.productId)
          const history = getProductHistory(product.productId)
          const lastPrice = history.length > 0 ? history[history.length - 1].price : null
          const isSelected = selectedId === product.productId

          return (
            <button
              key={product.productId}
              onClick={() => setSelectedId(isSelected ? null : product.productId)}
              className={`w-full bg-secondary rounded-2xl p-3.5 shadow-sm flex items-center justify-between active:scale-[0.98] touch-manipulation transition-all ${
                isSelected ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="flex-1 text-right min-w-0">
                <p className="font-black text-primary text-sm truncate">{product.productName}</p>
                <p className="text-primary/50 text-xs">{product.supplier} • {history.length} נקודות</p>
              </div>
              <div className="flex items-center gap-2 mr-3 flex-shrink-0">
                {trend && (
                  <span className={`text-xs font-black px-1.5 py-0.5 rounded-lg ${
                    trend.changePct > 5 ? 'bg-red-100 text-red-600' :
                    trend.changePct < -5 ? 'bg-green-100 text-green-700' :
                    'bg-primary/10 text-primary/60'
                  }`}>
                    {trend.changePct > 0 ? '+' : ''}{trend.changePct.toFixed(0)}%
                  </span>
                )}
                {lastPrice && (
                  <span className="font-black text-primary text-sm">{formatPrice(lastPrice)}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

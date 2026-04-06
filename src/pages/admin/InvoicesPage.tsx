import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Upload, FileText, Trash2, Calendar, Building2, DollarSign } from 'lucide-react'
import { useInvoicesStore } from '../../stores/invoicesStore'
import { useSuppliersStore } from '../../stores/suppliersStore'
import { useAuthStore } from '../../stores/authStore'
import { motion, AnimatePresence } from 'framer-motion'

export default function InvoicesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { invoices, addInvoice, deleteInvoice } = useInvoicesStore()
  const { suppliers } = useSuppliersStore()
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    supplierId: '',
    branchCode: '',
    month: '',
    items: [] as any[],
    notes: ''
  })

  const branches = [
    { code: 'TLV', name: 'תל אביב' },
    { code: 'HFA', name: 'חיפה' },
    { code: 'BER', name: 'באר שבע' }
  ]

  const handleUpload = () => {
    if (!uploadForm.supplierId || !uploadForm.branchCode || !uploadForm.month) {
      alert('נא למלא את כל השדות הנדרשים')
      return
    }

    const supplier = suppliers.find(s => s.id === uploadForm.supplierId)
    const branch = branches.find(b => b.code === uploadForm.branchCode)
    
    if (!supplier || !branch) return

    const totalAmount = uploadForm.items.reduce((sum, item) => sum + item.totalPrice, 0)
    const [year] = uploadForm.month.split('-')

    addInvoice({
      supplierId: supplier.id,
      supplierName: supplier.name,
      branchCode: branch.code,
      branchName: branch.name,
      month: uploadForm.month,
      year: parseInt(year),
      items: uploadForm.items,
      totalAmount,
      fileName: `invoice_${supplier.name}_${branch.name}_${uploadForm.month}.pdf`,
      fileUrl: '#', // בעתיד - העלאה אמיתית
      uploadedBy: user?.username || 'admin',
      notes: uploadForm.notes
    })

    setShowUploadForm(false)
    setUploadForm({
      supplierId: '',
      branchCode: '',
      month: '',
      items: [],
      notes: ''
    })
  }

  const addItem = () => {
    setUploadForm({
      ...uploadForm,
      items: [
        ...uploadForm.items,
        { productName: '', quantity: 0, unitPrice: 0, totalPrice: 0 }
      ]
    })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...uploadForm.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice
    }
    
    setUploadForm({ ...uploadForm, items: newItems })
  }

  const removeItem = (index: number) => {
    setUploadForm({
      ...uploadForm,
      items: uploadForm.items.filter((_, i) => i !== index)
    })
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const monthNames = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ]
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <header className="bg-secondary rounded-3xl p-5 mb-6 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
            >
              <ChevronRight size={24} />
            </button>
            <div className="flex-1 text-center">
              <h2 className="font-black text-primary text-xl">ניהול חשבוניות</h2>
              <p className="text-primary/60 text-xs mt-1">העלאה וניתוח חשבוניות חודשיות</p>
            </div>
            <button
              onClick={() => setShowUploadForm(true)}
              className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
            >
              <Upload size={24} />
            </button>
          </div>
        </header>

        <AnimatePresence>
          {showUploadForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-secondary rounded-3xl p-5 mb-6 shadow-lg"
            >
              <h3 className="font-black text-primary text-lg mb-4">העלאת חשבונית חדשה</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-primary font-bold text-sm mb-2">ספק *</label>
                  <select
                    value={uploadForm.supplierId}
                    onChange={(e) => setUploadForm({ ...uploadForm, supplierId: e.target.value })}
                    className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">בחר ספק</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-primary font-bold text-sm mb-2">סניף *</label>
                  <select
                    value={uploadForm.branchCode}
                    onChange={(e) => setUploadForm({ ...uploadForm, branchCode: e.target.value })}
                    className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">בחר סניף</option>
                    {branches.map(b => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-primary font-bold text-sm mb-2">חודש *</label>
                  <input
                    type="month"
                    value={uploadForm.month}
                    onChange={(e) => setUploadForm({ ...uploadForm, month: e.target.value })}
                    className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-primary font-bold text-sm">פריטים</label>
                    <button
                      onClick={addItem}
                      className="text-primary text-sm font-bold hover:text-primary/70"
                    >
                      + הוסף פריט
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uploadForm.items.map((item, index) => (
                      <div key={index} className="bg-primary/5 rounded-xl p-3 space-y-2">
                        <input
                          type="text"
                          placeholder="שם מוצר"
                          value={item.productName}
                          onChange={(e) => updateItem(index, 'productName', e.target.value)}
                          className="w-full bg-white/50 text-primary rounded-lg py-1.5 px-3 text-sm font-bold focus:outline-none"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            placeholder="כמות"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white/50 text-primary rounded-lg py-1.5 px-3 text-sm font-bold focus:outline-none"
                          />
                          <input
                            type="number"
                            placeholder="מחיר"
                            value={item.unitPrice || ''}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white/50 text-primary rounded-lg py-1.5 px-3 text-sm font-bold focus:outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-primary text-sm font-bold">₪{item.totalPrice.toFixed(2)}</span>
                            <button
                              onClick={() => removeItem(index)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-primary font-bold text-sm mb-2">הערות</label>
                  <textarea
                    value={uploadForm.notes}
                    onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                    className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[60px]"
                    placeholder="הערות נוספות..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleUpload}
                    className="flex-1 bg-primary text-secondary font-bold py-2.5 rounded-xl active:scale-95 transition-transform"
                  >
                    שמור חשבונית
                  </button>
                  <button
                    onClick={() => setShowUploadForm(false)}
                    className="flex-1 bg-primary/10 text-primary font-bold py-2.5 rounded-xl active:scale-95 transition-transform"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="text-center py-12 bg-secondary rounded-3xl">
              <FileText className="mx-auto text-primary/30 mb-4" size={64} />
              <p className="text-primary/60 font-bold text-lg mb-4">אין חשבוניות במערכת</p>
              <button
                onClick={() => setShowUploadForm(true)}
                className="bg-primary text-secondary font-bold py-3 px-6 rounded-xl active:scale-95 transition-transform"
              >
                העלה חשבונית ראשונה
              </button>
            </div>
          ) : (
            invoices.map((invoice) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary rounded-3xl p-5 shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-black text-primary text-lg">{invoice.supplierName}</h3>
                    <div className="flex items-center gap-4 mt-2 text-primary/70 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={14} />
                        <span>{invoice.branchName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span>{formatMonth(invoice.month)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={14} />
                        <span className="font-bold">₪{invoice.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteInvoice(invoice.id)}
                    className="text-red-500 hover:text-red-600 p-2 active:scale-95 transition-transform"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="bg-primary/5 rounded-xl p-3">
                  <p className="text-primary/60 text-xs mb-2 font-bold">פריטים ({invoice.items.length}):</p>
                  <div className="space-y-1">
                    {invoice.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-primary">{item.productName}</span>
                        <span className="text-primary/70">₪{item.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                    {invoice.items.length > 3 && (
                      <p className="text-primary/60 text-xs">ועוד {invoice.items.length - 3} פריטים...</p>
                    )}
                  </div>
                </div>

                {invoice.notes && (
                  <p className="text-primary/60 text-sm mt-3 italic">{invoice.notes}</p>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

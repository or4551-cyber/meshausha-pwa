import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Mail, Phone, User, Save, Edit2 } from 'lucide-react'
import { useSuppliersStore } from '../../stores/suppliersStore'
import { motion } from 'framer-motion'

export default function SuppliersContactPage() {
  const navigate = useNavigate()
  const { suppliers, updateSupplier } = useSuppliersStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    email: '',
    contactPerson: '',
    phone: ''
  })

  const handleEdit = (supplier: any) => {
    setEditingId(supplier.id)
    setEditForm({
      email: supplier.email || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || ''
    })
  }

  const handleSave = (id: string) => {
    updateSupplier(id, editForm)
    setEditingId(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditForm({ email: '', contactPerson: '', phone: '' })
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
              <h2 className="font-black text-primary text-xl">פרטי קשר ספקים</h2>
              <p className="text-primary/60 text-xs mt-1">ניהול מיילים ואנשי קשר</p>
            </div>
          </div>
        </header>

        <div className="space-y-3">
          {suppliers.length === 0 ? (
            <div className="text-center py-12 bg-secondary rounded-3xl">
              <Mail className="mx-auto text-primary/30 mb-4" size={64} />
              <p className="text-primary/60 font-bold text-lg">אין ספקים במערכת</p>
            </div>
          ) : (
            suppliers.map((supplier) => (
              <motion.div
                key={supplier.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary rounded-3xl p-5 shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-black text-primary text-lg">{supplier.name}</h3>
                    <p className="text-primary/60 text-sm">{supplier.description}</p>
                  </div>
                  {editingId !== supplier.id && (
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="text-primary hover:text-primary/70 p-2 active:scale-95 transition-transform"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}
                </div>

                {editingId === supplier.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-primary font-bold text-sm mb-2 flex items-center gap-2">
                        <Mail size={16} />
                        כתובת מייל
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="supplier@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-primary font-bold text-sm mb-2 flex items-center gap-2">
                        <User size={16} />
                        איש קשר
                      </label>
                      <input
                        type="text"
                        value={editForm.contactPerson}
                        onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                        className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="שם מלא"
                      />
                    </div>

                    <div>
                      <label className="block text-primary font-bold text-sm mb-2 flex items-center gap-2">
                        <Phone size={16} />
                        טלפון
                      </label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="050-1234567"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleSave(supplier.id)}
                        className="flex-1 bg-primary text-secondary font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                      >
                        <Save size={18} />
                        שמור
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex-1 bg-primary/10 text-primary font-bold py-2.5 rounded-xl active:scale-95 transition-transform"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary/70 text-sm">
                      <Mail size={16} />
                      <span>{supplier.email || 'לא הוגדר מייל'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary/70 text-sm">
                      <User size={16} />
                      <span>{supplier.contactPerson || 'לא הוגדר איש קשר'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary/70 text-sm">
                      <Phone size={16} />
                      <span>{supplier.phone || 'לא הוגדר טלפון'}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

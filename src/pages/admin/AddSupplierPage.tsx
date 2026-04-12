import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Upload, Download, Check, X, Plus } from 'lucide-react'
import { useSuppliersStore, DaySchedule } from '../../stores/suppliersStore'
import { parseFile, validateProducts, downloadSampleCSV, ParsedProduct } from '../../lib/fileParser'
import { motion, AnimatePresence } from 'framer-motion'

const BRANCHES = [
  { code: '1001', name: 'עין המפרץ' },
  { code: '1002', name: 'ביאליק קרן היסוד' },
  { code: '1003', name: 'מוצקין הילדים' },
  { code: '1004', name: 'צור שלום' },
  { code: '1005', name: 'גושן 60' },
  { code: '1006', name: 'נהריה הגעתון' },
  { code: '1007', name: 'ההסתדרות' },
  { code: '1008', name: 'משכנות האומנים' },
  { code: '1009', name: 'רון קריית ביאליק' }
]

export default function AddSupplierPage() {
  const navigate = useNavigate()
  const { addSupplier, addProducts } = useSuppliersStore()
  
  const [step, setStep] = useState(1)
  const [supplierName, setSupplierName] = useState('')
  const [description, setDescription] = useState('')
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([])
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const days = [
    { value: 0, label: 'ראשון' },
    { value: 1, label: 'שני' },
    { value: 2, label: 'שלישי' },
    { value: 3, label: 'רביעי' },
    { value: 4, label: 'חמישי' },
    { value: 5, label: 'שישי' },
    { value: 6, label: 'שבת' }
  ]

  const removeDaySchedule = (index: number) => {
    setDaySchedules(prev => prev.filter((_, i) => i !== index))
  }

  const updateDaySchedule = (index: number, updates: Partial<DaySchedule>) => {
    setDaySchedules(prev => prev.map((schedule, i) => 
      i === index ? { ...schedule, ...updates } : schedule
    ))
  }

  const toggleBranch = (scheduleIndex: number, branchCode: string) => {
    setDaySchedules(prev => prev.map((schedule, i) => {
      if (i !== scheduleIndex) return schedule
      
      const branchCodes = schedule.branchCodes.includes(branchCode)
        ? schedule.branchCodes.filter(code => code !== branchCode)
        : [...schedule.branchCodes, branchCode]
      
      return { ...schedule, branchCodes }
    }))
  }

  const selectAllBranches = (scheduleIndex: number) => {
    setDaySchedules(prev => prev.map((schedule, i) => 
      i === scheduleIndex 
        ? { ...schedule, branchCodes: BRANCHES.map(b => b.code) }
        : schedule
    ))
  }

  const deselectAllBranches = (scheduleIndex: number) => {
    setDaySchedules(prev => prev.map((schedule, i) => 
      i === scheduleIndex 
        ? { ...schedule, branchCodes: [] }
        : schedule
    ))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setErrors([])

    try {
      const products = await parseFile(file)
      const { valid, errors: validationErrors } = validateProducts(products)
      
      setParsedProducts(valid)
      setErrors(validationErrors)
      
      if (valid.length > 0) {
        setStep(3)
      }
    } catch (error) {
      setErrors(['שגיאה בקריאת הקובץ. אנא נסה שוב.'])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = () => {
    // הוסף את הספק
    addSupplier({
      name: supplierName,
      description,
      schedules: daySchedules
    })

    // הוסף את המוצרים
    const productsToAdd = parsedProducts.map(p => ({
      name: p.name,
      supplier: supplierName,
      price: p.price,
      category: p.category
    }))
    
    addProducts(productsToAdd)

    // חזור לדף האדמין
    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-primary pb-safe">
      <div className="sticky top-0 z-10 bg-primary p-4 sm:p-6 pb-3">
        <div className="max-w-2xl mx-auto">
          <div className="bg-secondary rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 shadow-xl">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
              >
                <ChevronRight size={24} className="sm:hidden" />
                <ChevronRight size={28} className="hidden sm:block" />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl sm:text-2xl">הוספת ספק חדש</h2>
                <p className="text-primary/60 text-xs font-bold mt-1">שלב {step} מתוך 3</p>
              </div>
              <div className="w-6 sm:w-7" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {/* שלב 1: פרטי ספק */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-secondary rounded-2xl p-5 shadow-md">
                <h3 className="font-black text-primary text-lg mb-4">פרטי הספק</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-primary font-bold text-sm mb-2">שם הספק *</label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="לדוגמה: מעדניית השף"
                      className="w-full bg-primary/5 text-primary placeholder:text-primary/40 rounded-xl py-3 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-primary font-bold text-sm mb-2">תיאור (אופציונלי)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="תיאור קצר של הספק..."
                      className="w-full bg-primary/5 text-primary placeholder:text-primary/40 rounded-xl py-3 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!supplierName.trim()}
                className="w-full bg-primary text-secondary font-black py-4 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-[0.98] touch-manipulation"
              >
                המשך
              </button>
            </motion.div>
          )}

          {/* שלב 2: ימי הזמנה וסניפים */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-secondary rounded-2xl p-5 shadow-md">
                <h3 className="font-black text-primary text-lg mb-4">לוח זמנים וסניפים</h3>
                
                {/* הוספת יום חדש */}
                <div className="mb-4 p-4 bg-primary/5 rounded-xl">
                  <label className="block text-primary font-bold text-sm mb-2">הוסף יום הזמנה</label>
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '') return
                      const dayNum = Number(val)
                      setDaySchedules(prev => [...prev, {
                        day: dayNum,
                        branchCodes: [],
                        notificationTime: '09:00'
                      }])
                    }}
                    className="w-full bg-white text-primary rounded-xl py-2 px-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">בחר יום להוסיף...</option>
                    {days.filter(d => !daySchedules.some(s => s.day === d.value)).map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>

                {/* רשימת ימים שנבחרו */}
                <div className="space-y-3">
                  {daySchedules.map((schedule, index) => (
                    <div key={index} className="bg-white rounded-xl p-4 border-2 border-primary/10">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-black text-primary">
                          יום {days.find(d => d.value === schedule.day)?.label}
                        </h4>
                        <button
                          onClick={() => removeDaySchedule(index)}
                          className="text-red-500 p-1 hover:bg-red-50 rounded-lg"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* שעת התראה */}
                      <div className="mb-3">
                        <label className="block text-primary/70 text-xs font-bold mb-1">שעת התראה</label>
                        <input
                          type="time"
                          value={schedule.notificationTime}
                          onChange={(e) => updateDaySchedule(index, { notificationTime: e.target.value })}
                          className="w-full bg-primary/5 text-primary rounded-lg py-2 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      {/* בחירת סניפים */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-primary/70 text-xs font-bold">
                            סניפים ({schedule.branchCodes.length}/{BRANCHES.length})
                          </label>
                          <div className="flex gap-1">
                            <button
                              onClick={() => selectAllBranches(index)}
                              className="text-xs text-bot font-bold px-2 py-1 hover:bg-bot/10 rounded"
                            >
                              בחר הכל
                            </button>
                            <button
                              onClick={() => deselectAllBranches(index)}
                              className="text-xs text-red-500 font-bold px-2 py-1 hover:bg-red-50 rounded"
                            >
                              נקה
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {BRANCHES.map(branch => (
                            <button
                              key={branch.code}
                              onClick={() => toggleBranch(index, branch.code)}
                              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                schedule.branchCodes.includes(branch.code)
                                  ? 'bg-bot text-white'
                                  : 'bg-primary/10 text-primary'
                              }`}
                            >
                              {branch.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {daySchedules.length === 0 && (
                    <div className="text-center py-8 text-primary/40 text-sm">
                      לא נבחרו ימי הזמנה. הוסף יום ראשון למעלה.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-secondary/20 text-secondary font-bold py-4 rounded-2xl active:scale-[0.98] transition-transform touch-manipulation"
                >
                  חזור
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={daySchedules.length === 0 || daySchedules.some(s => s.branchCodes.length === 0)}
                  className="flex-1 bg-primary text-secondary font-black py-4 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-[0.98] touch-manipulation"
                >
                  המשך
                </button>
              </div>
            </motion.div>
          )}

          {/* שלב 3: העלאת מוצרים */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-secondary rounded-2xl p-5 shadow-md">
                <h3 className="font-black text-primary text-lg mb-4">מוצרים ומחירים</h3>
                
                {parsedProducts.length === 0 ? (
                  <div className="space-y-4">
                    <button
                      onClick={downloadSampleCSV}
                      className="w-full bg-primary/10 text-primary font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform touch-manipulation"
                    >
                      <Download size={20} />
                      <span>הורד קובץ דוגמה</span>
                    </button>

                    <div className="relative">
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        disabled={isProcessing}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <button
                        disabled={isProcessing}
                        className="w-full bg-primary text-secondary font-black py-4 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl touch-manipulation"
                      >
                        <Upload size={24} />
                        <span>{isProcessing ? 'מעבד...' : 'העלה קובץ מוצרים'}</span>
                      </button>
                    </div>

                    <p className="text-primary/60 text-xs text-center">
                      תומך בקבצי CSV או TXT
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-green-50 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <Check className="text-green-600" size={20} />
                        <span className="text-green-900 font-bold text-sm">
                          {parsedProducts.length} מוצרים נטענו בהצלחה
                        </span>
                      </div>
                    </div>

                    {errors.length > 0 && (
                      <div className="bg-red-50 rounded-xl p-3">
                        <div className="flex items-start gap-2">
                          <X className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                          <div className="flex-1">
                            <p className="text-red-900 font-bold text-xs mb-1">שגיאות:</p>
                            {errors.slice(0, 3).map((error, i) => (
                              <p key={i} className="text-red-800 text-xs">• {error}</p>
                            ))}
                            {errors.length > 3 && (
                              <p className="text-red-700 text-xs mt-1">ועוד {errors.length - 3} שגיאות...</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="max-h-64 overflow-y-auto bg-primary/5 rounded-xl p-3">
                      <div className="space-y-2">
                        {parsedProducts.slice(0, 10).map((product, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-primary font-bold">{product.name}</span>
                            <span className="text-primary/60">₪{product.price.toFixed(2)}</span>
                          </div>
                        ))}
                        {parsedProducts.length > 10 && (
                          <p className="text-primary/50 text-xs text-center pt-2">
                            ועוד {parsedProducts.length - 10} מוצרים...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setParsedProducts([])
                    setErrors([])
                    setStep(2)
                  }}
                  className="flex-1 bg-secondary/20 text-secondary font-bold py-4 rounded-2xl active:scale-[0.98] transition-transform touch-manipulation"
                >
                  חזור
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={parsedProducts.length === 0}
                  className="flex-1 bg-green-500 text-white font-black py-4 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 touch-manipulation"
                >
                  <Plus size={20} />
                  <span>הוסף ספק</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

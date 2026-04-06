import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Mail, CheckCircle, XCircle, RefreshCw, Download } from 'lucide-react'
import { getGmailAuthUrl, checkGmailForInvoices, isGmailConnected, getGmailTokens, clearGmailTokens } from '../../lib/gmailService'
import { useInvoicesStore } from '../../stores/invoicesStore'
import { useSuppliersStore } from '../../stores/suppliersStore'

export default function GmailSettingsPage() {
  const navigate = useNavigate()
  const { addInvoice } = useInvoicesStore()
  const { suppliers } = useSuppliersStore()
  const [connected, setConnected] = useState(false)
  const [checking, setChecking] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [foundInvoices, setFoundInvoices] = useState(0)

  useEffect(() => {
    setConnected(isGmailConnected())
  }, [])

  const handleConnect = async () => {
    try {
      const authUrl = await getGmailAuthUrl()
      window.location.href = authUrl
    } catch (error) {
      alert('שגיאה בחיבור ל-Gmail')
      console.error(error)
    }
  }

  const handleDisconnect = () => {
    clearGmailTokens()
    setConnected(false)
  }

  const handleCheckInvoices = async () => {
    const tokens = getGmailTokens()
    if (!tokens) {
      alert('נא להתחבר ל-Gmail תחילה')
      return
    }

    setChecking(true)
    setFoundInvoices(0)

    try {
      const invoices = await checkGmailForInvoices(tokens.accessToken)
      
      // Process each invoice email
      for (const email of invoices) {
        // Try to match supplier by email
        const supplier = suppliers.find(s => 
          s.email && email.from.toLowerCase().includes(s.email.toLowerCase())
        )

        if (!supplier) continue

        // Process attachments
        for (const attachment of email.attachments) {
          if (attachment.mimeType === 'application/pdf') {
            // For now, we'll just log it
            // In a real implementation, you'd parse the PDF
            console.log(`Found invoice from ${supplier.name}: ${attachment.filename}`)
            
            // You could add basic invoice entry here
            // This is a placeholder - real implementation would parse PDF
            const now = new Date()
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            
            addInvoice({
              supplierId: supplier.id,
              supplierName: supplier.name,
              branchCode: 'AUTO',
              branchName: 'זוהה אוטומטית',
              month,
              year: now.getFullYear(),
              items: [],
              totalAmount: 0,
              fileName: attachment.filename,
              fileUrl: `data:${attachment.mimeType};base64,${attachment.data}`,
              uploadedBy: 'Gmail Auto',
              notes: `נמשך אוטומטית מ-Gmail. נושא: ${email.subject}`
            })
          }
        }
      }

      setFoundInvoices(invoices.length)
      setLastCheck(new Date())
      alert(`נמצאו ${invoices.length} חשבוניות!`)
    } catch (error) {
      alert('שגיאה בבדיקת מיילים')
      console.error(error)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="bg-secondary rounded-3xl p-5 mb-6 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
            >
              <ChevronRight size={24} />
            </button>
            <div className="flex-1 text-center">
              <h2 className="font-black text-primary text-xl">הגדרות Gmail</h2>
              <p className="text-primary/60 text-xs mt-1">משיכת חשבוניות אוטומטית</p>
            </div>
          </div>
        </header>

        <div className="space-y-4">
          <div className="bg-secondary rounded-3xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Mail className="text-primary" size={32} />
                <div>
                  <h3 className="font-black text-primary text-lg">חיבור Gmail</h3>
                  <p className="text-primary/60 text-sm">
                    {connected ? 'מחובר ופעיל' : 'לא מחובר'}
                  </p>
                </div>
              </div>
              {connected ? (
                <CheckCircle className="text-green-500" size={32} />
              ) : (
                <XCircle className="text-red-500" size={32} />
              )}
            </div>

            {connected ? (
              <div className="space-y-3">
                <button
                  onClick={handleCheckInvoices}
                  disabled={checking}
                  className="w-full bg-primary text-secondary font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {checking ? (
                    <>
                      <RefreshCw className="animate-spin" size={20} />
                      בודק מיילים...
                    </>
                  ) : (
                    <>
                      <Download size={20} />
                      בדוק חשבוניות חדשות
                    </>
                  )}
                </button>

                <button
                  onClick={handleDisconnect}
                  className="w-full bg-red-500 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform"
                >
                  נתק חיבור
                </button>

                {lastCheck && (
                  <p className="text-primary/60 text-sm text-center">
                    בדיקה אחרונה: {lastCheck.toLocaleString('he-IL')}
                    {foundInvoices > 0 && ` • נמצאו ${foundInvoices} חשבוניות`}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="w-full bg-primary text-secondary font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Mail size={20} />
                התחבר ל-Gmail
              </button>
            )}
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl p-6 shadow-lg">
            <h3 className="font-black text-white text-lg mb-3">💡 איך זה עובד?</h3>
            <ul className="space-y-2 text-white/90 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>התחבר לחשבון Gmail שלך</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>המערכת תחפש מיילים עם חשבוניות (PDF) מהספקים</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>החשבוניות יתווספו אוטומטית למערכת</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>תוכל לנתח ולהשוות מחירים מיד</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-3xl p-6 shadow-lg">
            <h3 className="font-black text-white text-lg mb-3">⚠️ חשוב לדעת</h3>
            <ul className="space-y-2 text-white/90 text-sm">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>המערכת מחפשת מיילים מ-30 הימים האחרונים</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>רק מיילים עם קבצי PDF מזוהים כחשבוניות</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>ודא שהגדרת מיילים לספקים בדף "פרטי קשר ספקים"</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>המידע מאובטח ולא נשמר בשרתים חיצוניים</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

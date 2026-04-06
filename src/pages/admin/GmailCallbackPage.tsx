import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { exchangeCodeForTokens, saveGmailTokens } from '../../lib/gmailService'

export default function GmailCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('מתחבר ל-Gmail...')

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        setStatus('error')
        setMessage('החיבור נכשל. נא לנסות שוב.')
        setTimeout(() => navigate('/admin/gmail-settings'), 3000)
        return
      }

      if (!code) {
        setStatus('error')
        setMessage('קוד אימות חסר')
        setTimeout(() => navigate('/admin/gmail-settings'), 3000)
        return
      }

      try {
        const tokens = await exchangeCodeForTokens(code)
        saveGmailTokens(tokens)
        
        setStatus('success')
        setMessage('התחברת בהצלחה ל-Gmail!')
        setTimeout(() => navigate('/admin/gmail-settings'), 2000)
      } catch (error) {
        console.error('Token exchange failed:', error)
        setStatus('error')
        setMessage('שגיאה בקבלת הרשאות. נא לנסות שוב.')
        setTimeout(() => navigate('/admin/gmail-settings'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="bg-secondary rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="mx-auto text-primary animate-spin mb-4" size={64} />
              <h2 className="font-black text-primary text-2xl mb-2">מתחבר...</h2>
              <p className="text-primary/60">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
              <h2 className="font-black text-primary text-2xl mb-2">הצלחה!</h2>
              <p className="text-primary/60">{message}</p>
              <p className="text-primary/40 text-sm mt-4">מעביר לדף ההגדרות...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="mx-auto text-red-500 mb-4" size={64} />
              <h2 className="font-black text-primary text-2xl mb-2">שגיאה</h2>
              <p className="text-primary/60">{message}</p>
              <p className="text-primary/40 text-sm mt-4">חוזר לדף ההגדרות...</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

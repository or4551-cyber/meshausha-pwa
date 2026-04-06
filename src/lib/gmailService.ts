interface GmailTokens {
  accessToken: string
  refreshToken: string
  expiryDate: number
}

interface InvoiceEmail {
  id: string
  from: string
  subject: string
  date: string
  attachments: Array<{
    filename: string
    mimeType: string
    data: string
  }>
}

export const getGmailAuthUrl = async (): Promise<string> => {
  try {
    const response = await fetch('/.netlify/functions/gmail-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    const data = await response.json()
    return data.authUrl
  } catch (error) {
    console.error('Failed to get auth URL:', error)
    throw error
  }
}

export const exchangeCodeForTokens = async (code: string): Promise<GmailTokens> => {
  try {
    const response = await fetch('/.netlify/functions/gmail-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to exchange code')
    }

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiryDate: data.expiryDate
    }
  } catch (error) {
    console.error('Failed to exchange code:', error)
    throw error
  }
}

export const checkGmailForInvoices = async (accessToken: string): Promise<InvoiceEmail[]> => {
  try {
    const response = await fetch('/.netlify/functions/check-gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken })
    })

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to check Gmail')
    }

    return data.invoices
  } catch (error) {
    console.error('Failed to check Gmail:', error)
    throw error
  }
}

export const saveGmailTokens = (tokens: GmailTokens) => {
  localStorage.setItem('gmail_tokens', JSON.stringify(tokens))
}

export const getGmailTokens = (): GmailTokens | null => {
  const stored = localStorage.getItem('gmail_tokens')
  if (!stored) return null
  
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export const clearGmailTokens = () => {
  localStorage.removeItem('gmail_tokens')
}

export const isGmailConnected = (): boolean => {
  const tokens = getGmailTokens()
  if (!tokens) return false
  
  // Check if token is expired
  return tokens.expiryDate > Date.now()
}

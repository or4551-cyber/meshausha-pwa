import { Handler } from '@netlify/functions'
import { google } from 'googleapis'
import { getStore } from '@netlify/blobs'

const REDIRECT_URI = process.env.URL
  ? `${process.env.URL}/admin/gmail-callback`
  : 'http://localhost:5173/admin/gmail-callback'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
)

function openStore(name: string) {
  const siteID = process.env.SITE_ID
  const token = process.env.NETLIFY_TOKEN
  if (siteID && token) return getStore({ name, siteID, token })
  return getStore(name)
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { code } = JSON.parse(event.body || '{}')

    if (!code) {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/calendar',
        ],
        prompt: 'consent'
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ authUrl })
      }
    }

    const { tokens } = await oauth2Client.getToken(code)

    if (tokens.refresh_token) {
      try {
        const store = openStore('gmail-tokens')
        await store.set('admin-refresh-token', JSON.stringify({
          refreshToken: tokens.refresh_token,
          savedAt: new Date().toISOString()
        }))
      } catch (blobError) {
        console.warn('Could not save refresh token to Blobs:', blobError)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date
      })
    }
  } catch (error: any) {
    console.error('Gmail auth error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Authentication failed',
        message: error.message
      })
    }
  }
}

import { Handler } from '@netlify/functions'
import { google } from 'googleapis'

const gmail = google.gmail('v1')

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

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { accessToken } = JSON.parse(event.body || '{}')

    if (!accessToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Access token required' })
      }
    }

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )

    oauth2Client.setCredentials({ access_token: accessToken })

    // Search for emails with invoices
    const query = 'subject:(חשבונית OR invoice OR חשבון) has:attachment newer_than:30d'
    
    const response = await gmail.users.messages.list({
      auth: oauth2Client,
      userId: 'me',
      q: query,
      maxResults: 50
    })

    const messages = response.data.messages || []
    const invoiceEmails: InvoiceEmail[] = []

    // Get details for each message
    for (const message of messages) {
      try {
        const details = await gmail.users.messages.get({
          auth: oauth2Client,
          userId: 'me',
          id: message.id!,
          format: 'full'
        })

        const headers = details.data.payload?.headers || []
        const from = headers.find(h => h.name === 'From')?.value || ''
        const subject = headers.find(h => h.name === 'Subject')?.value || ''
        const date = headers.find(h => h.name === 'Date')?.value || ''

        // Extract attachments
        const attachments: Array<{ filename: string; mimeType: string; data: string }> = []
        const parts = details.data.payload?.parts || []

        for (const part of parts) {
          if (part.filename && part.body?.attachmentId) {
            const attachment = await gmail.users.messages.attachments.get({
              auth: oauth2Client,
              userId: 'me',
              messageId: message.id!,
              id: part.body.attachmentId
            })

            if (attachment.data.data) {
              attachments.push({
                filename: part.filename,
                mimeType: part.mimeType || 'application/octet-stream',
                data: attachment.data.data
              })
            }
          }
        }

        if (attachments.length > 0) {
          invoiceEmails.push({
            id: message.id!,
            from,
            subject,
            date,
            attachments
          })
        }
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        count: invoiceEmails.length,
        invoices: invoiceEmails
      })
    }
  } catch (error: any) {
    console.error('Gmail API error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch emails',
        message: error.message
      })
    }
  }
}

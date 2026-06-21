import { Handler } from '@netlify/functions'
import { verifyExportToken } from './_priceCatalogAuth'
import { createBlobPriceCatalogRepository } from './_priceCatalogStore'
import { buildCatalogWorkbook } from './_priceCatalogExcel'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'method_not_allowed' }) }
  }

  try {
    const token = event.queryStringParameters?.token ?? ''
    const verified = verifyExportToken(token, Date.now(), { PRICE_SESSION_SECRET: process.env.PRICE_SESSION_SECRET })
    // טוקן פג/לא תקף — 410 (לא חושפים אם זה חתימה שגויה או פג תוקף).
    if (!verified) return { statusCode: 410, body: JSON.stringify({ error: 'expired' }) }

    const repo = createBlobPriceCatalogRepository()
    const snapshot = await repo.getVersion(verified.version)
    if (!snapshot) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) }

    const buffer = buildCatalogWorkbook(snapshot)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="meshausha-price-catalog-v${verified.version}.xlsx"`,
        'Cache-Control': 'no-store',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    }
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: 'internal_error' }) }
  }
}

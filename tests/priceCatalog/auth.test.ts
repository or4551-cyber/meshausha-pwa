import { describe, expect, it } from 'vitest'
import {
  authorizePriceRequest,
  issueAdminSession,
  verifyAdminSession,
} from '../../netlify/functions/_priceCatalogAuth'

const env = {
  API_TOKEN: 'app-read',
  PRICE_GPT_TOKEN: 'gpt-secret',
  PRICE_SESSION_SECRET: 'session-secret-at-least-32-characters',
}

describe('price catalog auth', () => {
  it('allows app token to read but not write', () => {
    const event = { headers: { authorization: 'Bearer app-read' }, queryStringParameters: null }
    expect(authorizePriceRequest(event, 'read', env, 1)).toEqual({ role: 'app' })
    expect(authorizePriceRequest(event, 'write', env, 1)).toBeNull()
  })

  it('allows the GPT token to read and write', () => {
    const event = { headers: { authorization: 'Bearer gpt-secret' }, queryStringParameters: null }
    expect(authorizePriceRequest(event, 'write', env, 1)).toEqual({ role: 'gpt' })
  })

  it('issues an expiring signed admin session', () => {
    const token = issueAdminSession(1_000, env)
    expect(verifyAdminSession(token, 1_001, env)?.role).toBe('admin')
    expect(verifyAdminSession(token, 1_000 + 8 * 60 * 60 * 1000 + 1, env)).toBeNull()
  })

  it('fails closed when required write secrets are missing', () => {
    const event = { headers: {}, queryStringParameters: null }
    expect(authorizePriceRequest(event, 'write', {}, 1)).toBeNull()
  })
})

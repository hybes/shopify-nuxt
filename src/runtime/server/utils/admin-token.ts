interface TokenState {
  accessToken: string
  expiresAt: number
}

let cachedToken: TokenState | null = null
let refreshPromise: Promise<TokenState> | null = null

const TOKEN_BUFFER_MS = 60 * 1000

async function fetchToken(storeDomain: string, clientId: string, clientSecret: string): Promise<TokenState> {
  const url = `${storeDomain}/admin/oauth/access_token`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to fetch Shopify admin access token: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`)
  }

  const data = await response.json() as { access_token: string, expires_in: number }

  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  }
}

export async function getAccessToken(storeDomain: string, clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - TOKEN_BUFFER_MS > Date.now()) {
    return cachedToken.accessToken
  }

  if (refreshPromise) {
    const token = await refreshPromise
    return token.accessToken
  }

  refreshPromise = fetchToken(storeDomain, clientId, clientSecret)
    .then((token) => {
      cachedToken = token
      refreshPromise = null
      return token
    })
    .catch((err) => {
      refreshPromise = null
      throw err
    })

  const token = await refreshPromise
  return token.accessToken
}

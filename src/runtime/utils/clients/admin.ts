import type {
  ShopifyApiClientConfig,
  ShopifyConfig,
} from '../../../module'

import {
  createApiUrl,
  createStoreDomain,
} from '../client'

export interface AdminAuthMeta {
  clientId: string
  clientSecret: string
  storeDomain: string
}

export type AdminConfigResult = ShopifyApiClientConfig & {
  _auth?: AdminAuthMeta
}

export const createAdminConfig = (config?: Partial<ShopifyConfig>): AdminConfigResult => {
  if (!config?.name || !config.clients?.admin) {
    throw new Error('Could not create admin client')
  }

  const {
    name,
    logger,

    clients: {
      admin,
    },
  } = config

  const storeDomain = createStoreDomain(name)

  if (!admin.accessToken && !(admin.clientId && admin.clientSecret)) {
    throw new Error('Could not create admin client: missing authentication credentials')
  }

  const baseConfig: ShopifyApiClientConfig = {
    storeDomain,
    apiUrl: createApiUrl(storeDomain, admin.apiVersion, 'admin'),
    apiVersion: admin.apiVersion,
    logger,
    headers: {
      ...admin.headers,
    },
  }

  if (admin.accessToken) {
    return {
      ...baseConfig,
      headers: {
        'X-Shopify-Access-Token': admin.accessToken,
        ...admin.headers,
      },
    }
  }

  return {
    ...baseConfig,
    _auth: {
      clientId: admin.clientId!,
      clientSecret: admin.clientSecret!,
      storeDomain,
    },
  }
}

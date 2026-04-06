import type { AdminApiClient, AdminOperations } from '@nuxtjs/shopify/admin'

import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import { createClient } from '../../utils/client'
import { createAdminConfig } from '../../utils/clients/admin'
import type { AdminAuthMeta } from '../../utils/clients/admin'
import { getAccessToken } from './admin-token'
import useErrors from '../../utils/errors'

function injectTokenHeader<T extends Record<string, unknown> | undefined>(
  options: T,
  token: string,
): T {
  return {
    ...options,
    headers: {
      'X-Shopify-Access-Token': token,
      ...((options as Record<string, unknown>)?.headers as Record<string, string> ?? {}),
    },
  } as T
}

export function useAdmin(): AdminApiClient {
  const { _shopify } = useRuntimeConfig()

  const config = createAdminConfig(_shopify)

  const nitroApp = useNitroApp()

  nitroApp.hooks.callHook('admin:client:configure', { config })

  const authMeta: AdminAuthMeta | undefined = (config as { _auth?: AdminAuthMeta })._auth

  const originalClient = createClient<AdminOperations>(config)

  const request: AdminApiClient['request'] = async (operation, options) => {
    if (authMeta) {
      const token = await getAccessToken(authMeta.storeDomain, authMeta.clientId, authMeta.clientSecret)
      options = injectTokenHeader(options, token)
    }

    nitroApp.hooks.callHook('admin:client:request', { operation, options })

    const response = await originalClient.request(operation, options)

    if (response.errors) useErrors(nitroApp.hooks, 'admin:client:errors', response.errors, _shopify?.errors?.throw ?? false)

    nitroApp.hooks.callHook('admin:client:response', { response, operation, options })

    return response
  }

  const fetch: AdminApiClient['fetch'] = async (operation, options) => {
    if (authMeta) {
      const token = await getAccessToken(authMeta.storeDomain, authMeta.clientId, authMeta.clientSecret)
      options = injectTokenHeader(options, token)
    }

    return originalClient.fetch(operation, options)
  }

  const requestStream: AdminApiClient['requestStream'] = async (operation, options) => {
    if (authMeta) {
      const token = await getAccessToken(authMeta.storeDomain, authMeta.clientId, authMeta.clientSecret)
      options = injectTokenHeader(options, token)
    }

    return originalClient.requestStream(operation, options)
  }

  const client = { ...originalClient, request, fetch, requestStream } satisfies AdminApiClient

  nitroApp.hooks.callHook('admin:client:create', { client })

  return client
}

import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { resolveMock, MockError } from '@/mock'
import type { MockContext } from '@/mock/helper'
import { findUserByToken } from '@/mock/db'
import { getToken, clearSession } from '@/utils/session'
import type { ApiResult } from '@/types'

const request = axios.create({ baseURL: '/api', timeout: 15000 })

/**
 * Mock 适配器：把请求分发到注册的 mock handler，模拟网络延迟与响应包。
 * 无后端依赖，改动内存数据即产生"真实"交互效果。
 */
request.defaults.adapter = async (config) => {
  const method = (config.method || 'get').toLowerCase()
  const url = (config.url || '').replace(/^\/api/, '')
  const matched = resolveMock(method, url)

  const token = String(config.headers?.Authorization || '').replace(/^Bearer\s+/i, '')
  const user = token ? findUserByToken(token) : undefined

  const ctx: MockContext = {
    params: matched?.params ?? {},
    query: (config.params as Record<string, unknown>) ?? {},
    body: parseBody(config.data),
    headers: (config.headers as Record<string, string>) ?? {},
    user,
  }

  await delay()

  if (!matched) {
    return response(config, {
      code: 404,
      data: null,
      message: `Mock 接口未注册: ${method.toUpperCase()} /api${url}`,
    })
  }

  try {
    const data = await matched.handler(ctx)
    return response(config, { code: 0, data, message: 'ok' })
  } catch (err) {
    const e = err as { code?: number; message?: string }
    if (err instanceof MockError && e.code === 401) {
      clearSession()
    }
    return response(config, { code: e?.code ?? 1, data: null, message: e?.message ?? '请求失败' })
  }
}

function response(config: InternalAxiosRequestConfig, payload: ApiResult): AxiosResponse {
  return { data: payload, status: 200, statusText: 'OK', headers: {}, config }
}

function parseBody(data: unknown): unknown {
  if (!data) return {}
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return {}
    }
  }
  return data
}

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 350))
}

// 请求拦截：附加 token
request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 响应拦截：解包 { code, data, message }，直接返回 data；错误把 code 挂到 Error 上，
// 供上层按业务码映射为 i18n 文案（如登录错误 1001/1002/1010）
request.interceptors.response.use(
  (res) => {
    const body = res.data as ApiResult
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data as never
      const err = new Error(body.message || '请求失败') as Error & { code?: number }
      err.code = body.code
      return Promise.reject(err)
    }
    return body as never
  },
  (err) => Promise.reject(err),
)

export default request

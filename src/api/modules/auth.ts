import request from '../request'
import type { LoginResult, UserInfo } from '@/types'

export function loginApi(data: { account: string; password: string }) {
  return request.post<unknown, LoginResult>('/auth/login', data)
}

export function getMeApi() {
  return request.get<unknown, UserInfo>('/auth/me')
}

export function logoutApi() {
  return request.post<unknown, { ok: boolean }>('/auth/logout')
}

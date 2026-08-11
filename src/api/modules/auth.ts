import request from '../request'
import type { LoginResult, Role, UserInfo, VerifyScene } from '@/types'

/** 密码登录；role 用于 mock 校验账号是否属于当前端入口 */
export function loginApi(data: { account: string; password: string; role?: Role }) {
  return request.post<unknown, LoginResult>('/auth/login', data)
}

export function getMeApi() {
  return request.get<unknown, UserInfo>('/auth/me')
}

export function logoutApi() {
  return request.post<unknown, { ok: boolean }>('/auth/logout')
}

/** 发送验证码（登录 / 注册 / 找回密码）；mock 返回验证码便于演示 */
export function sendCodeApi(data: { account: string; scene: VerifyScene }) {
  return request.post<unknown, { code: string; expireSeconds: number }>('/auth/send-code', data)
}

/** 验证码登录 */
export function loginByCodeApi(data: { account: string; code: string; role?: Role }) {
  return request.post<unknown, LoginResult>('/auth/login-code', data)
}

/** 账号注册：手机号/邮箱 + 验证码 + 密码；role 决定创建的角色（默认宠物主） */
export function registerApi(data: { account: string; password: string; code: string; role?: Role }) {
  return request.post<unknown, { id: string; name: string }>('/auth/register', data)
}

/** 找回密码：验证码重置密码 */
export function resetPasswordApi(data: { account: string; newPassword: string; code: string }) {
  return request.post<unknown, { ok: boolean }>('/auth/reset-password', data)
}

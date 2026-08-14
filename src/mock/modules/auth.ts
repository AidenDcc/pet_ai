import { defineMock, MockError, requireUser } from '../helper'
import { users, issueToken, publicUser, registerUser } from '../db'
import type { ContactType, Role, VerifyScene } from '@/types'

/** 校验账号是否属于当前登录入口（三端分离开放后启用） */
function assertRole(user: { role: Role }, role?: Role): void {
  if (role && user.role !== role) {
    throw new MockError('该账号不属于当前端登录入口', 1010)
  }
}

/** 验证码（内存存储：手机号/邮箱 -> { code, expireAt }），仅 mock 环境 */
interface CodeEntry {
  code: string
  expireAt: number
}
const codeStore = new Map<string, CodeEntry>()
const CODE_TTL = 5 * 60 * 1000

/** 通过 账号/手机号/邮箱 定位用户（忽略大小写与首尾空白） */
function findUserByContact(contact: string) {
  const c = contact.trim().toLowerCase()
  return users.find(
    (u) =>
      u.account.toLowerCase() === c ||
      u.phone === c ||
      (u.email ?? '').toLowerCase() === c,
  )
}

function issueCode(contact: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  codeStore.set(contact, { code, expireAt: Date.now() + CODE_TTL })
  return code
}

function verifyCode(contact: string, code: string): boolean {
  const entry = codeStore.get(contact)
  if (!entry) return false
  if (entry.code !== code || entry.expireAt <= Date.now()) {
    codeStore.delete(contact)
    return false
  }
  return true
}

/** 校验手机号 / 邮箱格式 */
function validateContact(contact: string, type: ContactType): void {
  const v = contact.trim()
  if (type === 'phone') {
    if (!/^[1-9]\d{6,14}$/.test(v)) throw new MockError('手机号格式不正确', 1008)
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    throw new MockError('邮箱格式不正确', 1009)
  }
}

defineMock([
  {
    method: 'post',
    path: '/auth/login',
    handler: ({ body }) => {
      const { account, password, role } = (body ?? {}) as {
        account?: string
        password?: string
        role?: Role
      }
      const user = account ? findUserByContact(account) : undefined
      if (!user || user.password !== password) {
        throw new MockError('账号或密码错误，请使用演示账号登录', 1001)
      }
      assertRole(user, role)
      if (user.status === 'disabled') throw new MockError('账号已被禁用', 1002)
      const token = issueToken(user)
      return { token, user: { ...publicUser(user), account: user.account } }
    },
  },
  {
    method: 'get',
    path: '/auth/me',
    handler: (ctx) => {
      const user = requireUser(ctx)
      return { ...publicUser(user), account: user.account }
    },
  },
  {
    method: 'post',
    path: '/auth/logout',
    handler: () => ({ ok: true }),
  },
  {
    // 发送验证码（登录 / 注册 / 找回密码）
    method: 'post',
    path: '/auth/send-code',
    handler: ({ body }) => {
      const { account, scene } = (body ?? {}) as { account?: string; scene?: VerifyScene }
      const contact = (account ?? '').trim()
      if (!contact) throw new MockError('请输入手机号或邮箱', 1003)
      const type: ContactType = contact.includes('@') ? 'email' : 'phone'
      validateContact(contact, type)
      const user = findUserByContact(contact)
      if (scene === 'register' && user) throw new MockError('该手机号或邮箱已注册', 1004)
      if (scene === 'reset' && !user) throw new MockError('该账号不存在，请先注册', 1005)
      // mock 直接返回验证码，便于演示与联调
      const code = issueCode(contact)
      return { code, expireSeconds: CODE_TTL / 1000 }
    },
  },
  {
    // 验证码登录
    method: 'post',
    path: '/auth/login-code',
    handler: ({ body }) => {
      const { account, code, role } = (body ?? {}) as {
        account?: string
        code?: string
        role?: Role
      }
      const contact = (account ?? '').trim()
      if (!contact) throw new MockError('请输入手机号或邮箱', 1003)
      const user = findUserByContact(contact)
      if (!user) throw new MockError('该账号不存在，请先注册', 1005)
      assertRole(user, role)
      if (!verifyCode(contact, code ?? '')) throw new MockError('验证码错误或已过期', 1007)
      if (user.status === 'disabled') throw new MockError('账号已被禁用', 1002)
      codeStore.delete(contact)
      const token = issueToken(user)
      return { token, user: { ...publicUser(user), account: user.account } }
    },
  },
  {
    // 账号注册（手机号 / 邮箱 二选一 + 验证码 + 密码）
    method: 'post',
    path: '/auth/register',
    handler: ({ body }) => {
      const { account, password, code, role } = (body ?? {}) as {
        account?: string
        password?: string
        code?: string
        role?: Role
      }
      const contact = (account ?? '').trim()
      if (!contact) throw new MockError('请输入手机号或邮箱', 1003)
      if (!password || password.length < 6) throw new MockError('密码长度至少 6 位', 1006)
      const type: ContactType = contact.includes('@') ? 'email' : 'phone'
      validateContact(contact, type)
      if (findUserByContact(contact)) throw new MockError('该手机号或邮箱已注册', 1004)
      if (!verifyCode(contact, code ?? '')) throw new MockError('验证码错误或已过期', 1007)
      codeStore.delete(contact)
      const user = registerUser({
        account: contact,
        phone: type === 'phone' ? contact : '',
        email: type === 'email' ? contact : '',
        password,
        role,
      })
      return { id: user.id, name: user.name }
    },
  },
  {
    // 找回密码：验证码重置密码
    method: 'post',
    path: '/auth/reset-password',
    handler: ({ body }) => {
      const { account, newPassword, code } = (body ?? {}) as {
        account?: string
        newPassword?: string
        code?: string
      }
      const contact = (account ?? '').trim()
      if (!contact) throw new MockError('请输入手机号或邮箱', 1003)
      if (!newPassword || newPassword.length < 6) throw new MockError('密码长度至少 6 位', 1006)
      const user = findUserByContact(contact)
      if (!user) throw new MockError('该账号不存在，请先注册', 1005)
      if (!verifyCode(contact, code ?? '')) throw new MockError('验证码错误或已过期', 1007)
      user.password = newPassword
      codeStore.delete(contact)
      return { ok: true }
    },
  },
  {
    // 修改密码（登录后）
    method: 'post',
    path: '/auth/change-password',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const { oldPassword, newPassword } = (ctx.body ?? {}) as {
        oldPassword?: string
        newPassword?: string
      }
      if (user.password !== oldPassword) throw new MockError('原密码错误', 1040)
      if (!newPassword || !/^(?=.*[A-Za-z])(?=.*\d)[\S]{6,20}$/.test(newPassword)) {
        throw new MockError('新密码需包含字母和数字，且长度为 6~20 位', 1041)
      }
      user.password = newPassword
      return { ok: true }
    },
  },
])

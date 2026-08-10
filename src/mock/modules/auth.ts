import { defineMock, MockError, requireUser } from '../helper'
import { users, issueToken, publicUser } from '../db'

defineMock([
  {
    method: 'post',
    path: '/auth/login',
    handler: ({ body }) => {
      const { account, password } = (body ?? {}) as { account?: string; password?: string }
      const user = users.find((u) => u.account === account || u.phone === account)
      if (!user || user.password !== password) {
        throw new MockError('账号或密码错误，请使用演示账号登录', 1001)
      }
      if (user.status === 'disabled') throw new MockError('账号已被禁用', 1002)
      const token = issueToken(user)
      return { token, user: publicUser(user) }
    },
  },
  {
    method: 'get',
    path: '/auth/me',
    handler: (ctx) => publicUser(requireUser(ctx)),
  },
  {
    method: 'post',
    path: '/auth/logout',
    handler: () => ({ ok: true }),
  },
])

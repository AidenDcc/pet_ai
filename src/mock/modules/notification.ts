import { defineMock, requireUser } from '../helper'
import type { DbUser } from '../db'

/**
 * 模拟消息中心：内存态未读数，session 内生效。
 * 与既有 mock 一致——无真实消息模型，先按「新用户 3 条未读」模拟。
 */
const unreadMap = new Map<string, number>()
const INITIAL_UNREAD = 3

function ensureUnread(user: DbUser): number {
  if (!unreadMap.has(user.id)) unreadMap.set(user.id, INITIAL_UNREAD)
  return unreadMap.get(user.id) as number
}

defineMock([
  // 未读消息数
  {
    method: 'get',
    path: '/notification/unread',
    handler: (ctx) => {
      const user = requireUser(ctx)
      return { count: ensureUnread(user) }
    },
  },
  // 全部标记为已读
  {
    method: 'post',
    path: '/notification/read-all',
    handler: (ctx) => {
      const user = requireUser(ctx)
      unreadMap.set(user.id, 0)
      return { count: 0 }
    },
  },
])

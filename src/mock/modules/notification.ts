import { defineMock, requireUser, MockError } from '../helper'
import {
  messagesOf,
  findMessageById,
  unreadByCategory,
  markMessageRead,
  markAllMessagesRead,
  markMessagesRead,
  removeMessages,
} from '../db'
import type { MessageItem } from '@/types'

/**
 * 消息中心：基于 db.ts 中的真实消息模型，按当前登录用户返回。
 * 未读数 / 列表 / 详情 / 全部已读 均实时联动内存数据。
 */
defineMock([
  // 未读消息数（含各分类）
  {
    method: 'get',
    path: '/notification/unread',
    handler: (ctx) => {
      const user = requireUser(ctx)
      return unreadByCategory(user.id)
    },
  },
  // 消息列表（按分类）
  {
    method: 'get',
    path: '/notification/list',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const category = (ctx.query.category as MessageItem['category']) || undefined
      return messagesOf(user.id, category)
    },
  },
  // 全部标记为已读
  {
    method: 'post',
    path: '/notification/read-all',
    handler: (ctx) => {
      const user = requireUser(ctx)
      markAllMessagesRead(user.id)
      return { total: 0 }
    },
  },
  // 批量标记为已读
  {
    method: 'post',
    path: '/notification/batch-read',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const { ids = [] } = (ctx.body ?? {}) as { ids?: string[] }
      const valid = ids.filter((id) => {
        const m = findMessageById(id)
        return m && m.userId === user.id
      })
      markMessagesRead(valid)
      return { total: valid.length }
    },
  },
  // 批量删除
  {
    method: 'post',
    path: '/notification/batch-delete',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const { ids = [] } = (ctx.body ?? {}) as { ids?: string[] }
      const valid = ids.filter((id) => {
        const m = findMessageById(id)
        return m && m.userId === user.id
      })
      removeMessages(valid)
      return { total: valid.length }
    },
  },
  // 消息详情（读取即置已读）
  {
    method: 'get',
    path: '/notification/:id',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const msg = findMessageById(ctx.params.id)
      if (!msg || msg.userId !== user.id) throw new MockError('消息不存在', 404)
      markMessageRead(msg.id)
      return msg
    },
  },
])

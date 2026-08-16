import request from '../request'
import type { MessageCategory, MessageItem, MessageUnread } from '@/types'

export function getUnreadCountApi() {
  return request.get<unknown, MessageUnread>('/notification/unread')
}

/** 消息列表（按分类，返回该分类全部消息，时间倒序） */
export function getMessageListApi(category: MessageCategory) {
  return request.get<unknown, MessageItem[]>('/notification/list', { params: { category } })
}

/** 消息详情（读取即置已读） */
export function getMessageDetailApi(id: string) {
  return request.get<unknown, MessageItem>(`/notification/${id}`)
}

export function readAllNotificationsApi() {
  return request.post<unknown, { total: number }>('/notification/read-all')
}

/** 批量标记已读 */
export function batchReadNotificationsApi(ids: string[]) {
  return request.post<unknown, { total: number }>('/notification/batch-read', { ids })
}

/** 批量删除 */
export function batchDeleteNotificationsApi(ids: string[]) {
  return request.post<unknown, { total: number }>('/notification/batch-delete', { ids })
}

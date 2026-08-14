import request from '../request'

export function getUnreadCountApi() {
  return request.get<unknown, { count: number }>('/notification/unread')
}

export function readAllNotificationsApi() {
  return request.post<unknown, { count: number }>('/notification/read-all')
}

import request from '../request'
import type { OrderItem, SubscriptionPlan, UserInfo, OrderStatus } from '@/types'

export function getPlansApi() {
  return request.get<unknown, SubscriptionPlan[]>('/subscription/plans')
}

export function getMySubscriptionApi() {
  return request.get<unknown, { plan: SubscriptionPlan | null; expireAt: string | null; recentOrders: OrderItem[] }>(
    '/subscription/mine',
  )
}

export function getMyOrdersApi(status: OrderStatus | 'all' = 'all') {
  return request.get<unknown, OrderItem[]>('/order/list', { params: { status } })
}

export function createOrderApi(data: { planId: string; petId?: string }) {
  return request.post<unknown, { order: OrderItem; user: UserInfo }>('/order/create', data)
}

export function payOrderApi(id: string) {
  return request.post<unknown, OrderItem>(`/order/${id}/pay`)
}

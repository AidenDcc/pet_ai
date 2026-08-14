import request from '../request'
import type { AccountProfile, OrderItem, PageQuery, PageResult, SubscriptionPlan, UserInfo, VetInfo } from '@/types'

export interface OverviewData {
  stats: {
    totalDevices: number
    activeDevices: number
    totalUsers: number
    onlinePets: number
    pendingVets: number
    monthlyRevenue: number
    totalRevenue: number
  }
  activationTrend: { labels: string[]; values: number[] }
  revenueTrend: { labels: string[]; values: number[] }
  userGrowth: { labels: string[]; values: number[] }
  planDistribution: { name: string; value: number }[]
  deviceStatus: { name: string; value: number }[]
}

export interface AdminUserRow extends UserInfo {
  petCount: number
  deviceCount: number
}

export interface AdminDeviceRow {
  id: string
  sn: string
  imei: string
  name: string
  model: string
  status: string
  battery: number
  firmware: string
  boundPetId: string | null
  ownerId: string | null
  activatedAt: string | null
  petName: string | null
  ownerName: string | null
}

export interface AdminPlanRow extends SubscriptionPlan {
  subscriberCount: number
}

export function getAdminOverviewApi() {
  return request.get<unknown, OverviewData>('/admin/overview')
}

export function getAdminUsersApi(params: Partial<PageQuery>) {
  return request.get<unknown, PageResult<AdminUserRow>>('/admin/users', { params })
}

export function getAdminDevicesApi(params: Partial<PageQuery>) {
  return request.get<unknown, PageResult<AdminDeviceRow>>('/admin/devices', { params })
}

export function getAdminVetsApi(params: Partial<PageQuery>) {
  return request.get<unknown, PageResult<VetInfo>>('/admin/vets', { params })
}

export function reviewVetApi(id: string, action: 'approve' | 'reject') {
  return request.post<unknown, VetInfo>(`/admin/vet/${id}/review`, { action })
}

export function getAdminOrdersApi(params: Partial<PageQuery>) {
  return request.get<unknown, PageResult<OrderItem>>('/admin/orders', { params })
}

export function getAdminPlansApi() {
  return request.get<unknown, AdminPlanRow[]>('/admin/plans')
}

export function updatePlanApi(id: string, patch: Partial<SubscriptionPlan>) {
  return request.put<unknown, SubscriptionPlan>(`/admin/plan/${id}`, patch)
}

/** 更新当前平台运营账号（可编辑：昵称 / 头像） */
export function updateAdminProfileApi(data: { name?: string; avatar?: string }) {
  return request.put<unknown, AccountProfile>('/admin/profile', data)
}

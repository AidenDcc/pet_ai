import { defineMock, MockError, paginate, filterByKeyword, requireRole } from '../helper'
import { users, pets, devices, vets, orders, plans, findUserById, publicUser } from '../db'
import type { SubscriptionPlan, UserInfo } from '@/types'

function joinDeviceAdmin(device: (typeof devices)[number]) {
  const pet = pets.find((p) => p.id === device.boundPetId)
  const owner = device.ownerId ? findUserById(device.ownerId) : null
  return {
    ...device,
    petName: pet?.name ?? null,
    ownerName: owner?.name ?? null,
  }
}

defineMock([
  // 运营数据看板
  {
    method: 'get',
    path: '/admin/overview',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const owners = users.filter((u) => u.role === 'user')
      const paidOrders = orders.filter((o) => o.status === 'paid')
      const monthAgo = Date.now() - 30 * 86400000
      const revenue = paidOrders.filter((o) => (o.paidAt ?? 0) >= monthAgo).reduce((s, o) => s + o.amount, 0)
      const onlinePets = pets.filter((p) => p.deviceId && devices.find((d) => d.id === p.deviceId)?.status === 'online')
      const trend = (base: number) =>
        Array.from({ length: 7 }, (_, i) => base + ((i * 7 + 3) % 11) + (i > 4 ? 3 : 0))
      const planDist = plans.map((p) => ({
        name: p.name,
        value: orders.filter((o) => o.planId === p.id && o.status === 'paid').length,
      }))
      return {
        stats: {
          totalDevices: devices.length,
          activeDevices: devices.filter((d) => d.status === 'online').length,
          totalUsers: owners.length,
          onlinePets: onlinePets.length,
          pendingVets: vets.filter((v) => v.certStatus === 'pending').length,
          monthlyRevenue: revenue,
          totalRevenue: paidOrders.reduce((s, o) => s + o.amount, 0),
        },
        activationTrend: {
          labels: trend(10).map((_, i) => `${7 - i}天前`),
          values: trend(12),
        },
        revenueTrend: {
          labels: trend(8).map((_, i) => `${7 - i}天前`),
          values: trend(24).map((n) => n * 120),
        },
        userGrowth: {
          labels: trend(8).map((_, i) => `${7 - i}天前`),
          values: trend(15),
        },
        planDistribution: planDist,
        deviceStatus: [
          { name: '在线', value: devices.filter((d) => d.status === 'online').length },
          { name: '离线', value: devices.filter((d) => d.status === 'offline').length },
          { name: '低电量', value: devices.filter((d) => d.status === 'low-power').length },
          { name: '未激活', value: devices.filter((d) => d.status === 'unbound').length },
        ],
      }
    },
  },
  // 用户分页
  {
    method: 'get',
    path: '/admin/users',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const { page = 1, pageSize = 10, keyword = '', status = 'all' } = ctx.query as {
        page?: number
        pageSize?: number
        keyword?: string
        status?: string
      }
      let list = users.filter((u) => u.role === 'user')
      if (status !== 'all') list = list.filter((u) => u.status === status)
      list = filterByKeyword(list, String(keyword), ['name', 'phone', 'id'])
      const joined = list.map((u) => {
        const { password: _pw, account: _ac, ...info } = u
        void _pw
        void _ac
        const userInfo = info as UserInfo
        return {
          ...userInfo,
          petCount: pets.filter((p) => p.ownerId === u.id).length,
          deviceCount: devices.filter((d) => d.ownerId === u.id).length,
        }
      })
      return paginate(joined, Number(page), Number(pageSize))
    },
  },
  // 设备分页
  {
    method: 'get',
    path: '/admin/devices',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const { page = 1, pageSize = 10, keyword = '', status = 'all' } = ctx.query as {
        page?: number
        pageSize?: number
        keyword?: string
        status?: string
      }
      let list = [...devices]
      if (status !== 'all') list = list.filter((d) => d.status === status)
      list = filterByKeyword(list, String(keyword), ['sn', 'imei', 'id', 'firmware'])
      const joined = list.map(joinDeviceAdmin)
      return paginate(joined, Number(page), Number(pageSize))
    },
  },
  // 医生管理分页
  {
    method: 'get',
    path: '/admin/vets',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const { page = 1, pageSize = 10, status = 'all' } = ctx.query as {
        page?: number
        pageSize?: number
        status?: string
      }
      let list = [...vets]
      if (status !== 'all') list = list.filter((v) => v.certStatus === status)
      return paginate(list, Number(page), Number(pageSize))
    },
  },
  // 医生认证审核
  {
    method: 'post',
    path: '/admin/vet/:id/review',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const { action } = (ctx.body ?? {}) as { action?: 'approve' | 'reject' }
      const vet = vets.find((v) => v.id === ctx.params.id)
      if (!vet) throw new MockError('医生不存在', 404)
      if (action === 'reject') vet.certStatus = 'rejected'
      else vet.certStatus = 'approved'
      return vet
    },
  },
  // 套餐管理
  {
    method: 'get',
    path: '/admin/plans',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      return plans.map((p) => ({
        ...p,
        subscriberCount: orders.filter((o) => o.planId === p.id && o.status === 'paid').length,
      }))
    },
  },
  // 更新套餐
  {
    method: 'put',
    path: '/admin/plan/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const plan = plans.find((p) => p.id === ctx.params.id)
      if (!plan) throw new MockError('套餐不存在', 404)
      const patch = (ctx.body ?? {}) as Partial<SubscriptionPlan>
      Object.assign(plan, patch)
      return plan
    },
  },
  // 更新当前运营账号（仅昵称 / 头像可编辑，其余忽略）
  {
    method: 'put',
    path: '/admin/profile',
    handler: (ctx) => {
      const user = requireRole(ctx, 'admin')
      const patch = (ctx.body ?? {}) as Record<string, unknown>
      const next: Partial<UserInfo> = {}
      for (const key of ['name', 'avatar'] as const) {
        const v = patch[key]
        if (typeof v === 'string' && v.trim()) (next as Record<string, unknown>)[key] = v
      }
      Object.assign(user, next)
      return { ...publicUser(user), account: user.account }
    },
  },
])

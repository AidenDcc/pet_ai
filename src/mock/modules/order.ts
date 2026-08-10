import { defineMock, MockError, requireUser } from '../helper'
import { plans, orders, findPetById, publicUser } from '../db'
import type { OrderItem } from '@/types'

const payMethods = ['微信支付', '支付宝']

defineMock([
  // 订阅套餐
  {
    method: 'get',
    path: '/subscription/plans',
    handler: () => plans,
  },
  // 我的当前订阅
  {
    method: 'get',
    path: '/subscription/mine',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const plan = plans.find((p) => p.id === user.planId)
      return {
        plan: plan ?? null,
        expireAt: user.planExpireAt,
        recentOrders: orders
          .filter((o) => o.userId === user.id)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 5),
      }
    },
  },
  // 我的订单
  {
    method: 'get',
    path: '/order/list',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const status = (ctx.query.status as string) || 'all'
      let list = orders.filter((o) => o.userId === user.id)
      if (status !== 'all') list = list.filter((o) => o.status === status)
      return list.sort((a, b) => b.createdAt - a.createdAt)
    },
  },
  // 创建订单并模拟支付成功
  {
    method: 'post',
    path: '/order/create',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const { planId, petId } = (ctx.body ?? {}) as { planId?: string; petId?: string }
      const plan = plans.find((p) => p.id === planId)
      if (!plan) throw new MockError('套餐不存在', 404)
      if (petId) {
        const pet = findPetById(petId)
        if (!pet || pet.ownerId !== user.id) throw new MockError('宠物不存在', 404)
      }
      const orderNo = `SP${Date.now()}${Math.floor(Math.random() * 1000)}`
      const now = Date.now()
      const order: OrderItem = {
        id: `o_${Date.now()}`,
        orderNo,
        userId: user.id,
        userName: user.name,
        petId: petId ?? null,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        status: 'paid',
        payMethod: payMethods[Math.floor(Math.random() * payMethods.length)],
        createdAt: now,
        paidAt: now,
      }
      orders.push(order)
      // 更新用户订阅
      user.planId = plan.id
      user.planExpireAt = new Date(now + plan.durationMonths * 30 * 86400000).toISOString()
      return { order, user: publicUser(user) }
    },
  },
  // 模拟支付
  {
    method: 'post',
    path: '/order/:id/pay',
    handler: ({ params }) => {
      const order = orders.find((o) => o.id === params.id)
      if (!order) throw new MockError('订单不存在', 404)
      if (order.status !== 'pending') throw new MockError('订单状态不支持支付', 1008)
      order.status = 'paid'
      order.payMethod = payMethods[Math.floor(Math.random() * payMethods.length)]
      order.paidAt = Date.now()
      return order
    },
  },
  // 运营端：订单分页
  {
    method: 'get',
    path: '/admin/orders',
    handler: (ctx) => {
      const { page = 1, pageSize = 10, status = 'all', keyword = '' } = ctx.query as {
        page?: number
        pageSize?: number
        status?: string
        keyword?: string
      }
      let list = [...orders]
      if (status !== 'all') list = list.filter((o) => o.status === status)
      if (keyword) {
        const kw = String(keyword).toLowerCase()
        list = list.filter((o) => o.orderNo.toLowerCase().includes(kw) || o.userName.includes(kw))
      }
      list.sort((a, b) => b.createdAt - a.createdAt)
      const start = (Number(page) - 1) * Number(pageSize)
      return { list: list.slice(start, start + Number(pageSize)), total: list.length, page: Number(page), pageSize: Number(pageSize) }
    },
  },
])

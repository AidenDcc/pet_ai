import type { PetFence } from '@/types'
import { defineMock, MockError, uid, mockAddress } from '../helper'

/** 组装围栏：附带中心点物理地址，供前端列表展示 */
function joinFence(f: PetFence): PetFence {
  return { ...f, address: mockAddress(f.center.lat, f.center.lng) }
}

/** 每个宠物的围栏列表（内存 DB） */
const petFences: Record<string, PetFence[]> = {
  p1: [
    {
      id: 'f1',
      petId: 'p1',
      name: '小区',
      center: { lat: 31.2320, lng: 121.4750 },
      radius: 500,
      enabled: true,
      createdAt: Date.now() - 86400000 * 10,
    },
    {
      id: 'f2',
      petId: 'p1',
      name: '公园',
      center: { lat: 31.2280, lng: 121.4700 },
      radius: 800,
      enabled: true,
      createdAt: Date.now() - 86400000 * 5,
    },
  ],
  p2: [
    {
      id: 'f3',
      petId: 'p2',
      name: '小区',
      center: { lat: 31.2310, lng: 121.4740 },
      radius: 300,
      enabled: true,
      createdAt: Date.now() - 86400000 * 7,
    },
  ],
}

defineMock([
  // 获取宠物所有围栏
  {
    method: 'get',
    path: '/pet/:petId/fences',
    handler: ({ params }) => {
      const fences = petFences[params.petId] ?? []
      return fences.map(joinFence)
    },
  },
  // 创建围栏
  {
    method: 'post',
    path: '/pet/:petId/fence',
    handler: ({ params, body }) => {
      const { name, center, radius, enabled = true } = body as {
        name: string; center: { lat: number; lng: number }; radius: number; enabled?: boolean
      }
      if (!name) throw new MockError('请输入围栏名称', 1003)
      const fence: PetFence = {
        id: uid('f'),
        petId: params.petId,
        name,
        center,
        radius,
        enabled,
        createdAt: Date.now(),
      }
      if (!petFences[params.petId]) petFences[params.petId] = []
      petFences[params.petId].push(fence)
      return joinFence(fence)
    },
  },
  // 更新围栏
  {
    method: 'put',
    path: '/pet/:petId/fence/:fenceId',
    handler: ({ params, body }) => {
      const fences = petFences[params.petId]
      if (!fences) throw new MockError('围栏不存在', 404)
      const fence = fences.find((f) => f.id === params.fenceId)
      if (!fence) throw new MockError('围栏不存在', 404)
      const data = body as {
        name?: string; center?: { lat: number; lng: number }; radius?: number; enabled?: boolean
      }
      if (data.name !== undefined) fence.name = data.name
      if (data.center !== undefined) fence.center = data.center
      if (data.radius !== undefined) fence.radius = data.radius
      if (data.enabled !== undefined) fence.enabled = data.enabled
      return joinFence(fence)
    },
  },
  // 删除围栏
  {
    method: 'delete',
    path: '/pet/:petId/fence/:fenceId',
    handler: ({ params }) => {
      const fences = petFences[params.petId]
      if (!fences) throw new MockError('围栏不存在', 404)
      const idx = fences.findIndex((f) => f.id === params.fenceId)
      if (idx === -1) throw new MockError('围栏不存在', 404)
      fences.splice(idx, 1)
      return { ok: true }
    },
  },
])

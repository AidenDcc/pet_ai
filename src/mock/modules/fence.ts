import type { PetFence } from '@/types'
import { defineMock, MockError, uid, mockAddress } from '../helper'
import { getSimPhoneLoc } from './location'

/** 组装围栏：动态围栏中心取手机实时定位；并附带中心点物理地址供前端列表展示 */
function joinFence(f: PetFence, petId: string): PetFence {
  if (f.type === 'dynamic') {
    const pos = getSimPhoneLoc(petId)
    return { ...f, center: pos, address: mockAddress(pos.lat, pos.lng) }
  }
  return { ...f, address: mockAddress(f.center.lat, f.center.lng) }
}

/**
 * 保证每只宠物有且仅有一条动态中心点围栏（跟随手机）。
 * 动态围栏不参与增删，只有一条，每次仅调整半径。
 */
function ensureDynamicFence(petId: string): void {
  const list = petFences[petId] ?? []
  if (list.some((f) => f.type === 'dynamic')) return
  const dyn: PetFence = {
    id: uid('fd'),
    petId,
    name: '跟随手机',
    type: 'dynamic',
    center: { lat: 31.2304, lng: 121.4737 }, // 占位：真实中心为手机实时定位，join 时覆盖
    radius: 500,
    enabled: true,
    createdAt: Date.now(),
  }
  list.unshift(dyn)
  petFences[petId] = list
}

/** 每个宠物的围栏列表（内存 DB） */
const petFences: Record<string, PetFence[]> = {
  p1: [
    {
      id: 'f1',
      petId: 'p1',
      name: '小区',
      type: 'fixed',
      center: { lat: 31.2320, lng: 121.4750 },
      radius: 500,
      enabled: true,
      createdAt: Date.now() - 86400000 * 10,
    },
    {
      id: 'f2',
      petId: 'p1',
      name: '公园',
      type: 'fixed',
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
      type: 'fixed',
      center: { lat: 31.2310, lng: 121.4740 },
      radius: 300,
      enabled: true,
      createdAt: Date.now() - 86400000 * 7,
    },
  ],
}

defineMock([
  // 获取宠物所有围栏（固定 + 动态）
  {
    method: 'get',
    path: '/pet/:petId/fences',
    handler: ({ params }) => {
      ensureDynamicFence(params.petId)
      const fences = petFences[params.petId] ?? []
      return fences.map((f) => joinFence(f, params.petId))
    },
  },
  // 创建围栏（UI 仅创建固定中心点围栏）
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
        type: 'fixed',
        center,
        radius,
        enabled,
        createdAt: Date.now(),
      }
      if (!petFences[params.petId]) petFences[params.petId] = []
      petFences[params.petId].push(fence)
      return joinFence(fence, params.petId)
    },
  },
  // 更新围栏（动态围栏仅调整 radius / enabled）
  {
    method: 'put',
    path: '/pet/:petId/fence/:fenceId',
    handler: ({ params, body }) => {
      const fences = petFences[params.petId]
      if (!fences) throw new MockError('围栏不存在', 404)
      const fence = fences.find((f) => f.id === params.fenceId)
      if (!fence) throw new MockError('围栏不存在', 404)
      const data = body as {
        name?: string; center?: { lat: number; lng: number }; radius?: number; enabled?: boolean; type?: 'fixed' | 'dynamic'
      }
      if (data.name !== undefined) fence.name = data.name
      if (data.center !== undefined) fence.center = data.center
      if (data.radius !== undefined) fence.radius = data.radius
      if (data.enabled !== undefined) fence.enabled = data.enabled
      if (data.type !== undefined) fence.type = data.type
      return joinFence(fence, params.petId)
    },
  },
  // 删除围栏（仅固定围栏）
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

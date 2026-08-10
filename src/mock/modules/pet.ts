import type { UserInfo } from '@/types'
import { defineMock, MockError, paginate, filterByKeyword, requireUser, requireRole } from '../helper'
import { pets, devices, findPetById, findUserById, publicUser } from '../db'
import type { DeviceInfo, PetInfo } from '@/types'

export interface PetJoined extends PetInfo {
  ownerName: string
  device: DeviceInfo | null
}

function joinPet(pet: PetInfo): PetJoined {
  const device = devices.find((d) => d.boundPetId === pet.id) ?? null
  const owner = findUserById(pet.ownerId)
  return { ...pet, ownerName: owner?.name ?? '未知', device }
}

defineMock([
  // 我的宠物（用户端）
  {
    method: 'get',
    path: '/pet/list',
    handler: (ctx) => {
      const user = requireUser(ctx)
      return pets.filter((p) => p.ownerId === user.id).map(joinPet)
    },
  },
  // 宠物详情
  {
    method: 'get',
    path: '/pet/:id',
    handler: ({ params }) => {
      const pet = findPetById(params.id)
      if (!pet) throw new MockError('宠物不存在', 404)
      return joinPet(pet)
    },
  },
  // 更新宠物档案
  {
    method: 'put',
    path: '/pet/:id',
    handler: ({ params, body }) => {
      const pet = findPetById(params.id)
      if (!pet) throw new MockError('宠物不存在', 404)
      const patch = (body ?? {}) as Partial<PetInfo>
      if ((patch.personalityTags ?? []).length > 10) throw new MockError('性格标签最多 10 个')
      Object.assign(pet, patch)
      return joinPet(pet)
    },
  },
  // 运营端：宠物档案分页
  {
    method: 'get',
    path: '/admin/pets',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const { page = 1, pageSize = 10, keyword = '', species = '' } = ctx.query as {
        page?: number
        pageSize?: number
        keyword?: string
        species?: string
      }
      let list = [...pets]
      if (species && species !== 'all') list = list.filter((p) => p.species === species)
      list = filterByKeyword(list, String(keyword), ['name', 'breed', 'id'])
      return paginate(list.map(joinPet), Number(page), Number(pageSize))
    },
  },
  // 医生端：患者列表
  {
    method: 'get',
    path: '/doctor/patients',
    handler: (ctx) => {
      requireRole(ctx, 'doctor')
      const { page = 1, pageSize = 10, keyword = '' } = ctx.query as {
        page?: number
        pageSize?: number
        keyword?: string
      }
      let list = [...pets]
      list = filterByKeyword(list, String(keyword), ['name', 'breed', 'id', 'microchip'])
      const joined = list.map((p) => {
        const j = joinPet(p)
        return {
          ...j,
          owner: findUserById(p.ownerId) ? publicUser(findUserById(p.ownerId)!) : ({} as UserInfo),
        }
      })
      joined.sort((a, b) => (b.device?.status === 'online' ? 1 : 0) - (a.device?.status === 'online' ? 1 : 0))
      return paginate(joined, Number(page), Number(pageSize))
    },
  },
  // 新增宠物（用户端）
  {
    method: 'post',
    path: '/pet',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const body = (ctx.body ?? {}) as Partial<PetInfo>
      if (!body.name) throw new MockError('宠物昵称不能为空')
      if ((body.personalityTags ?? []).length > 10) throw new MockError('性格标签最多 10 个')
      const now = new Date().toISOString()
      const name = body.name || '未命名'
      const pet: PetInfo = {
        id: `p${pets.length + 1}`,
        name: body.name || '未命名',
        species: body.species || 'dog',
        breed: body.breed || '未知',
        gender: body.gender || 'male',
        birthDate: body.birthDate || now,
        weight: body.weight ?? 0,
        avatar: body.avatar || `data:image/svg+xml,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="#5b8ff9"/><text x="48" y="62" font-size="40" text-anchor="middle" fill="#fff" font-family="sans-serif">${name.slice(0, 1)}</text></svg>`,
        )}`,
        ownerId: user.id,
        deviceId: null,
        sterilized: body.sterilized ?? false,
        microchip: `${Math.floor(Math.random() * 900000000 + 100000000)}${Math.floor(Math.random() * 900000000 + 100000000)}`,
        createdAt: now,
        vaccines: body.vaccines ?? [],
        dewormings: body.dewormings ?? [],
        personalityTags: body.personalityTags ?? [],
      }
      pets.push(pet)
      user.petIds.push(pet.id)
      return joinPet(pet)
    },
  },
  // 删除宠物（用户端）
  {
    method: 'delete',
    path: '/pet/:id',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const pet = findPetById(ctx.params.id)
      if (!pet) throw new MockError('宠物不存在', 404)
      if (pet.ownerId !== user.id) throw new MockError('无权操作该宠物', 403)
      // 解绑关联设备
      const device = devices.find((d) => d.boundPetId === pet.id)
      if (device) {
        device.boundPetId = null
        device.ownerId = null
        device.status = 'unbound'
      }
      // 移除主人 petIds 中的引用
      const idx = user.petIds.indexOf(pet.id)
      if (idx !== -1) user.petIds.splice(idx, 1)
      // 从 pets 数组中删除
      const petIdx = pets.findIndex((p) => p.id === pet.id)
      if (petIdx !== -1) pets.splice(petIdx, 1)
      return null
    },
  },
  // 宠物档案详情（医生/运营查看，含主人信息）
  {
    method: 'get',
    path: '/pet/detail/:id',
    handler: ({ params }) => {
      const pet = findPetById(params.id)
      if (!pet) throw new MockError('宠物不存在', 404)
      const owner = findUserById(pet.ownerId)
      return {
        ...joinPet(pet),
        owner: owner ? publicUser(owner) : null,
      }
    },
  },
])

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

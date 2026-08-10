import { defineMock, MockError, requireRole, requireUser, uid } from '../helper'
import {
  consultations,
  vets,
  telemetry,
  findPetById,
  findUserById,
  findVetById,
  findVetByUserId,
  findConsultation,
  publicUser,
} from '../db'

defineMock([
  // 可选医生列表（已认证）
  {
    method: 'get',
    path: '/doctor/list',
    handler: (ctx) => {
      requireUser(ctx)
      return vets
        .filter((v) => v.certStatus === 'approved')
        .map(({ id, name, hospital, title, avatar, specialty }) => ({ id, name, hospital, title, avatar, specialty }))
    },
  },
  // 宠物主推送健康数据给医生（同宠物同医生重复推送视为更新）
  {
    method: 'post',
    path: '/consultation/push',
    handler: (ctx) => {
      const user = requireRole(ctx, 'user')
      const { petId, doctorId, note } = (ctx.body ?? {}) as { petId?: string; doctorId?: string; note?: string }
      if (!petId || !doctorId) throw new MockError('请选择宠物与医生', 1001)
      const pet = findPetById(petId)
      if (!pet || pet.ownerId !== user.id) throw new MockError('宠物不存在', 404)
      if (!findVetById(doctorId)) throw new MockError('医生不存在', 404)
      const existing = findConsultation(petId, doctorId)
      if (existing) {
        existing.status = 'active'
        existing.pushedAt = Date.now()
        existing.note = note ?? existing.note
        return existing
      }
      const item = {
        id: uid('c'),
        petId,
        ownerId: user.id,
        doctorId,
        status: 'active' as const,
        pushedAt: Date.now(),
        note: note ?? null,
      }
      consultations.push(item)
      return item
    },
  },
  // 医生端：问诊宠物列表（含宠物、主人、问诊备注、最新体征）
  {
    method: 'get',
    path: '/doctor/consultations',
    handler: (ctx) => {
      const user = requireRole(ctx, 'doctor')
      const vet = findVetByUserId(user.id)
      if (!vet) throw new MockError('未找到医生档案', 404)
      return consultations
        .filter((c) => c.doctorId === vet.id && c.status === 'active')
        .map((c) => {
          const pet = findPetById(c.petId)
          const owner = findUserById(c.ownerId)
          const tele = telemetry[c.petId]
          return {
            ...c,
            pet: pet ?? null,
            owner: owner ? publicUser(owner) : null,
            latest: tele && tele.length ? tele[tele.length - 1] : null,
          }
        })
        .filter((c) => c.pet !== null)
        .sort((a, b) => b.pushedAt - a.pushedAt)
    },
  },
  // 未使用但保留：宠物主查询自己的问诊记录（便于后续扩展）
  {
    method: 'get',
    path: '/consultation/mine',
    handler: (ctx) => {
      const user = requireUser(ctx)
      return consultations
        .filter((c) => c.ownerId === user.id)
        .map((c) => {
          const pet = findPetById(c.petId)
          const vet = findVetById(c.doctorId)
          return { ...c, pet: pet ?? null, vetName: vet?.name ?? null }
        })
        .sort((a, b) => b.pushedAt - a.pushedAt)
    },
  },
])

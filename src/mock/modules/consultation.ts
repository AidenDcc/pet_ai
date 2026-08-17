import { defineMock, MockError, requireRole, requireUser, uid } from '../helper'
import type {
  ConsultationExerciseSnapshot,
  ConsultationHealthSnapshot,
  ConsultationMedicine,
  PetInfo,
} from '@/types'
import {
  consultations,
  vets,
  telemetry,
  findPetById,
  findUserById,
  findVetById,
  findVetByUserId,
  findConsultation,
  findConsultationById,
  publicUser,
} from '../db'

/** 未携带快照时的兜底：从最新遥测推导体征快照 */
function fallbackHealth(pet: PetInfo): ConsultationHealthSnapshot | null {
  const tele = telemetry[pet.id]
  const last = tele && tele.length ? tele[tele.length - 1] : null
  if (!last) return null
  return {
    temperature: Math.round(last.temperature * 10) / 10,
    heartRate: last.heartRate,
    spo2: last.spo2,
    respiratoryRate: last.respiratoryRate,
    // 卡路里：按单条遥测活动的步数折算全日消耗（与健康汇总口径一致）
    calorie: Math.round(last.activity * 0.05 * 24),
    activityPercent: Math.min(100, Math.round((last.activity / 60) * 100)),
    sleepHours: 0,
    updatedAt: last.ts,
  }
}

/** 未携带快照时的兜底：按品种生成运动快照 */
function fallbackExercise(pet: PetInfo): ConsultationExerciseSnapshot {
  const isCat = pet.species === 'cat'
  return {
    stepFreq: isCat ? 45 : 80,
    stride: isCat ? 16 : 26,
    gait: 'walk',
    speed: 0.4,
    updatedAt: Date.now(),
  }
}

defineMock([
  // 可选医生列表（已认证）
  {
    method: 'get',
    path: '/doctor/list',
    handler: (ctx) => {
      requireUser(ctx)
      return vets
        .filter((v) => v.certStatus === 'approved')
        .map(({ id, name, hospital, title, avatar, specialty, consultPrice, specialtyDesc, certNo, species, score, monthlyAnswers, monthlyPrescriptions, honors, priceText, pricePhone }) => ({
          id, name, hospital, title, avatar, specialty, consultPrice,
          specialtyDesc, certNo, species, score, monthlyAnswers, monthlyPrescriptions, honors, priceText, pricePhone,
        }))
    },
  },
  // 宠物主提交咨询（同宠物同医生重复提交视为更新内容与快照）
  {
    method: 'post',
    path: '/consultation/push',
    handler: (ctx) => {
      const user = requireRole(ctx, 'user')
      const { petId, doctorId, note, images, healthSnapshot, exerciseSnapshot } = (ctx.body ?? {}) as {
        petId?: string
        doctorId?: string
        note?: string
        images?: string[]
        healthSnapshot?: ConsultationHealthSnapshot
        exerciseSnapshot?: ConsultationExerciseSnapshot
      }
      if (!petId || !doctorId) throw new MockError('请选择宠物与医生', 1001)
      const pet = findPetById(petId)
      if (!pet || pet.ownerId !== user.id) throw new MockError('宠物不存在', 404)
      if (!findVetById(doctorId)) throw new MockError('医生不存在', 404)
      const snapshots = {
        images: Array.isArray(images) ? images : [],
        healthSnapshot: healthSnapshot ?? fallbackHealth(pet),
        exerciseSnapshot: exerciseSnapshot ?? fallbackExercise(pet),
      }
      const existing = findConsultation(petId, doctorId)
      if (existing) {
        existing.status = 'active'
        existing.pushedAt = Date.now()
        existing.note = note ?? existing.note
        if (snapshots.images.length) existing.images = snapshots.images
        if (snapshots.healthSnapshot) existing.healthSnapshot = snapshots.healthSnapshot
        if (snapshots.exerciseSnapshot) existing.exerciseSnapshot = snapshots.exerciseSnapshot
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
        replies: [],
        ...snapshots,
      }
      consultations.push(item)
      return item
    },
  },
  // 宠物主查询自己的问诊记录（含宠物、医生、最新回复）
  // 注意：静态路径必须在参数化路径（/consultation/:id）之前声明，否则会被通配吞掉
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
          return {
            ...c,
            pet: pet ?? null,
            vetName: vet?.name ?? null,
            lastReply: c.replies.length ? c.replies[c.replies.length - 1] : null,
          }
        })
        .sort((a, b) => b.pushedAt - a.pushedAt)
    },
  },
  // 问诊记录详情（宠物主 / 对应医生可查看）
  {
    method: 'get',
    path: '/consultation/:id',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const c = findConsultationById(ctx.params.id)
      if (!c) throw new MockError('问诊记录不存在', 404)
      const isOwner = c.ownerId === user.id
      const vet = findVetByUserId(user.id)
      const isVet = !!vet && c.doctorId === vet.id
      if (!isOwner && !isVet) throw new MockError('无权查看该问诊记录', 403)
      const owner = findUserById(c.ownerId)
      return {
        ...c,
        pet: findPetById(c.petId) ?? null,
        vet: findVetById(c.doctorId) ?? null,
        owner: owner ? publicUser(owner) : null,
      }
    },
  },
  // 医生端：回复问诊（内容 + 推荐用药）
  {
    method: 'post',
    path: '/consultation/:id/reply',
    handler: (ctx) => {
      const user = requireRole(ctx, 'doctor')
      const vet = findVetByUserId(user.id)
      if (!vet) throw new MockError('未找到医生档案', 404)
      const c = findConsultationById(ctx.params.id)
      if (!c) throw new MockError('问诊记录不存在', 404)
      if (c.doctorId !== vet.id) throw new MockError('该问诊不属于您', 403)
      const { content, medicines } = (ctx.body ?? {}) as {
        content?: string
        medicines?: ConsultationMedicine[]
      }
      if (!content || !content.trim()) throw new MockError('请填写回复内容', 1001)
      c.replies.push({
        id: uid('r'),
        vetId: vet.id,
        content,
        medicines: Array.isArray(medicines) ? medicines.filter((m) => m.name?.trim()) : [],
        repliedAt: Date.now(),
      })
      return c
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
  // 医生端：当前登录医生档案（医院 / 职称 / 擅长 / 评分 / 接诊统计）
  // 注意：需放在 /doctor/:id 之前，避免 :id 吞掉静态路径
  {
    method: 'get',
    path: '/doctor/me',
    handler: (ctx) => {
      const user = requireRole(ctx, 'doctor')
      const vet = findVetByUserId(user.id)
      if (!vet) throw new MockError('未找到医生档案', 404)
      return vet
    },
  },
  // 医生详情（基本信息 + 评分 + 宠主评价）
  // 注意：需放在 /doctor/consultations 之后，避免 :id 吞掉静态路径
  {
    method: 'get',
    path: '/doctor/:id',
    handler: (ctx) => {
      requireUser(ctx)
      const vet = findVetById(ctx.params.id)
      if (!vet) throw new MockError('医生不存在', 404)
      return vet
    },
  },
])

import { defineMock, MockError, requireUser, requireRole, uid } from '../helper'
import { reports, findPetById, findUserById, findVetByUserId, vets, dailyAgg, health } from '../db'
import type { ReportItem, ReportTrend } from '@/types'

/** 卡路里换算：每步消耗约 0.05 千卡（与健康模块口径一致） */
const CAL_PER_STEP = 0.05
const calorieOf = (steps: number) => Math.round(steps * CAL_PER_STEP)

/**
 * 根据报告周期生成趋势点位：
 * 单日（≤1.5 天）取逐小时健康数据；周/月取日汇总数据
 */
export function buildTrend(report: ReportItem): ReportTrend {
  const dayMs = 86400000
  const spanDays = (report.endAt - report.startAt) / dayMs
  if (spanDays <= 1.5) {
    const hourly = (health[report.petId] ?? []).filter((m) => m.ts >= report.startAt && m.ts <= report.endAt)
    return {
      heartRate: hourly.map((m) => ({ ts: m.ts, value: m.heartRate })),
      respiratoryRate: hourly.map((m) => ({ ts: m.ts, value: m.respiratoryRate })),
      spo2: hourly.map((m) => ({ ts: m.ts, value: m.spo2 })),
      temperature: hourly.map((m) => ({ ts: m.ts, value: m.temperature })),
      calorie: hourly.map((m) => ({ ts: m.ts, value: calorieOf(m.activity) })),
    }
  }
  const days = (dailyAgg[report.petId] ?? []).filter((d) => d.ts >= report.startAt && d.ts <= report.endAt)
  return {
    heartRate: days.map((d) => ({ ts: d.ts, value: d.heartRate.avg })),
    respiratoryRate: days.map((d) => ({ ts: d.ts, value: d.respiratoryRate.avg })),
    spo2: days.map((d) => ({ ts: d.ts, value: d.spo2.avg })),
    temperature: days.map((d) => ({ ts: d.ts, value: d.temperature.avg })),
    calorie: days.map((d) => ({ ts: d.ts, value: calorieOf(d.steps) })),
  }
}

function joinReport(report: ReportItem) {
  const pet = findPetById(report.petId)
  const owner = pet ? findUserById(pet.ownerId) : null
  const doctor = report.doctorId ? vets.find((v) => v.id === report.doctorId) : null
  return {
    ...report,
    petName: pet?.name ?? '未知宠物',
    petAvatar: pet?.avatar ?? '',
    species: pet?.species ?? 'dog',
    doctorName: doctor?.name ?? null,
    ownerId: pet?.ownerId ?? '',
    ownerName: owner?.name ?? '',
    ownerAvatar: owner?.avatar ?? '',
    trend: buildTrend(report),
  }
}

defineMock([
  // 我的健康报告列表（用户端：支持未读/全部 + 宠物/时间区间/评分区间筛选）
  {
    method: 'get',
    path: '/report/list',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const q = ctx.query as Record<string, string>
      const petId = q.petId || ''
      const unread = q.unread === 'true' || q.unread === '1'
      const from = Number(q.from ?? 0)
      const to = Number(q.to ?? 0)
      const minScore = Number(q.minScore ?? 0)
      const maxScore = Number(q.maxScore ?? 100)
      let list = reports
      if (petId) list = list.filter((r) => r.petId === petId)
      else list = list.filter((r) => user.petIds.includes(r.petId))
      if (unread) list = list.filter((r) => !r.readAt)
      if (from) list = list.filter((r) => r.endAt >= from)
      if (to) list = list.filter((r) => r.startAt <= to)
      if (minScore > 0 || maxScore < 100) list = list.filter((r) => r.score >= minScore && r.score <= maxScore)
      return list
        .map(joinReport)
        .sort((a, b) => b.startAt - a.startAt)
    },
  },
  // 医生端：待审核报告
  {
    method: 'get',
    path: '/report/review-list',
    handler: (ctx) => {
      requireRole(ctx, 'doctor')
      const pending = reports
        .filter((r) => r.doctorReview === 'pending')
        .map(joinReport)
        .sort((a, b) => b.startAt - a.startAt)
      return pending
    },
  },
  // 医生端：历史报告（已审核）
  {
    method: 'get',
    path: '/report/all',
    handler: (ctx) => {
      requireRole(ctx, 'doctor')
      return reports
        .filter((r) => r.doctorReview && r.doctorReview !== 'pending')
        .map(joinReport)
        .sort((a, b) => b.startAt - a.startAt)
    },
  },
  // 运营端：平台全部宠物的历史健康报告（含待审核，可按宠物过滤）
  {
    method: 'get',
    path: '/admin/reports',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const petId = (ctx.query.petId as string) || ''
      let list = reports
      if (petId) list = list.filter((r) => r.petId === petId)
      return list.map(joinReport).sort((a, b) => b.startAt - a.startAt)
    },
  },
  // 报告详情（放在静态路径之后，避免覆盖 review-list / all）
  {
    method: 'get',
    path: '/report/:id',
    handler: ({ params }) => {
      const report = reports.find((r) => r.id === params.id)
      if (!report) throw new MockError('报告不存在', 404)
      return joinReport(report)
    },
  },
  // 标记报告已读
  {
    method: 'post',
    path: '/report/:id/read',
    handler: (ctx) => {
      requireUser(ctx)
      const report = reports.find((r) => r.id === ctx.params.id)
      if (!report) throw new MockError('报告不存在', 404)
      if (!report.readAt) report.readAt = Date.now()
      return { ok: true }
    },
  },
  // 医生审核报告
  {
    method: 'post',
    path: '/report/:id/review',
    handler: (ctx) => {
      const user = requireRole(ctx, 'doctor')
      const { action, comment } = (ctx.body ?? {}) as { action?: 'approve' | 'reject'; comment?: string }
      const report = reports.find((r) => r.id === ctx.params.id)
      if (!report) throw new MockError('报告不存在', 404)
      if (report.doctorReview !== 'pending') throw new MockError('该报告已被处理', 1007)
      const vet = findVetByUserId(user.id) ?? vets[0]
      report.doctorReview = action === 'reject' ? 'rejected' : 'approved'
      report.doctorComment = comment ?? (action === 'reject' ? '建议复查并加强观察。' : '各项指标正常，建议保持当前饲养习惯。')
      report.doctorId = vet.id
      return joinReport(report)
    },
  },
  // 生成报告占位（演示用）
  {
    method: 'post',
    path: '/report/generate/:petId',
    handler: ({ params }) => {
      const pet = findPetById(params.petId)
      if (!pet) throw new MockError('宠物不存在', 404)
      const now = Date.now()
      const report: ReportItem = {
        id: uid('r'),
        petId: pet.id,
        period: `${new Date(now - 6 * 86400000).toLocaleDateString('zh-CN')} 至 ${new Date(now).toLocaleDateString('zh-CN')}`,
        startAt: now - 6 * 86400000,
        endAt: now,
        score: 90,
        summary: `${pet.name} 本周整体健康状态良好。`,
        aiConclusion: `AI 分析：各项指标均处于品种参考区间内，生命体征平稳，建议保持当前饲养与运动习惯。`,
        abnormal: [],
        metricsSummary: {
          heartRate: { avg: 96, max: 118, min: 78 },
          respiratoryRate: { avg: 22, max: 30, min: 16 },
          spo2: { avg: 97.5, min: 95 },
          temperature: { avg: 38.3, max: 38.9, min: 37.8 },
          totalActivity: 52000,
          sleepDuration: 11.5,
        },
        doctorId: null,
        doctorReview: 'pending',
        doctorComment: null,
        readAt: null,
        createdAt: now,
      }
      reports.push(report)
      return joinReport(report)
    },
  },
])

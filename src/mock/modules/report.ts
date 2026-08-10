import { defineMock, MockError, requireUser, requireRole, uid } from '../helper'
import { reports, findPetById, findVetByUserId, vets } from '../db'
import type { ReportItem } from '@/types'

function joinReport(report: ReportItem) {
  const pet = findPetById(report.petId)
  const doctor = report.doctorId ? vets.find((v) => v.id === report.doctorId) : null
  return {
    ...report,
    petName: pet?.name ?? '未知宠物',
    petAvatar: pet?.avatar ?? '',
    species: pet?.species ?? 'dog',
    doctorName: doctor?.name ?? null,
  }
}

defineMock([
  // 我的健康报告列表（用户端，可按宠物过滤）
  {
    method: 'get',
    path: '/report/list',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const petId = (ctx.query.petId as string) || ''
      let list = reports
      if (petId) list = list.filter((r) => r.petId === petId)
      else list = list.filter((r) => user.petIds.includes(r.petId))
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
        createdAt: now,
      }
      reports.push(report)
      return joinReport(report)
    },
  },
])

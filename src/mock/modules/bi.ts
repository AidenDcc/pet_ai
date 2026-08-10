import { defineMock, MockError, requireRole } from '../helper'
import { users, devices, vets, pets, orders, plans, reports, consultations, findVetByUserId, findPetById } from '../db'

function shortDay(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a: number, b: number): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

defineMock([
  /* ---------------- 运营端 BI：平台经营维度 ---------------- */
  {
    method: 'get',
    path: '/admin/bi',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const now = Date.now()

      // 近 30 日营收与订单趋势
      const revenueTrend: { day: string; revenue: number; orders: number }[] = []
      for (let i = 29; i >= 0; i--) {
        const day = now - i * 86400000
        const dayOrders = orders.filter((o) => isSameDay(o.createdAt, day))
        revenueTrend.push({
          day: shortDay(day),
          revenue: dayOrders.filter((o) => o.status === 'paid').reduce((s, o) => s + o.amount, 0),
          orders: dayOrders.length,
        })
      }

      // 套餐收入构成
      const planRevenue = plans
        .map((p) => ({
          name: p.name,
          value: orders.filter((o) => o.status === 'paid' && o.planId === p.id).reduce((s, o) => s + o.amount, 0),
        }))
        .filter((d) => d.value > 0)

      // 设备状态分布（key 供前端按 i18n 翻译）
      const statusKeys = ['online', 'offline', 'low-power', 'unbound'] as const
      const deviceStatus = statusKeys.map((s) => ({ name: s, value: devices.filter((d) => d.status === s).length }))

      // 健康报告异常类型分布（数据为中文标签，属业务数据）
      const abnormalMap: Record<string, number> = {}
      reports.forEach((r) => r.abnormal.forEach((a) => (abnormalMap[a.label] = (abnormalMap[a.label] ?? 0) + 1)))
      const abnormalDist = Object.entries(abnormalMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      // 用户 / 医生增长趋势（近 14 日累计）
      const growthTrend: { day: string; users: number; vets: number }[] = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now - i * 86400000)
        growthTrend.push({
          day: shortDay(d.getTime()),
          users: users.filter((u) => u.role === 'user' && new Date(u.registeredAt).getTime() <= d.getTime()).length,
          vets: vets.filter((v) => v.certStatus === 'approved').length,
        })
      }

      return {
        kpis: {
          revenue: orders.filter((o) => o.status === 'paid').reduce((s, o) => s + o.amount, 0),
          orders: orders.length,
          users: users.filter((u) => u.role === 'user').length,
          devices: devices.length,
        },
        revenueTrend,
        planRevenue,
        deviceStatus,
        abnormalDist,
        growthTrend,
      }
    },
  },
  /* ---------------- 医生端 BI：诊所维度 ---------------- */
  {
    method: 'get',
    path: '/doctor/bi',
    handler: (ctx) => {
      const user = requireRole(ctx, 'doctor')
      const vet = findVetByUserId(user.id)
      if (!vet) throw new MockError('未找到医生档案', 404)

      const consults = consultations.filter((c) => c.doctorId === vet.id && c.status === 'active')
      const petIds = consults.map((c) => c.petId)
      const myPets = pets.filter((p) => petIds.includes(p.id))

      const pending = reports.filter((r) => r.doctorReview === 'pending').length
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const monthReports = reports.filter((r) => r.createdAt >= monthStart.getTime()).length

      // 问诊宠物健康均分
      const petScores = petIds.map((id) => {
        const rl = reports.filter((r) => r.petId === id)
        const pet = findPetById(id)
        return {
          name: pet?.name ?? id,
          score: rl.length ? Math.round(rl.reduce((s, r) => s + r.score, 0) / rl.length) : 0,
        }
      })

      // 患者品种分布（key 供前端按 i18n 翻译）
      const spMap: Record<string, number> = {}
      myPets.forEach((p) => (spMap[p.species] = (spMap[p.species] ?? 0) + 1))
      const speciesDist = Object.entries(spMap).map(([key, value]) => ({ name: key, value }))

      // 报告异常类型分布（本诊所问诊宠物的报告）
      const abnormalMap: Record<string, number> = {}
      reports
        .filter((r) => petIds.includes(r.petId))
        .forEach((r) => r.abnormal.forEach((a) => (abnormalMap[a.label] = (abnormalMap[a.label] ?? 0) + 1)))
      const abnormalDist = Object.entries(abnormalMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      // 近 7 日报告量（本诊所相关）
      const now = Date.now()
      const weeklyReports: { day: string; value: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const day = now - i * 86400000
        weeklyReports.push({
          day: shortDay(day),
          value: reports.filter((r) => petIds.includes(r.petId) && isSameDay(r.createdAt, day)).length,
        })
      }

      // 审核通过率（本诊所相关报告）
      const related = reports.filter((r) => petIds.includes(r.petId))
      const reviewRate = {
        approved: related.filter((r) => r.doctorReview === 'approved').length,
        rejected: related.filter((r) => r.doctorReview === 'rejected').length,
        pending: related.filter((r) => r.doctorReview === 'pending').length,
      }

      return {
        kpis: { patients: myPets.length, consults: consults.length, pending, monthReports },
        petScores,
        speciesDist,
        abnormalDist,
        weeklyReports,
        reviewRate,
      }
    },
  },
])

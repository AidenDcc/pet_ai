import type { HealthMetricType, NormalRange } from '@/types'
import { defineMock, MockError } from '../helper'
import { health, telemetry, dailyAgg, findDeviceById, findPetById } from '../db'

export const RANGES: Record<string, NormalRange> = {
  heartRate: { min: 60, max: 160, unit: '次/分' },
  respiratoryRate: { min: 12, max: 36, unit: '次/分' },
  spo2: { min: 94, max: 100, unit: '%' },
  temperature: { min: 37.5, max: 39.3, unit: '°C' },
  activity: { min: 0, max: 8000, unit: '步' },
}

/** 卡路里换算：每步消耗约 0.05 千卡（演示数据，按活动量/步数折算） */
const CAL_PER_STEP = 0.05
const calorieOf = (steps: number) => Math.round(steps * CAL_PER_STEP)

defineMock([
  // 今日健康概览
  {
    method: 'get',
    path: '/health/summary/:petId',
    handler: ({ params }) => {
      const petId = params.petId
      const data = health[petId]
      if (!data) throw new MockError('暂无健康数据', 404)
      const hr = data.map((m) => m.heartRate)
      const latest = data[data.length - 1]
      const avg = (arr: number[]) => Math.round(arr.reduce((s, n) => s + n, 0) / arr.length)
      const steps = data.reduce((s, m) => s + m.activity, 0)
      const sleepHours = data.filter((m) => m.sleepStage !== 'awake').length * 1.0
      const goal = 8000
      // 静息心率：取非清醒（睡眠/休息）样本的均值心率
      const restingPts = data.filter((m) => m.sleepStage !== 'awake').map((m) => m.heartRate)
      const restingHeartRate = restingPts.length
        ? Math.round(restingPts.reduce((s, n) => s + n, 0) / restingPts.length)
        : Math.min(...hr)
      return {
        petId,
        updatedAt: latest.ts,
        restingHeartRate,
        heartRate: { avg: avg(hr), max: Math.max(...hr), min: Math.min(...hr), latest: latest.heartRate },
        respiratoryRate: { latest: latest.respiratoryRate, avg: avg(data.map((m) => m.respiratoryRate)) },
        spo2: { latest: latest.spo2, avg: avg(data.map((m) => m.spo2)) },
        temperature: { latest: latest.temperature, avg: avg(data.map((m) => m.temperature)) },
        calorie: { latest: calorieOf(steps), avg: calorieOf(steps) },
        activity: {
          steps,
          goal,
          percent: Math.min(100, Math.round((steps / goal) * 100)),
        },
        sleep: { hours: Number(sleepHours.toFixed(1)), stage: latest.sleepStage },
        overall: '良好',
      }
    },
  },
  // 指标曲线数据
  {
    method: 'get',
    path: '/health/series/:petId',
    handler: ({ params, query }) => {
      const petId = params.petId
      const data = health[petId]
      if (!data) throw new MockError('暂无健康数据', 404)
      const type = (query.type as HealthMetricType) || 'heartRate'
      const days = Number(query.days || 1)
      const unitMap: Record<string, string> = {
        heartRate: '次/分',
        respiratoryRate: '次/分',
        spo2: '%',
        temperature: '°C',
        activity: '步',
        sleep: '深度等级',
        calorie: 'kcal',
      }
      if (days > 1) {
        // 按 days 截取最近 N 天：周=7 / 月=30 / 季度=90
        const agg = (dailyAgg[petId] ?? []).slice(-days)
        // activity / sleep：保留原有日汇总字段；calorie：按日步数折算；四体征：返回日均值点位
        if (type === 'activity' || type === 'sleep') {
          const keyMap: Record<'activity' | 'sleep', 'avgHeartRate' | 'steps' | 'sleepHours'> = {
            activity: 'steps',
            sleep: 'sleepHours',
          }
          const key = keyMap[type]
          return {
            points: agg.map((d) => ({ ts: d.ts, value: d[key] })),
            unit: unitMap[type],
            range: RANGES[type] ?? null,
          }
        }
        if (type === 'calorie') {
          return {
            points: agg.map((d) => ({ ts: d.ts, value: calorieOf(d.steps) })),
            unit: unitMap.calorie,
            range: null,
          }
        }
        return {
          points: agg.map((d) => ({ ts: d.ts, value: d[type].avg })),
          unit: unitMap[type],
          range: RANGES[type] ?? null,
        }
      }
      const points =
        type === 'sleep'
          ? data.map((m) => ({
              ts: m.ts,
              value: m.sleepStage === 'awake' ? 0 : m.sleepStage === 'deep' ? 2 : 1,
            }))
          : type === 'calorie'
            ? data.map((m) => ({ ts: m.ts, value: calorieOf(m.activity) }))
            : data.map((m) => ({ ts: m.ts, value: m[type] as number }))
      return { points, unit: unitMap[type], range: RANGES[type] ?? null }
    },
  },
  // 实时流（医生端）
  {
    method: 'get',
    path: '/health/telemetry/:deviceId',
    handler: ({ params }) => {
      const device = findDeviceById(params.deviceId)
      if (!device) throw new MockError('设备不存在', 404)
      const petId = device.boundPetId
      if (!petId || !telemetry[petId]) throw new MockError('暂无实时数据', 404)
      return { petId, points: telemetry[petId] }
    },
  },
  // 指标正常参考区间
  {
    method: 'get',
    path: '/health/ranges',
    handler: () => RANGES,
  },
  // 近 7 天日汇总
  {
    method: 'get',
    path: '/health/week/:petId',
    handler: ({ params }) => {
      const petId = params.petId
      if (!findPetById(petId)) throw new MockError('宠物不存在', 404)
      return dailyAgg[petId] ?? []
    },
  },
])

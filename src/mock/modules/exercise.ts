import type { ExerciseState, ExercisePoint } from '@/types'
import { defineMock, MockError } from '../helper'

/** 运动实时状态（内存） */
const exerciseStates: Record<string, ExerciseState> = {
  p1: { stepFreq: 82, stride: 28, gait: 'walk', speed: 0.8, updatedAt: Date.now() },
  p2: { stepFreq: 45, stride: 18, gait: 'rest', speed: 0.1, updatedAt: Date.now() },
}

/** 生成运动趋势数据 */
function generateExerciseSeries(petId: string, days: number): ExercisePoint[] {
  const gaits: ExercisePoint['gait'][] = ['walk', 'trot', 'run', 'rest']
  const points: ExercisePoint[] = []
  const now = Date.now()
  const interval = days === 1 ? 300000 : days <= 7 ? 3600000 : 14400000 // 5min, 1h, 4h

  const totalPoints = days === 1 ? 288 : days <= 7 ? days * 24 : days * 6
  const baseFreq = petId === 'p1' ? 75 : 45
  const baseStride = petId === 'p1' ? 26 : 16

  for (let i = totalPoints - 1; i >= 0; i--) {
    const ts = now - i * interval
    const hour = new Date(ts).getHours()
    // 模拟活动时间（6-8点、17-19点活跃，其他时间平静）
    const isActive = (hour >= 6 && hour <= 8) || (hour >= 17 && hour <= 19)
    const gait: ExercisePoint['gait'] = isActive ? gaits[Math.floor(Math.random() * 2)] : (Math.random() > 0.7 ? 'walk' : 'rest')
    const speed = gait === 'run' ? 2.5 + Math.random() * 1.5 : gait === 'trot' ? 1.2 + Math.random() * 0.8 : gait === 'walk' ? 0.5 + Math.random() * 0.7 : Math.random() * 0.2
    points.push({
      ts,
      stepFreq: gait === 'run' ? 120 + Math.round(Math.random() * 40) : gait === 'trot' ? 90 + Math.round(Math.random() * 30) : gait === 'walk' ? baseFreq + Math.round(Math.random() * 30) : Math.round(Math.random() * 10),
      stride: gait === 'run' ? 35 + Math.round(Math.random() * 15) : gait === 'trot' ? 28 + Math.round(Math.random() * 10) : gait === 'walk' ? baseStride + Math.round(Math.random() * 10) : Math.round(Math.random() * 5),
      speed: Math.round(speed * 100) / 100,
      gait,
    })
  }
  return points
}

defineMock([
  // 运动实时状态
  {
    method: 'get',
    path: '/pet/:petId/exercise/summary',
    handler: ({ params }) => {
      const state = exerciseStates[params.petId]
      if (!state) throw new MockError('暂无运动数据', 404)
      // 每次访问微调数据模拟实时变化
      state.stepFreq = Math.max(0, state.stepFreq + Math.round((Math.random() - 0.5) * 6))
      state.speed = Math.max(0, Math.round((state.speed + (Math.random() - 0.5) * 0.2) * 100) / 100)
      state.updatedAt = Date.now()
      return state
    },
  },
  // 运动趋势数据
  {
    method: 'get',
    path: '/pet/:petId/exercise/series',
    handler: ({ params, query }) => {
      const petId = params.petId
      if (!exerciseStates[petId]) throw new MockError('暂无运动数据', 404)
      const days = Number(query.days || 7)
      return { points: generateExerciseSeries(petId, Math.min(days, 30)) }
    },
  },
])

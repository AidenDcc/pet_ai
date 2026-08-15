import type { PetInfo } from '@/types'

const DAY = 86400000

/** 以 ts 为种子的确定性随机（同一天两次生成结果一致） */
export function seeded(seed: number): () => number {
  let t = (seed ^ 0x9e3779b9) >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 由步数推导当日运动指标（物种基线 + 活动强度，确定性生成）
 * stepsMax 用于归一化活动强度：日粒度 12800 步，小时粒度约 620 步
 */
export function dayExercise(
  pet: PetInfo,
  ts: number,
  steps: number,
  stepsMax = 12800,
): { stepFreq: number; stride: number; speed: number; durationMin: number } {
  const isCat = pet.species === 'cat'
  const baseFreq = isCat ? 45 : 80
  const baseStride = isCat ? 16 : 26
  const rnd = seeded(Math.floor(ts / DAY))
  const active = Math.min(1, steps / stepsMax)
  return {
    stepFreq: Math.round(baseFreq + active * 60 + (rnd() * 16 - 8)),
    stride: Number((baseStride + active * 12 + (rnd() * 4 - 2)).toFixed(1)),
    speed: Number((0.3 + active * 1.2 + (rnd() * 0.3 - 0.15)).toFixed(2)),
    durationMin: Math.round(20 + active * 70 + rnd() * 20),
  }
}

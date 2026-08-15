import type { PetInfo } from '@/types'

/**
 * 体征指标正常参考区间（报告详情提示 icon 用）
 * 按物种 / 体型分层，与 aiReport 的评级区间保持一致。
 */
export interface ReferenceRanges {
  temperature: string
  heartRate: string
  spo2: string
  respiratoryRate: string
}

export function referenceRangesOf(pet: PetInfo): ReferenceRanges {
  const dog = pet.species === 'dog'
  const w = pet.weight
  const heart = dog ? (w < 10 ? '90 ~ 140' : w <= 30 ? '70 ~ 120' : '60 ~ 100') : '120 ~ 180'
  const resp = dog ? (w < 10 ? '15 ~ 30' : '10 ~ 25') : '16 ~ 30'
  return {
    temperature: '38.0 ~ 39.2 ℃',
    heartRate: `${heart} 次/分`,
    spo2: '≥ 95 %',
    respiratoryRate: `${resp} 次/分`,
  }
}

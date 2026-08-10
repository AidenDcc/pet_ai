import request from '../request'
import type { HealthMetric, HealthMetricType, NormalRange } from '@/types'

export interface HealthSummary {
  petId: string
  updatedAt: number
  heartRate: { avg: number; max: number; min: number; latest: number }
  respiratoryRate: { latest: number; avg: number }
  spo2: { latest: number; avg: number }
  temperature: { latest: number; avg: number }
  activity: { steps: number; goal: number; percent: number }
  sleep: { hours: number; stage: string }
  overall: string
}

export interface SeriesPoint {
  ts: number
  value: number
}

export function getHealthSummaryApi(petId: string) {
  return request.get<unknown, HealthSummary>(`/health/summary/${petId}`)
}

export function getHealthSeriesApi(petId: string, type: HealthMetricType, days = 1) {
  return request.get<unknown, { points: SeriesPoint[]; unit: string; range: NormalRange | null }>(
    `/health/series/${petId}`,
    { params: { type, days } },
  )
}

export function getHealthTelemetryApi(deviceId: string) {
  return request.get<unknown, { petId: string; points: HealthMetric[] }>(`/health/telemetry/${deviceId}`)
}

export function getHealthRangesApi() {
  return request.get<unknown, Record<string, NormalRange>>('/health/ranges')
}

export function getHealthWeekApi(petId: string) {
  return request.get<unknown, { ts: number; steps: number; sleepHours: number; avgHeartRate: number }[]>(
    `/health/week/${petId}`,
  )
}

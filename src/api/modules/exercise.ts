import request from '../request'
import type { ExerciseState, ExercisePoint } from '@/types'

export type { ExerciseState, ExercisePoint }

export function getExerciseSummaryApi(petId: string) {
  return request.get<unknown, ExerciseState>(`/pet/${petId}/exercise/summary`)
}

export function getExerciseSeriesApi(petId: string, days: number = 7) {
  return request.get<unknown, { points: ExercisePoint[] }>(`/pet/${petId}/exercise/series`, { params: { days } })
}

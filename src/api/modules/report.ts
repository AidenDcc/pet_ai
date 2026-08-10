import request from '../request'
import type { ReportItem } from '@/types'

export interface ReportJoined extends ReportItem {
  petName: string
  petAvatar: string
  species: 'dog' | 'cat'
  doctorName: string | null
}

export function getReportListApi(params?: { petId?: string }) {
  return request.get<unknown, ReportJoined[]>('/report/list', { params })
}

export function getReportApi(id: string) {
  return request.get<unknown, ReportJoined>(`/report/${id}`)
}

export function getReviewListApi() {
  return request.get<unknown, ReportJoined[]>('/report/review-list')
}

export function getAllReportsApi() {
  return request.get<unknown, ReportJoined[]>('/report/all')
}

export function reviewReportApi(id: string, data: { action: 'approve' | 'reject'; comment?: string }) {
  return request.post<unknown, ReportJoined>(`/report/${id}/review`, data)
}

export function generateReportApi(petId: string) {
  return request.post<unknown, ReportJoined>(`/report/generate/${petId}`)
}

import request from '../request'
import type { ReportItem, ReportTrend } from '@/types'

export interface ReportJoined extends ReportItem {
  petName: string
  petAvatar: string
  species: 'dog' | 'cat'
  doctorName: string | null
  /** 宠物主用户 ID */
  ownerId: string
  /** 宠物主昵称 */
  ownerName: string
  /** 宠物主头像 */
  ownerAvatar: string
  /** 报告周期内趋势数据（心率/呼吸率/血氧/体温/卡路里） */
  trend?: ReportTrend
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

/** 运营端：平台全部宠物的历史健康报告（可按宠物过滤） */
export function getAdminReportsApi(params?: { petId?: string }) {
  return request.get<unknown, ReportJoined[]>('/admin/reports', { params })
}

export function reviewReportApi(id: string, data: { action: 'approve' | 'reject'; comment?: string }) {
  return request.post<unknown, ReportJoined>(`/report/${id}/review`, data)
}

export function generateReportApi(petId: string) {
  return request.post<unknown, ReportJoined>(`/report/generate/${petId}`)
}

/** 运营端：按宠物 + 时间段调用 AI 生成健康报告 */
export interface AiGenerateParams {
  startAt: number
  endAt: number
  timeRange: 'day' | 'week' | 'month'
}

export function generateAiReportApi(petId: string, params: AiGenerateParams) {
  return request.post<unknown, ReportJoined>('/admin/report/ai-generate', { petId, ...params })
}

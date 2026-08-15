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

export interface ReportListParams {
  /** 仅返回未读报告 */
  unread?: boolean
  petId?: string
  /** 时间区间起止（毫秒时间戳） */
  from?: number
  to?: number
  /** 评分区间（0-100） */
  minScore?: number
  maxScore?: number
}

export function getReportListApi(params?: ReportListParams) {
  return request.get<unknown, ReportJoined[]>('/report/list', { params })
}

export function getReportApi(id: string) {
  return request.get<unknown, ReportJoined>(`/report/${id}`)
}

/** 标记报告为已读 */
export function markReportReadApi(id: string) {
  return request.post<unknown, { ok: boolean }>(`/report/${id}/read`)
}

/** 医生端：为指定宠物生成报告（占位演示） */
export function generateReportApi(petId: string) {
  return request.post<unknown, ReportJoined>(`/report/generate/${petId}`)
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

/** 按宠物 + 时间段调用 AI 生成健康报告（运营端与宠物端共用生成逻辑） */
export interface AiGenerateParams {
  startAt: number
  endAt: number
  timeRange: 'day' | 'week' | 'month'
}

/** 运营端：手动生成报告 */
export function generateAiReportApi(petId: string, params: AiGenerateParams) {
  return request.post<unknown, ReportJoined>('/admin/report/ai-generate', { petId, ...params })
}

/** 宠物端：手动生成报告 */
export function generateMyReportApi(petId: string, params: AiGenerateParams) {
  return request.post<unknown, ReportJoined>('/report/ai-generate', { petId, ...params })
}

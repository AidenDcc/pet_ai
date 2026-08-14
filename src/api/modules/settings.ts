import request from '../request'
import type { AccountProfile, FeedbackItem } from '@/types'

/** 双语文本（协议 / FAQ 通用） */
export interface BiTextDto {
  zh: string
  en: string
}

export interface FaqItemDto {
  id: string
  question: BiTextDto
  answer: BiTextDto
}

export interface AgreementMetaDto {
  type: string
  title: BiTextDto
}

export interface AgreementDetailDto extends AgreementMetaDto {
  updatedAt: string
  paragraphs: { zh: string[]; en: string[] }
}

export interface VersionInfoDto {
  latest: string
  changeLog: string
}

/** 账号信息（含注册账号） */
export function getProfileApi() {
  return request.get<unknown, AccountProfile>('/user/profile')
}

/** 更新账号信息（可编辑字段：昵称/头像/性别/生日/地区/简介） */
export function updateProfileApi(data: {
  name?: string
  avatar?: string
  gender?: 'male' | 'female'
  birthday?: string
  region?: string
  bio?: string
}) {
  return request.put<unknown, AccountProfile>('/user/profile', data)
}

/** 常见问题（Top 10） */
export function getFaqApi() {
  return request.get<unknown, FaqItemDto[]>('/settings/faq')
}

/** 提交意见反馈 */
export function submitFeedbackApi(data: { subject: string; content: string; images: string[] }) {
  return request.post<unknown, { ok: boolean }>('/settings/feedback', data)
}

/** 意见反馈历史 */
export function getFeedbackHistoryApi() {
  return request.get<unknown, FeedbackItem[]>('/settings/feedback/history')
}

/** 协议列表 */
export function getAgreementsApi() {
  return request.get<unknown, AgreementMetaDto[]>('/settings/agreements')
}

/** 协议详情 */
export function getAgreementApi(type: string) {
  return request.get<unknown, AgreementDetailDto>(`/settings/agreements/${type}`)
}

/** 版本检查（返回最新版本与更新日志） */
export function checkVersionApi() {
  return request.get<unknown, VersionInfoDto>('/settings/version')
}

/** 注销账号（移除当前用户信息） */
export function cancelAccountApi() {
  return request.post<unknown, { ok: boolean }>('/user/cancel-account')
}

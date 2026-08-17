import request from '../request'
import type {
  Consultation,
  ConsultationExerciseSnapshot,
  ConsultationHealthSnapshot,
  ConsultationMedicine,
  ConsultationReply,
  DoctorBrief,
  HealthMetric,
  PetInfo,
  UserInfo,
  VetInfo,
} from '@/types'

/** 宠物主侧：自己发起的问诊记录（含宠物、医生名与最新回复） */
export interface ConsultationMine extends Consultation {
  pet: PetInfo | null
  vetName: string | null
  lastReply: ConsultationReply | null
}

/** 问诊详情（宠物主 / 医生侧共用） */
export interface ConsultationDetail extends Consultation {
  pet: PetInfo | null
  vet: VetInfo | null
  owner: UserInfo | null
}

export function getMyConsultationsApi() {
  return request.get<unknown, ConsultationMine[]>('/consultation/mine')
}

export function getConsultationApi(id: string) {
  return request.get<unknown, ConsultationDetail>(`/consultation/${id}`)
}

/** 可选医生列表（宠物主推送用） */
export function getDoctorsApi() {
  return request.get<unknown, DoctorBrief[]>('/doctor/list')
}

/** 医生详情（基本信息 + 评分 + 宠主评价） */
export function getDoctorDetailApi(id: string) {
  return request.get<unknown, VetInfo>(`/doctor/${id}`)
}

/** 医生端：当前登录医生的档案（医院 / 职称 / 擅长 / 评分 / 接诊统计） */
export function getDoctorMeApi() {
  return request.get<unknown, VetInfo>('/doctor/me')
}

/** 宠物主提交咨询（内容 / 图片 / 体征与运动快照） */
export function pushConsultationApi(data: {
  petId: string
  doctorId: string
  note?: string
  images?: string[]
  healthSnapshot?: ConsultationHealthSnapshot | null
  exerciseSnapshot?: ConsultationExerciseSnapshot | null
}) {
  return request.post<unknown, Consultation>('/consultation/push', data)
}

/** 医生端：回复问诊（内容 + 推荐用药） */
export function replyConsultationApi(id: string, data: { content: string; medicines: ConsultationMedicine[] }) {
  return request.post<unknown, Consultation>(`/consultation/${id}/reply`, data)
}

/** 医生端：我收到的问诊宠物列表（含宠物、主人、问诊备注与最新体征） */
export interface ConsultationJoined extends Consultation {
  pet: PetInfo
  owner: UserInfo | null
  latest: HealthMetric | null
}

export function getDoctorConsultationsApi() {
  return request.get<unknown, ConsultationJoined[]>('/doctor/consultations')
}

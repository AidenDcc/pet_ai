import request from '../request'
import type { Consultation, DoctorBrief, HealthMetric, PetInfo, UserInfo } from '@/types'

/** 宠物主侧：自己发起的问诊记录（含宠物与医生名） */
export interface ConsultationMine extends Consultation {
  pet: PetInfo | null
  vetName: string | null
}

export function getMyConsultationsApi() {
  return request.get<unknown, ConsultationMine[]>('/consultation/mine')
}

/** 可选医生列表（宠物主推送用） */
export function getDoctorsApi() {
  return request.get<unknown, DoctorBrief[]>('/doctor/list')
}

/** 宠物主将宠物健康数据推送给某医生 */
export function pushConsultationApi(data: { petId: string; doctorId: string; note?: string }) {
  return request.post<unknown, Consultation>('/consultation/push', data)
}

/** 医生端：我收到的问诊宠物列表（含宠物、主人、问诊备注与最新体征） */
export interface ConsultationJoined {
  id: string
  petId: string
  pet: PetInfo
  owner: UserInfo | null
  doctorId: string
  status: Consultation['status']
  pushedAt: number
  note: string | null
  latest: HealthMetric | null
}

export function getDoctorConsultationsApi() {
  return request.get<unknown, ConsultationJoined[]>('/doctor/consultations')
}

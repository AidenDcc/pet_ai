import request from '../request'
import type { AdminBiData, DoctorBiData } from '@/types'

/** 运营端 BI：平台经营维度 */
export function getAdminBiApi() {
  return request.get<unknown, AdminBiData>('/admin/bi')
}

/** 医生端 BI：诊所维度 */
export function getDoctorBiApi() {
  return request.get<unknown, DoctorBiData>('/doctor/bi')
}

import request from '../request'
import type {
  AdminBiDeviceData,
  AdminBiHospitalData,
  AdminBiMonitorData,
  AdminBiPetData,
  DoctorBiData,
} from '@/types'

/** 运营监控 BI */
export function getAdminBiMonitorApi() {
  return request.get<unknown, AdminBiMonitorData>('/admin/bi/monitor')
}

/** 设备报表 BI */
export function getAdminBiDeviceApi() {
  return request.get<unknown, AdminBiDeviceData>('/admin/bi/device')
}

/** 宠物监控 BI */
export function getAdminBiPetApi() {
  return request.get<unknown, AdminBiPetData>('/admin/bi/pet')
}

/** 宠物医院 BI */
export function getAdminBiHospitalApi() {
  return request.get<unknown, AdminBiHospitalData>('/admin/bi/hospital')
}

/** 医生端 BI：诊所维度 */
export function getDoctorBiApi() {
  return request.get<unknown, DoctorBiData>('/doctor/bi')
}

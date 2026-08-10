import request from '../request'
import type { PageQuery, PageResult, PetInfo, UserInfo, DeviceInfo } from '@/types'

export interface PetJoined extends PetInfo {
  ownerName: string
  device: DeviceInfo | null
}

export interface PetDetail extends PetJoined {
  owner: UserInfo | null
}

export interface PatientRow extends PetJoined {
  owner: UserInfo
  latestStatus: string
}

export function getMyPetsApi() {
  return request.get<unknown, PetJoined[]>('/pet/list')
}

export function getPetApi(id: string) {
  return request.get<unknown, PetJoined>(`/pet/${id}`)
}

export function updatePetApi(id: string, data: Partial<PetInfo>) {
  return request.put<unknown, PetJoined>(`/pet/${id}`, data)
}

export function createPetApi(data: Omit<PetInfo, 'id' | 'createdAt' | 'ownerId' | 'deviceId' | 'microchip' | 'avatar'>) {
  return request.post<unknown, PetJoined>('/pet', data)
}

export function deletePetApi(id: string) {
  return request.delete<unknown, null>(`/pet/${id}`)
}

export function getAdminPetsApi(params: Partial<PageQuery> & { species?: string }) {
  return request.get<unknown, PageResult<PetJoined>>('/admin/pets', { params })
}

export function getDoctorPatientsApi(params: Partial<PageQuery>) {
  return request.get<unknown, PageResult<PatientRow>>('/doctor/patients', { params })
}

export function getPetDetailApi(id: string) {
  return request.get<unknown, PetDetail>(`/pet/detail/${id}`)
}

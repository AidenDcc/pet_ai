import request from '../request'
import type { PetFence } from '@/types'

export type { PetFence }

export function getFencesApi(petId: string) {
  return request.get<unknown, PetFence[]>(`/pet/${petId}/fences`)
}

export function createFenceApi(petId: string, data: { name: string; center: { lat: number; lng: number }; radius: number; enabled?: boolean; type?: 'fixed' | 'dynamic' }) {
  return request.post<unknown, PetFence>(`/pet/${petId}/fence`, data)
}

export function updateFenceApi(petId: string, fenceId: string, data: { name?: string; center?: { lat: number; lng: number }; radius?: number; enabled?: boolean; type?: 'fixed' | 'dynamic' }) {
  return request.put<unknown, PetFence>(`/pet/${petId}/fence/${fenceId}`, data)
}

export function deleteFenceApi(petId: string, fenceId: string) {
  return request.delete<unknown, { ok: boolean }>(`/pet/${petId}/fence/${fenceId}`)
}

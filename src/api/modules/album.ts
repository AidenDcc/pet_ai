import request from '../request'
import type { AlbumMedia } from '@/types'

export function getAlbumApi(petId: string) {
  return request.get<unknown, AlbumMedia[]>(`/album/${petId}`)
}

export function addAlbumMediaApi(data: {
  petId: string
  url: string
  type?: 'image' | 'video'
  poster?: string
  duration?: number
}) {
  return request.post<unknown, AlbumMedia>('/album', data)
}

/** 回收站列表（已删除、待清除的媒体） */
export function getAlbumTrashApi() {
  return request.get<unknown, AlbumMedia[]>('/album/trash/list')
}

/** 移入回收站（软删除） */
export function trashAlbumMediaApi(id: string) {
  return request.post<unknown, { ok: boolean }>(`/album/${id}/trash`)
}

/** 从回收站恢复 */
export function restoreAlbumMediaApi(id: string) {
  return request.post<unknown, { ok: boolean }>(`/album/${id}/restore`)
}

/** 彻底删除 */
export function deleteAlbumMediaApi(id: string) {
  return request.delete<unknown, { ok: boolean }>(`/album/${id}`)
}

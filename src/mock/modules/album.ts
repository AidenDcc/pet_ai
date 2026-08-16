import type { AlbumMedia } from '@/types'
import { defineMock, MockError, requireUser, uid } from '../helper'
import { albumMedia, albumMediaOf, albumTrashOf, purgeExpiredAlbumTrash, findAlbumMediaById, findPetById } from '../db'

/** 校验某条相册媒体归属当前用户，返回该媒体（无权/不存在则抛错） */
function requireOwnMedia(ctx: { params: Record<string, string> }, user: ReturnType<typeof requireUser>): AlbumMedia {
  const media = findAlbumMediaById(ctx.params.id)
  if (!media) throw new MockError('媒体不存在', 404)
  const pet = findPetById(media.petId)
  if (!pet || pet.ownerId !== user.id) throw new MockError('无权操作该媒体', 403)
  return media
}

defineMock([
  // 某宠物的相册媒体列表（宠物主端）
  {
    method: 'get',
    path: '/album/:petId',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const pet = findPetById(ctx.params.petId)
      if (!pet) throw new MockError('宠物不存在', 404)
      if (pet.ownerId !== user.id) throw new MockError('无权访问该宠物相册', 403)
      return albumMediaOf(pet.id)
    },
  },
  // 回收站列表（惰性清理过期项后返回当前用户的全部软删除媒体）
  {
    method: 'get',
    path: '/album/trash/list',
    handler: (ctx) => {
      const user = requireUser(ctx)
      purgeExpiredAlbumTrash()
      return albumTrashOf(user.petIds)
    },
  },
  // 新增相册媒体（当前仅支持照片上传）
  {
    method: 'post',
    path: '/album',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const body = (ctx.body ?? {}) as {
        petId?: string
        url?: string
        type?: 'image' | 'video'
        poster?: string
        duration?: number
      }
      const pet = body.petId ? findPetById(body.petId) : undefined
      if (!pet) throw new MockError('宠物不存在', 404)
      if (pet.ownerId !== user.id) throw new MockError('无权操作该宠物相册', 403)
      if (!body.url) throw new MockError('缺少媒体内容')
      const item: AlbumMedia = {
        id: uid('al'),
        petId: pet.id,
        type: body.type ?? 'image',
        url: body.url,
        poster: body.poster,
        duration: body.duration,
        createdAt: Date.now(),
      }
      albumMedia.unshift(item)
      return item
    },
  },
  // 移入回收站（软删除）
  {
    method: 'post',
    path: '/album/:id/trash',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const media = requireOwnMedia(ctx, user)
      if (!media.deletedAt) media.deletedAt = Date.now()
      return { ok: true }
    },
  },
  // 从回收站恢复
  {
    method: 'post',
    path: '/album/:id/restore',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const media = requireOwnMedia(ctx, user)
      media.deletedAt = undefined
      return { ok: true }
    },
  },
  // 彻底删除
  {
    method: 'delete',
    path: '/album/:id',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const media = requireOwnMedia(ctx, user)
      const idx = albumMedia.indexOf(media)
      if (idx >= 0) albumMedia.splice(idx, 1)
      return { ok: true }
    },
  },
])

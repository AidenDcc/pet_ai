import request from '../request'
import type {
  CommunityComment,
  CommunityPost,
  PageQuery,
  PageResult,
  PostStatus,
  PostVisibility,
  PostVideo,
  PostAttachment,
} from '@/types'

export interface PostJoined extends CommunityPost {
  authorName: string
  authorAvatar: string
  memberLevel: string
  memberColor: string
  followed: boolean
  liked: boolean
}

export interface CommunityCommentJoined extends CommunityComment {
  authorName: string
  authorAvatar: string
}

export interface PostDetail extends PostJoined {
  comments: CommunityCommentJoined[]
}

export interface CommunityFeedQuery extends Partial<PageQuery> {
  scope: 'all' | 'follow'
}

/** 帖子流（宠物圈 / 关注萌宠，支持搜索分页） */
export function getCommunityFeedApi(params: CommunityFeedQuery) {
  return request.get<unknown, PageResult<PostJoined>>('/community/feed', { params })
}

/** 帖子详情（含评论列表） */
export function getCommunityPostApi(id: string) {
  return request.get<unknown, PostDetail>(`/community/post/${id}`)
}

/** 关注 / 取消关注某发布者（toggle） */
export function toggleCommunityFollowApi(targetId: string) {
  return request.post<unknown, { followed: boolean }>('/community/follow', { targetId })
}

/** 点赞 / 取消点赞（toggle，返回最新计数） */
export function toggleCommunityLikeApi(postId: string) {
  return request.post<unknown, { liked: boolean; likeCount: number }>('/community/like', { postId })
}

/** 发表评论 */
export function addCommunityCommentApi(postId: string, content: string) {
  return request.post<unknown, CommunityCommentJoined>('/community/comment', { postId, content })
}

/** 发布 / 保存草稿载荷 */
export interface CommunityPostPayload {
  /** 关联宠物（可选） */
  petId?: string
  caption: string
  images?: string[]
  video?: PostVideo
  attachments?: PostAttachment[]
  status: PostStatus
}

/** 发布新帖子（或保存草稿） */
export function createCommunityPostApi(data: CommunityPostPayload) {
  return request.post<unknown, PostJoined>('/community/post', data)
}

/** 编辑帖子（继续编辑草稿后保存 / 发布） */
export function updateCommunityPostApi(id: string, data: CommunityPostPayload) {
  return request.put<unknown, PostJoined>(`/community/post/${id}`, data)
}

/** 我的发布：当前用户全部帖子（草稿 + 已发布） */
export function getMyPostsApi() {
  return request.get<unknown, PostJoined[]>('/community/my-posts')
}

/** 切换帖子可见性（仅已发布） */
export function toggleCommunityPostVisibilityApi(id: string) {
  return request.post<unknown, { visibility: PostVisibility }>(`/community/post/${id}/visibility`)
}

/** 删除帖子（草稿 / 已发布均可） */
export function deleteCommunityPostApi(id: string) {
  return request.delete<unknown, { ok: boolean }>(`/community/post/${id}`)
}

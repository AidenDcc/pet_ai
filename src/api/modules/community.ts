import request from '../request'
import type { CommunityComment, CommunityPost, PageQuery, PageResult } from '@/types'

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

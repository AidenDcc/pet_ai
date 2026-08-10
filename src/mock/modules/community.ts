import { defineMock, MockError, requireUser, filterByKeyword, paginate, uid } from '../helper'
import { communityPosts, communityComments, communityFollows, communityLikes, findUserById, plans } from '../db'
import type { CommunityComment, CommunityPost } from '@/types'

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

/** 组装帖子：作者信息 + 会员等级（复用订阅套餐模型）+ 当前用户关注/点赞状态 */
function joinPost(post: CommunityPost, viewerId: string): PostJoined {
  const author = findUserById(post.authorId)
  const plan = plans.find((p) => p.id === author?.planId)
  return {
    ...post,
    authorName: author?.name ?? '未知用户',
    authorAvatar: author?.avatar ?? '',
    memberLevel: plan?.name ?? '未订阅',
    memberColor: plan?.color ?? '#8e9aad',
    followed: communityFollows.some((f) => f.followerId === viewerId && f.targetId === post.authorId),
    liked: communityLikes.some((l) => l.postId === post.id && l.userId === viewerId),
  }
}

function joinComment(c: CommunityComment): CommunityCommentJoined {
  const author = findUserById(c.authorId)
  return { ...c, authorName: author?.name ?? '未知用户', authorAvatar: author?.avatar ?? '' }
}

defineMock([
  {
    method: 'get',
    path: '/community/feed',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const { scope = 'all', page = 1, pageSize = 6, keyword = '' } = ctx.query as {
        scope?: string
        page?: number
        pageSize?: number
        keyword?: string
      }
      let list = communityPosts
        // 不展示当前用户自己的帖子
        .filter((p) => p.authorId !== user.id)
        // "关注萌宠"仅展示已关注作者的帖子
        .filter(
          (p) =>
            scope !== 'follow' ||
            communityFollows.some((f) => f.followerId === user.id && f.targetId === p.authorId),
        )
        .map((p) => joinPost(p, user.id))
      list = filterByKeyword(list, String(keyword), ['caption', 'petName', 'authorName'])
      list.sort((a, b) => b.createdAt - a.createdAt)
      return paginate(list, Number(page), Number(pageSize))
    },
  },
  {
    method: 'get',
    path: '/community/post/:id',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const post = communityPosts.find((p) => p.id === ctx.params.id)
      if (!post) throw new MockError('帖子不存在', 404)
      const comments = communityComments
        .filter((c) => c.postId === post.id)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(joinComment)
      return { ...joinPost(post, user.id), comments }
    },
  },
  {
    method: 'post',
    path: '/community/follow',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const { targetId } = (ctx.body ?? {}) as { targetId?: string }
      if (!targetId || targetId === user.id) throw new MockError('关注对象不正确')
      if (!findUserById(targetId)) throw new MockError('用户不存在', 404)
      const idx = communityFollows.findIndex((f) => f.followerId === user.id && f.targetId === targetId)
      if (idx !== -1) {
        communityFollows.splice(idx, 1)
        return { followed: false }
      }
      communityFollows.push({ followerId: user.id, targetId })
      return { followed: true }
    },
  },
  {
    method: 'post',
    path: '/community/like',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const { postId } = (ctx.body ?? {}) as { postId?: string }
      const post = communityPosts.find((p) => p.id === postId)
      if (!post || !postId) throw new MockError('帖子不存在', 404)
      const idx = communityLikes.findIndex((l) => l.postId === postId && l.userId === user.id)
      if (idx !== -1) {
        communityLikes.splice(idx, 1)
        post.likeCount = Math.max(0, post.likeCount - 1)
        return { liked: false, likeCount: post.likeCount }
      }
      communityLikes.push({ postId, userId: user.id })
      post.likeCount += 1
      return { liked: true, likeCount: post.likeCount }
    },
  },
  {
    method: 'post',
    path: '/community/comment',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const { postId, content } = (ctx.body ?? {}) as { postId?: string; content?: string }
      const post = communityPosts.find((p) => p.id === postId)
      if (!post || !postId) throw new MockError('帖子不存在', 404)
      const text = String(content ?? '').trim()
      if (!text) throw new MockError('评论内容不能为空')
      const c: CommunityComment = {
        id: uid('cmt'),
        postId,
        authorId: user.id,
        content: text,
        createdAt: Date.now(),
      }
      communityComments.push(c)
      post.commentCount += 1
      return joinComment(c)
    },
  },
])

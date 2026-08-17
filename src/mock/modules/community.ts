import { defineMock, MockError, requireUser, filterByKeyword, paginate, uid } from '../helper'
import { communityPosts, communityComments, communityFollows, communityLikes, findUserById, findPetById, plans } from '../db'
import type {
  CommunityComment,
  CommunityPost,
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

/** 发布 / 更新帖子载荷（草稿与发布共用） */
export interface PostPayload {
  petId?: string
  caption?: string
  images?: string[]
  video?: PostVideo
  attachments?: PostAttachment[]
  status?: PostStatus
}

/** 校验并规范化载荷，把内容写回目标帖子（新建 / 编辑共用） */
function applyPostPayload(post: CommunityPost, body: PostPayload, user: ReturnType<typeof requireUser>) {
  const caption = String(body.caption ?? '').trim()
  const status: PostStatus = body.status === 'draft' ? 'draft' : 'published'
  const images = (body.images ?? []).filter(Boolean)
  const hasContent = caption || images.length || body.video?.url || body.video?.poster || body.attachments?.length
  if (status === 'published' && !caption) throw new MockError('请先输入分享内容')
  if (!hasContent) throw new MockError('内容为空，无法保存')

  // 关联宠物（可选）：校验归属并回填宠物名
  let petId: string | undefined
  let petName = ''
  if (body.petId) {
    const pet = findPetById(body.petId)
    if (!pet) throw new MockError('宠物不存在', 404)
    if (pet.ownerId !== user.id) throw new MockError('无权关联该宠物', 403)
    petId = pet.id
    petName = pet.name
  }

  post.petId = petId
  post.petName = petName
  post.caption = caption
  post.images = images
  post.video = body.video
  post.attachments = body.attachments
  post.status = status
  // 发布时对外可见（隐藏由「我的发布」页单独切换）
  if (status === 'published' && post.visibility !== 'hidden') post.visibility = 'visible'
}

/** 校验帖子归属当前用户，返回该帖子 */
function requireOwnPost(ctx: { params: Record<string, string> }, user: ReturnType<typeof requireUser>): CommunityPost {
  const post = communityPosts.find((p) => p.id === ctx.params.id)
  if (!post) throw new MockError('帖子不存在', 404)
  if (post.authorId !== user.id) throw new MockError('无权操作该帖子', 403)
  return post
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
        // 仅展示已发布且对外可见的帖子（草稿 / 隐藏帖不出现在宠圈）
        .filter((p) => p.status === 'published' && p.visibility === 'visible')
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
  // 发布新帖子（或保存草稿）
  {
    method: 'post',
    path: '/community/post',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const body = (ctx.body ?? {}) as PostPayload
      const post: CommunityPost = {
        id: uid('post'),
        authorId: user.id,
        petName: '',
        caption: '',
        images: [],
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        createdAt: Date.now(),
        status: 'published',
        visibility: 'visible',
      }
      applyPostPayload(post, body, user)
      communityPosts.unshift(post)
      return joinPost(post, user.id)
    },
  },
  // 编辑帖子（继续编辑草稿后保存 / 发布）
  {
    method: 'put',
    path: '/community/post/:id',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const post = requireOwnPost(ctx, user)
      applyPostPayload(post, (ctx.body ?? {}) as PostPayload, user)
      return joinPost(post, user.id)
    },
  },
  // 我的发布：当前用户的全部帖子（草稿 + 已发布，含可见性）
  {
    method: 'get',
    path: '/community/my-posts',
    handler: (ctx) => {
      const user = requireUser(ctx)
      return communityPosts
        .filter((p) => p.authorId === user.id)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((p) => joinPost(p, user.id))
    },
  },
  // 切换帖子可见性（仅已发布帖子）
  {
    method: 'post',
    path: '/community/post/:id/visibility',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const post = requireOwnPost(ctx, user)
      if (post.status !== 'published') throw new MockError('草稿暂不支持设置可见性')
      post.visibility = post.visibility === 'visible' ? 'hidden' : 'visible'
      return { visibility: post.visibility as PostVisibility }
    },
  },
  // 删除帖子（草稿 / 已发布均可，同时清理点赞与评论）
  {
    method: 'delete',
    path: '/community/post/:id',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const post = requireOwnPost(ctx, user)
      const idx = communityPosts.indexOf(post)
      if (idx >= 0) communityPosts.splice(idx, 1)
      for (let i = communityLikes.length - 1; i >= 0; i--) {
        if (communityLikes[i].postId === post.id) communityLikes.splice(i, 1)
      }
      for (let i = communityComments.length - 1; i >= 0; i--) {
        if (communityComments[i].postId === post.id) communityComments.splice(i, 1)
      }
      return { ok: true }
    },
  },
])

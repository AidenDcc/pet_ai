import { defineMock, MockError, requireUser, uid } from '../helper'
import { publicUser, users, tokenUsers, pets, health, telemetry, dailyAgg, tracks, trackHistory } from '../db'
import { SETTINGS_FAQS, SETTINGS_AGREEMENTS } from '../data/settingsContent'
import type { FeedbackItem, UserInfo } from '@/types'

/** 意见反馈：内存态，按用户存储（仿 notification mock，session 内生效） */
const feedbackMap = new Map<string, FeedbackItem[]>()

/** 账号信息可编辑字段（account/id/role 拒写） */
const PROFILE_EDITABLE = ['name', 'avatar', 'gender', 'birthday', 'region', 'bio'] as const

const LATEST_VERSION = 'v0.2.0'
const VERSION_CHANGE_LOG = '新增设置中心：账号信息、意见反馈、服务与隐私，并修复若干已知问题、优化性能表现。'

defineMock([
  // 账号信息（注册账号在 publicUser 中被剥离，需补回）
  {
    method: 'get',
    path: '/user/profile',
    handler: (ctx) => {
      const user = requireUser(ctx)
      return { ...publicUser(user), account: user.account }
    },
  },
  // 更新账号信息（仅更新可编辑字段，其余忽略）
  {
    method: 'put',
    path: '/user/profile',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const patch = (ctx.body ?? {}) as Record<string, unknown>
      const next: Partial<UserInfo> = {}
      for (const key of PROFILE_EDITABLE) {
        const v = patch[key]
        if (v !== undefined) (next as Record<string, unknown>)[key] = v
      }
      Object.assign(user, next)
      return { ...publicUser(user), account: user.account }
    },
  },
  // 常见问题（Top 10，双语）
  {
    method: 'get',
    path: '/settings/faq',
    handler: () => SETTINGS_FAQS,
  },
  // 提交意见反馈
  {
    method: 'post',
    path: '/settings/feedback',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const { subject, content, images } = (ctx.body ?? {}) as {
        subject?: string
        content?: string
        images?: string[]
      }
      if (!subject || !subject.trim()) throw new MockError('请填写主题', 1001)
      if (!content || !content.trim()) throw new MockError('请填写描述', 1002)
      const list = feedbackMap.get(user.id) ?? []
      list.unshift({
        id: uid('fb'),
        subject: subject.trim(),
        content: content.trim(),
        images: images ?? [],
        status: 'pending',
        createdAt: Date.now(),
      })
      feedbackMap.set(user.id, list)
      return { ok: true }
    },
  },
  // 意见反馈历史
  {
    method: 'get',
    path: '/settings/feedback/history',
    handler: (ctx) => {
      const user = requireUser(ctx)
      return feedbackMap.get(user.id) ?? []
    },
  },
  // 服务与隐私：协议列表（仅 type + 标题）
  {
    method: 'get',
    path: '/settings/agreements',
    handler: () => SETTINGS_AGREEMENTS.map(({ type, title }) => ({ type, title })),
  },
  // 协议详情（双语正文）
  {
    method: 'get',
    path: '/settings/agreements/:type',
    handler: ({ params }) => {
      const item = SETTINGS_AGREEMENTS.find((a) => a.type === params.type)
      if (!item) throw new MockError('协议不存在', 404)
      return item
    },
  },
  // 版本检查（current 取前端 APP_VERSION）
  {
    method: 'get',
    path: '/settings/version',
    handler: () => ({ latest: LATEST_VERSION, changeLog: VERSION_CHANGE_LOG }),
  },
  // 注销账号：移除用户及其宠物档案与绑定令牌（法律要求保留的数据 180 天后彻底删除，由前端文案提示）
  {
    method: 'post',
    path: '/user/cancel-account',
    handler: (ctx) => {
      const user = requireUser(ctx)
      if (user.role !== 'user') throw new MockError('当前账号暂不支持自助注销', 1030)
      // 清理该用户的登录令牌，防止残留 token 复活
      for (const tk of Object.keys(tokenUsers)) {
        if (tokenUsers[tk] === user.id) delete tokenUsers[tk]
      }
      // 同步移除其宠物档案与关联的体征 / 轨迹数据
      const removedPetIds = pets.filter((p) => p.ownerId === user.id).map((p) => p.id)
      for (let i = pets.length - 1; i >= 0; i--) {
        if (pets[i].ownerId === user.id) pets.splice(i, 1)
      }
      for (const id of removedPetIds) {
        delete health[id]
        delete telemetry[id]
        delete dailyAgg[id]
        delete tracks[id]
        delete trackHistory[id]
      }
      // 从用户表移除（注销完成，之后该账号无法再登录）
      const idx = users.findIndex((u) => u.id === user.id)
      if (idx >= 0) users.splice(idx, 1)
      return { ok: true }
    },
  },
])

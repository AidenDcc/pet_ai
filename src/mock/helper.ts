import type { Role } from '@/types'
import type { DbUser } from './db'

/** Mock 业务异常：抛出后在适配层转为 code!=0 的响应包 */
export class MockError extends Error {
  code: number
  constructor(message: string, code = 1) {
    super(message)
    this.name = 'MockError'
    this.code = code
  }
}

export interface MockContext {
  /** 路径参数 /device/:id => { id } */
  params: Record<string, string>
  /** query 参数 */
  query: Record<string, unknown>
  /** POST/PUT body */
  body: unknown
  headers: Record<string, string>
  /** 由 Authorization token 解析出的当前用户 */
  user?: DbUser
}

export type MockHandler = (ctx: MockContext) => unknown

interface MockRoute {
  method: string
  path: string
  handler: MockHandler
}

const routes: MockRoute[] = []

export function defineMock(routeList: MockRoute[]): void {
  routes.push(...routeList)
}

/** 按 method + path 模板匹配路由，支持 :param */
export function resolveMock(method: string, url: string): { handler: MockHandler; params: Record<string, string> } | null {
  const segs = url.split('/').filter(Boolean)
  for (const r of routes) {
    if (r.method !== method) continue
    const rsegs = r.path.split('/').filter(Boolean)
    if (rsegs.length !== segs.length) continue
    const params: Record<string, string> = {}
    let matched = true
    for (let i = 0; i < rsegs.length; i++) {
      if (rsegs[i].startsWith(':')) {
        params[rsegs[i].slice(1)] = decodeURIComponent(segs[i])
      } else if (rsegs[i] !== segs[i]) {
        matched = false
        break
      }
    }
    if (matched) return { handler: r.handler, params }
  }
  return null
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 模拟网络延迟 */
export const randomDelay = (): number => 150 + Math.random() * 350

/** 生成 id */
export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

export function requireUser(ctx: MockContext): DbUser {
  if (!ctx.user) throw new MockError('请先登录', 401)
  return ctx.user
}

export function requireRole(ctx: MockContext, role: Role): DbUser {
  const user = requireUser(ctx)
  if (user.role !== role) throw new MockError('无权限访问', 403)
  return user
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 整数随机 [min, max] */
export function rand(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min))
}

/** 浮点随机，可指定小数位 */
export function randFloat(min: number, max: number, digits = 1): number {
  return Number((min + Math.random() * (max - min)).toFixed(digits))
}

/** 分页切分 */
export function paginate<T>(list: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  return {
    list: list.slice(start, start + pageSize),
    total: list.length,
    page,
    pageSize,
  }
}

/** 简单模糊过滤 */
export function filterByKeyword<T>(list: T[], keyword: string, keys: (keyof T)[]): T[] {
  if (!keyword) return list
  const kw = keyword.toLowerCase()
  return list.filter((item) => keys.some((k) => String(item[k]).toLowerCase().includes(kw)))
}

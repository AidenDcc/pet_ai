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

/** 报告编号自增序号（同一天内连续递增） */
let reportSeq = 0

/** 生成报告编号：RPT-YYYYMMDD-序号 */
export function reportNo(): string {
  reportSeq += 1
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `RPT-${ymd}-${String(reportSeq).padStart(4, '0')}`
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

/** 演示用：根据经纬度生成上海市区模拟物理地址（省市区 + 道路门牌） */
export function mockAddress(lat: number, lng: number): string {
  const districts = [
    '浦东新区张江高科园区',
    '徐汇区徐家汇街道',
    '杨浦区五角场街道',
    '静安区南京西路街道',
    '黄浦区外滩街道',
    '长宁区中山公园街道',
    '普陀区长寿路街道',
    '闵行区莘庄镇',
  ]
  const roads = ['世纪大道', '张江路', '桂林路', '南京东路', '陆家嘴环路', '中山南路', '虹桥路', '莘建路']
  const district = districts[Math.abs(Math.round(lat * 1000 + lng * 1000)) % districts.length]
  const road = roads[Math.abs(Math.round(lng * 1000)) % roads.length]
  const no = 1 + (Math.abs(Math.round(lat * 10000)) % 998)
  return `上海市${district}${road}${no}号`
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

import request from '../request'
import type {
  DictItem,
  DictType,
  LoginLog,
  PageQuery,
  PageResult,
  SysMenu,
  SysRole,
  SysUser,
  Terminal,
} from '@/types'

/* ==================== 系统用户 ==================== */
export interface SysUserRow extends SysUser {
  roleName: string
}
export function getSystemUsersApi(params: Partial<PageQuery>) {
  return request.get<unknown, PageResult<SysUserRow>>('/admin/system/users', { params })
}
export function createSystemUserApi(data: Partial<SysUser>) {
  return request.post<unknown, SysUserRow>('/admin/system/users', data)
}
export function updateSystemUserApi(id: string, data: Partial<SysUser>) {
  return request.put<unknown, SysUserRow>(`/admin/system/user/${id}`, data)
}
export function deleteSystemUserApi(id: string) {
  return request.delete<unknown, { ok: true }>(`/admin/system/user/${id}`)
}

/* ==================== 角色管理 ==================== */
export interface SysRoleRow extends SysRole {
  menuCount: number
}
export function getSystemRolesApi(params: Partial<PageQuery>) {
  return request.get<unknown, PageResult<SysRoleRow>>('/admin/system/roles', { params })
}
export function createSystemRoleApi(data: Partial<SysRole>) {
  return request.post<unknown, SysRoleRow>('/admin/system/roles', data)
}
export function updateSystemRoleApi(id: string, data: Partial<SysRole>) {
  return request.put<unknown, SysRoleRow>(`/admin/system/role/${id}`, data)
}
export function deleteSystemRoleApi(id: string) {
  return request.delete<unknown, { ok: true }>(`/admin/system/role/${id}`)
}

/* ==================== 菜单管理 ==================== */
export function getSystemMenusApi(params?: { keyword?: string; type?: string; status?: string }) {
  return request.get<unknown, SysMenu[]>('/admin/system/menus', { params })
}
export function createSystemMenuApi(data: Partial<SysMenu>) {
  return request.post<unknown, SysMenu>('/admin/system/menus', data)
}
export function updateSystemMenuApi(id: string, data: Partial<SysMenu>) {
  return request.put<unknown, SysMenu>(`/admin/system/menu/${id}`, data)
}
export function deleteSystemMenuApi(id: string) {
  return request.delete<unknown, { ok: true }>(`/admin/system/menu/${id}`)
}

/* ==================== 数据字典 ==================== */
export interface DictTypeRow extends DictType {
  itemCount: number
}
export function getDictTypesApi(params: Partial<PageQuery>) {
  return request.get<unknown, PageResult<DictTypeRow>>('/admin/system/dict/types', { params })
}
export function createDictTypeApi(data: Partial<DictType>) {
  return request.post<unknown, DictTypeRow>('/admin/system/dict/types', data)
}
export function updateDictTypeApi(id: string, data: Partial<DictType>) {
  return request.put<unknown, DictTypeRow>(`/admin/system/dict/type/${id}`, data)
}
export function deleteDictTypeApi(id: string) {
  return request.delete<unknown, { ok: true }>(`/admin/system/dict/type/${id}`)
}
export function getDictItemsApi(typeId: string) {
  return request.get<unknown, DictItem[]>('/admin/system/dict/items', { params: { typeId } })
}
export function createDictItemApi(data: Partial<DictItem>) {
  return request.post<unknown, DictItem>('/admin/system/dict/items', data)
}
export function updateDictItemApi(id: string, data: Partial<DictItem>) {
  return request.put<unknown, DictItem>(`/admin/system/dict/item/${id}`, data)
}
export function deleteDictItemApi(id: string) {
  return request.delete<unknown, { ok: true }>(`/admin/system/dict/item/${id}`)
}

/* ==================== 登录日志 ==================== */
export function getSystemLogsApi(params: Partial<PageQuery>) {
  return request.get<unknown, PageResult<LoginLog>>('/admin/system/logs', { params })
}
export function deleteSystemLogApi(id: string) {
  return request.delete<unknown, { ok: true }>(`/admin/system/log/${id}`)
}
export function clearSystemLogsApi() {
  return request.delete<unknown, { ok: true }>('/admin/system/logs/clear')
}

/* ==================== 终端管理 ==================== */
export function getTerminalsApi() {
  return request.get<unknown, Terminal[]>('/admin/system/terminals')
}
export function createTerminalApi(data: Partial<Terminal>) {
  return request.post<unknown, Terminal>('/admin/system/terminals', data)
}
export function updateTerminalApi(id: string, data: Partial<Terminal>) {
  return request.put<unknown, Terminal>(`/admin/system/terminal/${id}`, data)
}
export function deleteTerminalApi(id: string) {
  return request.delete<unknown, { ok: true }>(`/admin/system/terminal/${id}`)
}

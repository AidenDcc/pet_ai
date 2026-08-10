import { defineMock, MockError, paginate, filterByKeyword, requireRole, uid } from '../helper'
import { sysUsers, sysRoles, sysMenus, dictTypes, dictItems, loginLogs, terminals } from '../db'
import type { DictItem, DictType, LoginLog, SysMenu, SysRole, SysUser, Terminal } from '@/types'

/** 菜单表数据组装为嵌套树（按 sort 排序） */
function buildMenuTree(source: SysMenu[], parentId: string | null = null): SysMenu[] {
  return source
    .filter((m) => m.parentId === parentId)
    .sort((a, b) => a.sort - b.sort)
    .map((m) => ({ ...m, children: buildMenuTree(source, m.id) }))
}

/** 过滤后保留仍含子节点的父级，避免树出现空目录 */
function filterMenuTree(nodes: SysMenu[]): SysMenu[] {
  const res: SysMenu[] = []
  for (const n of nodes) {
    const children = filterMenuTree(n.children ?? [])
    if (n.type === 'button') {
      res.push({ ...n, children: undefined })
    } else if (children.length > 0 || (n.type === 'menu' && !n.children?.length)) {
      res.push({ ...n, children: children.length ? children : undefined })
    }
  }
  return res
}

defineMock([
  /* ==================== 系统用户 ==================== */
  {
    method: 'get',
    path: '/admin/system/users',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const { page = 1, pageSize = 10, keyword = '', status = 'all' } = ctx.query as {
        page?: number
        pageSize?: number
        keyword?: string
        status?: string
      }
      let list = [...sysUsers]
      if (status !== 'all') list = list.filter((u) => u.status === status)
      list = filterByKeyword(list, String(keyword), ['username', 'name', 'phone', 'email'])
      const joined = list.map((u) => ({
        ...u,
        roleName: sysRoles.find((r) => r.id === u.roleId)?.name ?? '',
      }))
      return paginate(joined, Number(page), Number(pageSize))
    },
  },
  {
    method: 'post',
    path: '/admin/system/users',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const body = (ctx.body ?? {}) as Partial<SysUser>
      const username = String(body.username ?? '').trim()
      if (!username) throw new MockError('账号不能为空')
      if (sysUsers.some((u) => u.username === username)) throw new MockError('账号已存在')
      const u: SysUser = {
        id: uid('su'),
        username,
        name: String(body.name ?? '').trim(),
        roleId: String(body.roleId ?? ''),
        phone: String(body.phone ?? ''),
        email: String(body.email ?? ''),
        status: body.status === 'disabled' ? 'disabled' : 'active',
        lastLoginAt: null,
        createdAt: Date.now(),
      }
      sysUsers.push(u)
      return { ...u, roleName: sysRoles.find((r) => r.id === u.roleId)?.name ?? '' }
    },
  },
  {
    method: 'put',
    path: '/admin/system/user/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const u = sysUsers.find((x) => x.id === ctx.params.id)
      if (!u) throw new MockError('系统用户不存在', 404)
      const patch = (ctx.body ?? {}) as Partial<SysUser>
      const { username, name, roleId, phone, email, status } = patch
      if (typeof username === 'string' && username !== u.username && sysUsers.some((x) => x.username === username))
        throw new MockError('账号已存在')
      Object.assign(u, {
        username: username ?? u.username,
        name: name ?? u.name,
        roleId: roleId ?? u.roleId,
        phone: phone ?? u.phone,
        email: email ?? u.email,
        status: status ?? u.status,
      })
      return { ...u, roleName: sysRoles.find((r) => r.id === u.roleId)?.name ?? '' }
    },
  },
  {
    method: 'delete',
    path: '/admin/system/user/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const idx = sysUsers.findIndex((x) => x.id === ctx.params.id)
      if (idx === -1) throw new MockError('系统用户不存在', 404)
      sysUsers.splice(idx, 1)
      return { ok: true }
    },
  },

  /* ==================== 角色管理 ==================== */
  {
    method: 'get',
    path: '/admin/system/roles',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const { page = 1, pageSize = 10, keyword = '', status = 'all' } = ctx.query as {
        page?: number
        pageSize?: number
        keyword?: string
        status?: string
      }
      let list = [...sysRoles]
      if (status !== 'all') list = list.filter((r) => r.status === status)
      list = filterByKeyword(list, String(keyword), ['name', 'code', 'remark'])
      const joined = list.map((r) => ({ ...r, menuCount: r.menuIds.length }))
      return paginate(joined, Number(page), Number(pageSize))
    },
  },
  {
    method: 'post',
    path: '/admin/system/roles',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const body = (ctx.body ?? {}) as Partial<SysRole>
      const code = String(body.code ?? '').trim()
      if (!String(body.name ?? '').trim()) throw new MockError('角色名称不能为空')
      if (!code) throw new MockError('角色标识不能为空')
      if (sysRoles.some((r) => r.code === code)) throw new MockError('角色标识已存在')
      const r: SysRole = {
        id: uid('r'),
        name: String(body.name).trim(),
        code,
        sort: Number(body.sort ?? 0),
        status: body.status === 'disabled' ? 'disabled' : 'active',
        remark: String(body.remark ?? ''),
        menuIds: Array.isArray(body.menuIds) ? body.menuIds : [],
        createdAt: Date.now(),
      }
      sysRoles.push(r)
      return { ...r, menuCount: r.menuIds.length }
    },
  },
  {
    method: 'put',
    path: '/admin/system/role/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const r = sysRoles.find((x) => x.id === ctx.params.id)
      if (!r) throw new MockError('角色不存在', 404)
      const patch = (ctx.body ?? {}) as Partial<SysRole>
      if (typeof patch.code === 'string' && patch.code !== r.code && sysRoles.some((x) => x.code === patch.code))
        throw new MockError('角色标识已存在')
      Object.assign(r, {
        name: patch.name ?? r.name,
        code: patch.code ?? r.code,
        sort: patch.sort ?? r.sort,
        status: patch.status ?? r.status,
        remark: patch.remark ?? r.remark,
        menuIds: Array.isArray(patch.menuIds) ? patch.menuIds : r.menuIds,
      })
      return { ...r, menuCount: r.menuIds.length }
    },
  },
  {
    method: 'delete',
    path: '/admin/system/role/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const idx = sysRoles.findIndex((x) => x.id === ctx.params.id)
      if (idx === -1) throw new MockError('角色不存在', 404)
      sysRoles.splice(idx, 1)
      return { ok: true }
    },
  },

  /* ==================== 菜单管理 ==================== */
  {
    method: 'get',
    path: '/admin/system/menus',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const { keyword = '', type = 'all', status = 'all' } = ctx.query as {
        keyword?: string
        type?: string
        status?: string
      }
      let list = [...sysMenus]
      if (type !== 'all') list = list.filter((m) => m.type === type)
      if (status !== 'all') list = list.filter((m) => m.status === status)
      list = filterByKeyword(list, String(keyword), ['name', 'perm', 'path'])
      const tree = buildMenuTree(list)
      const hasFilter = type !== 'all' || status !== 'all' || Boolean(keyword)
      // 无筛选时返回完整树；有筛选时剔除被筛空的多级父节点
      return hasFilter ? filterMenuTree(tree) : tree
    },
  },
  {
    method: 'post',
    path: '/admin/system/menus',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const body = (ctx.body ?? {}) as Partial<SysMenu>
      if (!String(body.name ?? '').trim()) throw new MockError('菜单名称不能为空')
      const m: SysMenu = {
        id: uid('m'),
        parentId: body.parentId || null,
        name: String(body.name).trim(),
        type: (body.type as SysMenu['type']) ?? 'menu',
        icon: String(body.icon ?? ''),
        path: String(body.path ?? ''),
        perm: String(body.perm ?? ''),
        sort: Number(body.sort ?? 0),
        visible: body.visible !== false,
        status: body.status === 'disabled' ? 'disabled' : 'active',
      }
      sysMenus.push(m)
      return m
    },
  },
  {
    method: 'put',
    path: '/admin/system/menu/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const m = sysMenus.find((x) => x.id === ctx.params.id)
      if (!m) throw new MockError('菜单不存在', 404)
      const patch = (ctx.body ?? {}) as Partial<SysMenu>
      // 校验不能把父级设成自身或其子级，防止环
      if (patch.parentId) {
        let cur: SysMenu | undefined = sysMenus.find((x) => x.id === patch.parentId)
        while (cur) {
          if (cur.id === m.id) throw new MockError('不能将父级设置为自身或其子菜单')
          cur = cur.parentId ? sysMenus.find((x) => x.id === cur!.parentId) : undefined
        }
      }
      Object.assign(m, {
        parentId: 'parentId' in patch ? (patch.parentId || null) : m.parentId,
        name: patch.name ?? m.name,
        type: patch.type ?? m.type,
        icon: patch.icon ?? m.icon,
        path: patch.path ?? m.path,
        perm: patch.perm ?? m.perm,
        sort: patch.sort ?? m.sort,
        visible: patch.visible ?? m.visible,
        status: patch.status ?? m.status,
      })
      return m
    },
  },
  {
    method: 'delete',
    path: '/admin/system/menu/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const idx = sysMenus.findIndex((x) => x.id === ctx.params.id)
      if (idx === -1) throw new MockError('菜单不存在', 404)
      if (sysMenus.some((x) => x.parentId === ctx.params.id))
        throw new MockError('存在子菜单，无法删除')
      sysMenus.splice(idx, 1)
      return { ok: true }
    },
  },

  /* ==================== 数据字典 ==================== */
  {
    method: 'get',
    path: '/admin/system/dict/types',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const { page = 1, pageSize = 10, keyword = '' } = ctx.query as {
        page?: number
        pageSize?: number
        keyword?: string
      }
      let list = [...dictTypes]
      list = filterByKeyword(list, String(keyword), ['name', 'type', 'remark'])
      const joined = list.map((t) => ({
        ...t,
        itemCount: dictItems.filter((i) => i.typeId === t.id).length,
      }))
      return paginate(joined, Number(page), Number(pageSize))
    },
  },
  {
    method: 'post',
    path: '/admin/system/dict/types',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const body = (ctx.body ?? {}) as Partial<DictType>
      const type = String(body.type ?? '').trim()
      if (!String(body.name ?? '').trim()) throw new MockError('字典名称不能为空')
      if (!type) throw new MockError('字典类型不能为空')
      if (dictTypes.some((t) => t.type === type)) throw new MockError('字典类型已存在')
      const t: DictType = { id: uid('dt'), name: String(body.name).trim(), type, remark: String(body.remark ?? ''), createdAt: Date.now() }
      dictTypes.push(t)
      return { ...t, itemCount: 0 }
    },
  },
  {
    method: 'put',
    path: '/admin/system/dict/type/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const t = dictTypes.find((x) => x.id === ctx.params.id)
      if (!t) throw new MockError('字典类型不存在', 404)
      const patch = (ctx.body ?? {}) as Partial<DictType>
      if (typeof patch.type === 'string' && patch.type !== t.type && dictTypes.some((x) => x.type === patch.type))
        throw new MockError('字典类型已存在')
      Object.assign(t, {
        name: patch.name ?? t.name,
        type: patch.type ?? t.type,
        remark: patch.remark ?? t.remark,
      })
      return { ...t, itemCount: dictItems.filter((i) => i.typeId === t.id).length }
    },
  },
  {
    method: 'delete',
    path: '/admin/system/dict/type/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const idx = dictTypes.findIndex((x) => x.id === ctx.params.id)
      if (idx === -1) throw new MockError('字典类型不存在', 404)
      dictTypes.splice(idx, 1)
      for (let i = dictItems.length - 1; i >= 0; i--) {
        if (dictItems[i].typeId === ctx.params.id) dictItems.splice(i, 1)
      }
      return { ok: true }
    },
  },
  {
    method: 'get',
    path: '/admin/system/dict/items',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const { typeId = '' } = ctx.query as { typeId?: string }
      return dictItems
        .filter((i) => !typeId || i.typeId === typeId)
        .sort((a, b) => a.sort - b.sort)
    },
  },
  {
    method: 'post',
    path: '/admin/system/dict/items',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const body = (ctx.body ?? {}) as Partial<DictItem>
      const typeId = String(body.typeId ?? '')
      if (!typeId || !dictTypes.some((t) => t.id === typeId)) throw new MockError('字典类型不存在', 404)
      if (!String(body.label ?? '').trim() || !String(body.value ?? '').trim())
        throw new MockError('标签与值不能为空')
      if (dictItems.some((i) => i.typeId === typeId && i.value === body.value))
        throw new MockError('字典值已存在')
      const item: DictItem = {
        id: uid('di'),
        typeId,
        label: String(body.label).trim(),
        value: String(body.value).trim(),
        sort: Number(body.sort ?? 0),
        status: body.status === 'disabled' ? 'disabled' : 'active',
      }
      dictItems.push(item)
      return item
    },
  },
  {
    method: 'put',
    path: '/admin/system/dict/item/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const item = dictItems.find((x) => x.id === ctx.params.id)
      if (!item) throw new MockError('字典项不存在', 404)
      const patch = (ctx.body ?? {}) as Partial<DictItem>
      if (patch.value && item.value !== patch.value && dictItems.some((i) => i.typeId === item.typeId && i.value === patch.value))
        throw new MockError('字典值已存在')
      Object.assign(item, {
        label: patch.label ?? item.label,
        value: patch.value ?? item.value,
        sort: patch.sort ?? item.sort,
        status: patch.status ?? item.status,
      })
      return item
    },
  },
  {
    method: 'delete',
    path: '/admin/system/dict/item/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const idx = dictItems.findIndex((x) => x.id === ctx.params.id)
      if (idx === -1) throw new MockError('字典项不存在', 404)
      dictItems.splice(idx, 1)
      return { ok: true }
    },
  },

  /* ==================== 登录日志 ==================== */
  {
    method: 'get',
    path: '/admin/system/logs',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const { page = 1, pageSize = 10, keyword = '', status = 'all' } = ctx.query as {
        page?: number
        pageSize?: number
        keyword?: string
        status?: string
      }
      let list: LoginLog[] = [...loginLogs]
      if (status !== 'all') list = list.filter((l) => l.status === status)
      list = filterByKeyword(list, String(keyword), ['username', 'ip', 'location'])
      return paginate(list, Number(page), Number(pageSize))
    },
  },
  {
    method: 'delete',
    path: '/admin/system/log/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const idx = loginLogs.findIndex((x) => x.id === ctx.params.id)
      if (idx === -1) throw new MockError('日志不存在', 404)
      loginLogs.splice(idx, 1)
      return { ok: true }
    },
  },
  {
    method: 'delete',
    path: '/admin/system/logs/clear',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      loginLogs.length = 0
      return { ok: true }
    },
  },

  /* ==================== 终端管理 ==================== */
  {
    method: 'get',
    path: '/admin/system/terminals',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      return [...terminals]
    },
  },
  {
    method: 'post',
    path: '/admin/system/terminals',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const body = (ctx.body ?? {}) as Partial<Terminal>
      const code = String(body.code ?? '').trim()
      if (!String(body.name ?? '').trim()) throw new MockError('终端名称不能为空')
      if (!code) throw new MockError('终端标识不能为空')
      if (terminals.some((t) => t.code === code)) throw new MockError('终端标识已存在')
      const t: Terminal = {
        id: uid('tm'),
        name: String(body.name).trim(),
        code,
        type: (body.type as Terminal['type']) ?? 'app',
        latestVersion: String(body.latestVersion ?? ''),
        downloadUrl: String(body.downloadUrl ?? ''),
        status: body.status === 'disabled' ? 'disabled' : 'active',
        remark: String(body.remark ?? ''),
        updatedAt: Date.now(),
      }
      terminals.push(t)
      return t
    },
  },
  {
    method: 'put',
    path: '/admin/system/terminal/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const t = terminals.find((x) => x.id === ctx.params.id)
      if (!t) throw new MockError('终端不存在', 404)
      const patch = (ctx.body ?? {}) as Partial<Terminal>
      if (typeof patch.code === 'string' && patch.code !== t.code && terminals.some((x) => x.code === patch.code))
        throw new MockError('终端标识已存在')
      Object.assign(t, {
        name: patch.name ?? t.name,
        code: patch.code ?? t.code,
        type: patch.type ?? t.type,
        latestVersion: patch.latestVersion ?? t.latestVersion,
        downloadUrl: patch.downloadUrl ?? t.downloadUrl,
        status: patch.status ?? t.status,
        remark: patch.remark ?? t.remark,
        updatedAt: Date.now(),
      })
      return t
    },
  },
  {
    method: 'delete',
    path: '/admin/system/terminal/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const idx = terminals.findIndex((x) => x.id === ctx.params.id)
      if (idx === -1) throw new MockError('终端不存在', 404)
      terminals.splice(idx, 1)
      return { ok: true }
    },
  },
])

import type { Role } from '@/types'

/** 角色名（i18n key） */
export const ROLE_LABEL: Record<Role, string> = {
  user: 'role.user',
  doctor: 'role.doctor',
  admin: 'role.admin',
}

export const HOME_PATH: Record<Role, string> = {
  user: '/user/home',
  doctor: '/doctor/dashboard',
  admin: '/admin/dashboard',
}

/** 物种（i18n key） */
export const SPECIES_LABEL: Record<'dog' | 'cat', string> = {
  dog: 'species.dog',
  cat: 'species.cat',
}

export const SPECIES_ICON: Record<'dog' | 'cat', string> = {
  dog: '🐶',
  cat: '🐱',
}

/** 性别（i18n key） */
export const GENDER_LABEL: Record<'male' | 'female', string> = {
  male: 'gender.male',
  female: 'gender.female',
}

/** Vant 的 van-tag 不支持 'info'，需要映射为 'default'（Element 端保留 'info'） */
export type VantTagType = 'default' | 'primary' | 'success' | 'warning' | 'danger'
export function toVantTagType(tag: string): VantTagType {
  if (tag === 'info') return 'default'
  return tag as VantTagType
}

type TagLevel = 'success' | 'info' | 'warning' | 'danger' | 'primary'

export interface LabeledTag {
  labelKey: string
  tag: TagLevel
}

export const DEVICE_STATUS: Record<string, LabeledTag> = {
  online: { labelKey: 'status.online', tag: 'success' },
  offline: { labelKey: 'status.offline', tag: 'info' },
  'low-power': { labelKey: 'status.lowPower', tag: 'warning' },
  unbound: { labelKey: 'status.unbound', tag: 'danger' },
}

export const ORDER_STATUS: Record<string, LabeledTag> = {
  pending: { labelKey: 'status.pending', tag: 'warning' },
  paid: { labelKey: 'status.paid', tag: 'success' },
  expired: { labelKey: 'status.expired', tag: 'info' },
  refunded: { labelKey: 'status.refunded', tag: 'danger' },
}

export const CERT_STATUS: Record<string, LabeledTag> = {
  pending: { labelKey: 'status.pendingReview', tag: 'warning' },
  approved: { labelKey: 'status.certified', tag: 'success' },
  rejected: { labelKey: 'status.rejected', tag: 'danger' },
}

/** 登录页演示账号 */
export const DEMO_ACCOUNTS: {
  role: Role
  labelKey: string
  account: string
  password: string
  descKey: string
  emoji: string
}[] = [
  {
    role: 'user',
    labelKey: 'login.owner',
    account: 'user',
    password: '123456',
    descKey: 'login.ownerDesc',
    emoji: '🐾',
  },
  {
    role: 'doctor',
    labelKey: 'login.doctor',
    account: 'doctor',
    password: '123456',
    descKey: 'login.doctorDesc',
    emoji: '🩺',
  },
  {
    role: 'admin',
    labelKey: 'login.admin',
    account: 'admin',
    password: '123456',
    descKey: 'login.adminDesc',
    emoji: '📊',
  },
]

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

/** 各端登录页路径（守卫 / 门户 / 登录页跳转共用） */
export const LOGIN_PATH: Record<Role, string> = {
  user: '/user/login',
  doctor: '/doctor/login',
  admin: '/admin/login',
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

/** 远程指令下发的成功反馈（i18n key，按指令值映射） */
export const COMMAND_FEEDBACK: Record<string, string> = {
  find: 'user.devices.cmdFindSent',
  light: 'user.devices.cmdLightSent',
  refresh: 'user.devices.cmdRefreshSent',
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

/** 验证码登录 / 注册 / 找回密码：国际区号列表 */
export interface AreaCode {
  code: string
  name: string
  nameEn: string
}

export const AREA_CODES: AreaCode[] = [
  { code: '+86', name: '中国大陆', nameEn: 'China' },
  { code: '+852', name: '中国香港', nameEn: 'Hong Kong, China' },
  { code: '+853', name: '中国澳门', nameEn: 'Macau, China' },
  { code: '+886', name: '中国台湾', nameEn: 'Taiwan, China' },
  { code: '+1', name: '美国 / 加拿大', nameEn: 'United States / Canada' },
  { code: '+65', name: '新加坡', nameEn: 'Singapore' },
  { code: '+81', name: '日本', nameEn: 'Japan' },
  { code: '+82', name: '韩国', nameEn: 'South Korea' },
  { code: '+44', name: '英国', nameEn: 'United Kingdom' },
  { code: '+61', name: '澳大利亚', nameEn: 'Australia' },
  { code: '+49', name: '德国', nameEn: 'Germany' },
  { code: '+33', name: '法国', nameEn: 'France' },
  { code: '+34', name: '西班牙', nameEn: 'Spain' },
  { code: '+39', name: '意大利', nameEn: 'Italy' },
  { code: '+31', name: '荷兰', nameEn: 'Netherlands' },
  { code: '+46', name: '瑞典', nameEn: 'Sweden' },
  { code: '+52', name: '墨西哥', nameEn: 'Mexico' },
  { code: '+55', name: '巴西', nameEn: 'Brazil' },
]

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
    labelKey: 'role.user',
    account: 'user',
    password: '123456',
    descKey: 'login.demo.owner',
    emoji: '🐾',
  },
  {
    role: 'doctor',
    labelKey: 'role.doctor',
    account: 'doctor',
    password: '123456',
    descKey: 'login.demo.doctor',
    emoji: '🩺',
  },
  {
    role: 'admin',
    labelKey: 'role.admin',
    account: 'admin',
    password: '123456',
    descKey: 'login.demo.admin',
    emoji: '📊',
  },
]

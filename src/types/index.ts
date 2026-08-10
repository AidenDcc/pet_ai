/** 平台三端角色 */
export type Role = 'user' | 'doctor' | 'admin'

/** 宠物主用户 */
export interface UserInfo {
  id: string
  name: string
  phone: string
  avatar: string
  role: Role
  petIds: string[]
  planId: string | null
  planExpireAt: string | null
  registeredAt: string
  status: 'active' | 'disabled'
}

/** 宠物档案 */
export interface PetInfo {
  id: string
  name: string
  species: 'dog' | 'cat'
  breed: string
  gender: 'male' | 'female'
  birthDate: string
  weight: number // kg
  avatar: string
  ownerId: string
  deviceId: string | null
  sterilized: boolean
  microchip: string
  createdAt: string
}

/** 设备在线状态 */
export type DeviceStatus = 'online' | 'offline' | 'low-power' | 'unbound'

/** 电子围栏 */
export interface Geofence {
  center: { lat: number; lng: number }
  radius: number // 米
  enabled: boolean
}

/** Pet-S1 智能项圈设备 */
export interface DeviceInfo {
  id: string
  sn: string
  imei: string
  name: string
  model: 'Pet-S1'
  status: DeviceStatus
  battery: number // 0-100
  firmware: string
  boundPetId: string | null
  ownerId: string | null
  activatedAt: string | null
  geofence: Geofence | null
  lastSyncAt: string
}

/** 生命体征采样点 */
export interface HealthMetric {
  ts: number // epoch ms
  heartRate: number
  respiratoryRate: number
  spo2: number
  temperature: number
  activity: number // 该区间步数
  sleepStage: 'deep' | 'light' | 'awake'
}

/** 健康指标类型 */
export type HealthMetricType =
  | 'heartRate'
  | 'respiratoryRate'
  | 'spo2'
  | 'temperature'
  | 'activity'
  | 'sleep'

/** 指标正常参考区间 */
export interface NormalRange {
  min: number
  max: number
  unit: string
}

/** 异常项 */
export interface AbnormalItem {
  key: string
  label: string
  value: string
  level: 'warn' | 'danger' | 'info'
  suggestion: string
}

/** 健康报告 */
export interface ReportItem {
  id: string
  petId: string
  period: string
  startAt: number
  endAt: number
  score: number // 0-100
  summary: string
  aiConclusion: string
  abnormal: AbnormalItem[]
  metricsSummary: {
    heartRate: { avg: number; max: number; min: number }
    respiratoryRate: { avg: number; max: number; min: number }
    spo2: { avg: number; min: number }
    temperature: { avg: number; max: number; min: number }
    totalActivity: number
    sleepDuration: number // 小时
  }
  doctorId: string | null
  doctorReview: 'pending' | 'approved' | 'rejected' | null
  doctorComment: string | null
  createdAt: number
}

/** 宠物医生 */
export interface VetInfo {
  id: string
  name: string
  hospital: string
  title: string
  avatar: string
  certStatus: 'pending' | 'approved' | 'rejected'
  specialty: string
  phone: string
  petIds: string[]
}

/** 订单状态 */
export type OrderStatus = 'pending' | 'paid' | 'expired' | 'refunded'

/** 订阅订单 */
export interface OrderItem {
  id: string
  orderNo: string
  userId: string
  userName: string
  petId: string | null
  planId: string
  planName: string
  amount: number
  status: OrderStatus
  payMethod: string | null
  createdAt: number
  paidAt: number | null
}

/** 订阅套餐 */
export interface SubscriptionPlan {
  id: string
  name: string
  price: number // 元/年
  durationMonths: number
  features: string[]
  color: string
}

/** 经纬度点 */
export interface GeoPoint {
  lat: number
  lng: number
  ts: number
}

/** 登录结果 */
export interface LoginResult {
  token: string
  user: UserInfo
}

/** 分页请求 */
export interface PageQuery {
  page: number
  pageSize: number
  keyword?: string
  status?: string
}

/** 分页结果 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 通用接口响应包 */
export interface ApiResult<T = unknown> {
  code: number
  data: T
  message: string
}

/* ============================================================
 * 体征上传
 * ============================================================ */

/** 体征上传记录（项圈上报一次完整生命体征） */
export interface UploadRecord {
  id: string
  deviceId: string
  petId: string
  ts: number
  source: 'auto' | 'manual'
  status: 'success' | 'failed'
  metrics: {
    temperature: number
    heartRate: number
    spo2: number
    respiratoryRate: number
  }
}

/* ============================================================
 * 问诊（健康数据推送）
 * ============================================================ */

/** 问诊记录：宠物主将宠物健康数据推送给某医生 */
export interface Consultation {
  id: string
  petId: string
  ownerId: string
  doctorId: string
  status: 'active' | 'closed'
  pushedAt: number
  note: string | null
}

/** 医生简要信息（推送时选择医生） */
export interface DoctorBrief {
  id: string
  name: string
  hospital: string
  title: string
  avatar: string
  specialty: string
}

/* ============================================================
 * 语音助手
 * ============================================================ */

export interface AssistantAction {
  type: 'command' | 'route' | 'none'
  command?: string
  deviceId?: string
  path?: string
}

export interface AssistantReply {
  reply: string
  action: AssistantAction | null
  intent: string
}

/* ============================================================
 * BI 报表
 * ============================================================ */

/** 运营端 BI（平台经营维度） */
export interface AdminBiData {
  kpis: { revenue: number; orders: number; users: number; devices: number }
  revenueTrend: { day: string; revenue: number; orders: number }[]
  planRevenue: { name: string; value: number }[]
  deviceStatus: { name: string; value: number }[]
  abnormalDist: { name: string; value: number }[]
  growthTrend: { day: string; users: number; vets: number }[]
}

/** 医生端 BI（诊所维度） */
export interface DoctorBiData {
  kpis: { patients: number; consults: number; pending: number; monthReports: number }
  petScores: { name: string; score: number }[]
  speciesDist: { name: string; value: number }[]
  abnormalDist: { name: string; value: number }[]
  weeklyReports: { day: string; value: number }[]
  reviewRate: { approved: number; rejected: number; pending: number }
}

/* ============================================================
 * i18n
 * ============================================================ */

/** 国际化词条（运营端可在线配置覆盖） */
export interface I18nEntry {
  key: string
  zh: string
  en: string
  isOverride?: boolean
}

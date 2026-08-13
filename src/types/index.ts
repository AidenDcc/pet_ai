/** 平台三端角色 */
export type Role = 'user' | 'doctor' | 'admin'

/** 宠物主用户 */
export interface UserInfo {
  id: string
  name: string
  phone: string
  /** 邮箱（注册账号可为手机号或邮箱，邮箱注册时非空） */
  email?: string
  avatar: string
  role: Role
  petIds: string[]
  planId: string | null
  planExpireAt: string | null
  registeredAt: string
  status: 'active' | 'disabled'
}

/** 验证码场景：登录 / 注册 / 找回密码 */
export type VerifyScene = 'login' | 'register' | 'reset'

/** 联系方式类型：手机号 / 邮箱 */
export type ContactType = 'phone' | 'email'

/** 疫苗记录 */
export interface VaccineRecord {
  id: string
  name: string
  date: string // yyyy-mm-dd
  note?: string
}

/** 驱虫记录 */
export interface DewormRecord {
  id: string
  name: string
  date: string // yyyy-mm-dd
  note?: string
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
  /** 疫苗记录 */
  vaccines: VaccineRecord[]
  /** 驱虫记录 */
  dewormings: DewormRecord[]
  /** 性格标签（最多 10 个） */
  personalityTags: string[]
}

/** 设备在线状态 */
export type DeviceStatus = 'online' | 'offline' | 'low-power' | 'unbound'

/** 电子围栏 */
export interface Geofence {
  center: { lat: number; lng: number }
  radius: number // 米
  enabled: boolean
}

/** 宠物级电子围栏（可多个） */
export interface PetFence {
  id: string
  petId: string
  name: string
  center: { lat: number; lng: number }
  radius: number
  enabled: boolean
  createdAt: number
  /** 围栏类型：fixed 固定中心点（地图选点）/ dynamic 动态中心点（以手机实时定位为中心，仅一条） */
  type?: 'fixed' | 'dynamic'
  /** 中心点物理地址（省市区，mock 生成，用于列表展示） */
  address?: string
}

/** 运动实时状态 */
export interface ExerciseState {
  stepFreq: number       // 步频 步/分
  stride: number         // 步幅 cm
  gait: 'trot' | 'walk' | 'run' | 'rest'
  speed: number          // 速度 m/s
  updatedAt: number
}

/** 运动趋势数据点 */
export interface ExercisePoint {
  ts: number
  stepFreq: number
  stride: number
  speed: number
  gait: 'trot' | 'walk' | 'run' | 'rest'
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
  signal: number // RSSI 信号强度 dBm（-100 ~ -30）
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
  | 'calorie'

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
  /** 问诊定价（元） */
  consultPrice: number
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

/** 问诊回复中推荐的用药 */
export interface ConsultationMedicine {
  name: string
  usage: string
}

/** 问诊回复（医生端） */
export interface ConsultationReply {
  id: string
  vetId: string
  content: string
  medicines: ConsultationMedicine[]
  repliedAt: number
}

/** 问诊时提交的宠物体征快照 */
export interface ConsultationHealthSnapshot {
  temperature: number
  heartRate: number
  spo2: number
  respiratoryRate: number
  calorie: number
  activityPercent: number
  sleepHours: number
  updatedAt: number
}

/** 问诊时提交的宠物运动快照 */
export interface ConsultationExerciseSnapshot {
  stepFreq: number
  stride: number
  gait: string
  speed: number
  updatedAt: number
}

/** 问诊记录：宠物主将宠物健康数据推送给某医生 */
export interface Consultation {
  id: string
  petId: string
  ownerId: string
  doctorId: string
  status: 'active' | 'closed'
  pushedAt: number
  /** 咨询内容 */
  note: string | null
  /** 宠物主上传的图片（base64 dataURL） */
  images: string[]
  /** 提交时的宠物体征快照 */
  healthSnapshot: ConsultationHealthSnapshot | null
  /** 提交时的宠物运动快照 */
  exerciseSnapshot: ConsultationExerciseSnapshot | null
  /** 医生回复（按时间正序） */
  replies: ConsultationReply[]
}

/** 医生简要信息（推送时选择医生） */
export interface DoctorBrief {
  id: string
  name: string
  hospital: string
  title: string
  avatar: string
  specialty: string
  /** 问诊定价（元） */
  consultPrice: number
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

/* ============================================================
 * 宠屋（宠物社区）
 * ============================================================ */

/** 社区帖子（作者/会员信息由 join 注入） */
export interface CommunityPost {
  id: string
  authorId: string
  petName: string
  caption: string
  images: string[]
  viewCount: number
  likeCount: number
  commentCount: number
  createdAt: number
}

/** 社区评论 */
export interface CommunityComment {
  id: string
  postId: string
  authorId: string
  content: string
  createdAt: number
}

/* ============================================================
 * 系统管理（平台运营端）
 * ============================================================ */

/** 系统用户（平台运营账号） */
export interface SysUser {
  id: string
  username: string // 登录账号
  name: string // 姓名
  roleId: string // 角色
  phone: string
  email: string
  status: 'active' | 'disabled'
  lastLoginAt: number | null
  createdAt: number
}

/** 角色（含菜单权限） */
export interface SysRole {
  id: string
  name: string
  code: string
  sort: number
  status: 'active' | 'disabled'
  remark: string
  menuIds: string[]
  createdAt: number
}

/** 菜单类型：目录 / 菜单 / 按钮 */
export type MenuType = 'dir' | 'menu' | 'button'

/** 平台菜单 */
export interface SysMenu {
  id: string
  parentId: string | null
  name: string
  type: MenuType
  icon: string
  path: string
  perm: string
  sort: number
  visible: boolean
  status: 'active' | 'disabled'
  children?: SysMenu[]
}

/** 字典类型 */
export interface DictType {
  id: string
  name: string
  type: string
  remark: string
  createdAt: number
}

/** 字典项 */
export interface DictItem {
  id: string
  typeId: string
  label: string
  value: string
  sort: number
  status: 'active' | 'disabled'
  /** 扩展值（JSON 串，选填） */
  extValue?: string
}

/** 登录日志 */
export interface LoginLog {
  id: string
  username: string
  ip: string
  location: string
  browser: string
  os: string
  status: 'success' | 'failed'
  message: string
  loginAt: number
}

/** 终端类型 */
export type TerminalType = 'app' | 'h5' | 'mini' | 'pc'

/** 客户端终端 */
export interface Terminal {
  id: string
  name: string
  code: string
  type: TerminalType
  latestVersion: string
  downloadUrl: string
  status: 'active' | 'disabled'
  remark: string
  updatedAt: number
}

/** 平台三端角色 */
export type Role = 'user' | 'doctor' | 'admin'

/** 宠物主用户 */
export interface UserInfo {
  id: string
  name: string
  phone: string
  /** 邮箱（注册账号可为手机号或邮箱，邮箱注册时非空） */
  email?: string
  /** 注册账号（手机号 / 邮箱），登录/刷新会话时由服务端回填 */
  account?: string
  avatar: string
  role: Role
  petIds: string[]
  planId: string | null
  planExpireAt: string | null
  registeredAt: string
  status: 'active' | 'disabled'
  /** 性别（账号信息可编辑） */
  gender?: 'male' | 'female'
  /** 生日 yyyy-mm-dd */
  birthday?: string
  /** 地区 */
  region?: string
  /** 个人简介 */
  bio?: string
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
  /** 是否怀孕 */
  isPregnant: boolean
  /** 是否哺乳期 */
  isLactating: boolean
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
  /** 设备形态：颈环 / 项圈（决定设备图片） */
  type: 'neckring' | 'collar'
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

/** 设备通讯方式 */
export type CommMethod = '4g' | 'ble' | 'wifi'

/** 设备主档案（产线 / 在售 / 已售的全部宠物设备） */
export interface DeviceMaster {
  id: string
  sn: string
  imei: string
  /** 产品名称 */
  productName: string
  /** 品牌 */
  brand: string
  /** 型号 */
  model: string
  /** 资产编号 */
  assetNo: string
  /** 图片 URL */
  imageUrl: string
  /** 一级分类 */
  category1: string
  /** 二级分类 */
  category2: string
  /** 主 Mac 地址 */
  mac: string
  /** 硬件版本 */
  hardwareVersion: string
  /** 固件版本 */
  firmwareVersion: string
  /** 通讯方式（多选） */
  commMethods: CommMethod[]
  /** 各通讯方式对应的 Mac 地址 */
  macByMethod: Partial<Record<CommMethod, string>>
  /** 通讯协议和版本 */
  protocol: string
  /** 颜色 */
  color: string
  /** 出厂日期 YYYY-MM-DD */
  manuDate: string
  /** 注册日期 YYYY-MM-DD */
  registerDate: string
  /** IoT 设备 ID */
  iotDeviceId: string
  /** IoT 设备令牌 */
  iotToken: string
  /** 支持指标（多选） */
  indicators: HealthMetricType[]
  /** 状态：生效 / 失效 */
  status: 'active' | 'inactive'
}

/** 固件包 */
export interface FirmwarePackage {
  id: string
  /** 固件包名称 */
  name: string
  /** 版本号 */
  version: string
  /** 支持产品型号 */
  supportModels: string[]
  /** 支持分类 */
  supportCategories: string[]
  /** 发布日期 YYYY-MM-DD */
  releaseDate: string
  /** 发布状态 */
  status: 'published' | 'unpublished'
  /** 文件大小（字节） */
  fileSize: number
  /** 固件包文件名 */
  fileName: string
  /** 升级设备数 */
  upgradedCount: number
  /** 固件包说明 */
  description: string
}

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
  /** 报告编号（系统自动生成） */
  reportNo: string
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
  /** 分析时间粒度：day 单日 / week 近7天 / month 近30天 */
  timeRange?: 'day' | 'week' | 'month'
  /** 报告生成方式：ai 调用 AI 生成 / offline AI 不可达时本地规则引擎兜底 */
  source?: 'ai' | 'offline'
  /** 综合健康评级 A/B/C/D */
  grade?: 'A' | 'B' | 'C' | 'D'
  /** AI 生成的详细报告全文（Markdown） */
  reportDetail?: string
  /** 周期内运动数据汇总（AI 报告用） */
  exerciseSummary?: {
    /** 周期总步数 */
    totalActivity: number
    /** 日均步数 */
    dailyActivity: number
    /** 步频中位数 步/分 */
    stepFreq: number
    /** 步幅中位数 cm */
    stride: number
    /** 速度中位数 m/s */
    speed: number
    /** 日均有效运动时长（分钟） */
    exerciseDurationMin: number
  }
  /** 与上一周期比较（当前 - 上期；正=上升 负=下降） */
  compare?: {
    temperature: number
    heartRate: number
    spo2: number
    respiratoryRate: number
    stepFreq: number
    stride: number
    speed: number
    calorie: number
  }
  /** 体征指标正常参考区间（详情页提示 icon） */
  referenceRanges?: {
    temperature: string
    heartRate: string
    spo2: string
    respiratoryRate: string
  }
  /** 建议清单（AI 报告结论） */
  recommendations?: string[]
  /** 就医提示（AI 报告结论） */
  vetReferral?: {
    needed: boolean
    urgency: 'routine' | 'urgent' | 'emergency'
    warning: string
    suggestedExams: string[]
  }
  doctorId: string | null
  doctorReview: 'pending' | 'approved' | 'rejected' | null
  doctorComment: string | null
  /** 用户已读时间（未读为 null） */
  readAt: number | null
  createdAt: number
}

/** 报告周期内各体征/卡路里趋势点位 */
export interface ReportTrend {
  heartRate: { ts: number; value: number }[]
  respiratoryRate: { ts: number; value: number }[]
  spo2: { ts: number; value: number }[]
  temperature: { ts: number; value: number }[]
  calorie: { ts: number; value: number }[]
  stepFreq: { ts: number; value: number }[]
  stride: { ts: number; value: number }[]
  speed: { ts: number; value: number }[]
}

/** 宠主对医生的评价 */
export interface DoctorReview {
  id: string
  /** 宠主昵称 */
  userName: string
  /** 宠主头像 */
  avatar: string
  /** 5 分制打分（如 5 / 4.5） */
  score: number
  /** 评价内容 */
  content: string
  /** 评价标签（如 专业 / 耐心 / 回复快） */
  tags: string[]
  /** 评价时间 */
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
  /** 科室 */
  department: string
  /** 好评率（%） */
  rating: number
  /** 累计接诊数 */
  consultCount: number
  /** 平均等待时间（分钟） */
  avgWaitTime: number
  /** 个人简介 */
  bio: string
  /** 职业证书编号（实名认证） */
  certNo: string
  /** 擅长疾病描述（医生推荐列表） */
  specialtyDesc: string
  /** 接诊物种（狗狗/猫咪） */
  species: ('dog' | 'cat')[]
  /** 5 分制评分 */
  score: number
  /** 月回答数 */
  monthlyAnswers: number
  /** 月处方数 */
  monthlyPrescriptions: number
  /** 荣誉标签 */
  honors: string[]
  /** 图文问诊价（元） */
  priceText: number
  /** 电话问诊价（元） */
  pricePhone: number
  /** 宠主评价（医生详情页） */
  reviews: DoctorReview[]
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

/** 账号信息（含注册账号，仅通过 /user/profile 返回） */
export interface AccountProfile extends UserInfo {
  /** 注册账号（手机号 / 邮箱） */
  account: string
}

/** 意见反馈条目 */
export interface FeedbackItem {
  id: string
  subject: string
  content: string
  images: string[]
  status: 'pending' | 'processed'
  createdAt: number
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
  /** 擅长疾病描述（医生推荐列表第四行长文本） */
  specialtyDesc: string
  /** 执业证书编号（第二行） */
  certNo: string
  /** 接诊物种（第三行：狗狗/猫咪） */
  species: ('dog' | 'cat')[]
  /** 5 分制评分（第五行，如 4.9） */
  score: number
  /** 月回答数（第五行） */
  monthlyAnswers: number
  /** 月处方数（第五行） */
  monthlyPrescriptions: number
  /** 荣誉标签（第六行：技术院长 / 业内专家 / 211 院校…） */
  honors: string[]
  /** 图文问诊价（左下角） */
  priceText: number
  /** 电话问诊价（左下角） */
  pricePhone: number
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
 * BI 报表（平台运营端 · 运营监控 / 设备 / 宠物 / 医院）
 * ============================================================ */

/** 报表顶部统计指标：数值 + 较上周/上月环比增量 */
export interface BiKpi {
  /** 指标名 i18n key */
  labelKey: string
  value: number
  /** 单位 i18n key（无单位时省略） */
  unit?: string
  /** 较上一周期变化百分比（正=增，负=降，0=持平），如 12.5 表示 +12.5% */
  deltaPct: number
  /** 对比周期：week 较上周 / month 较上月 */
  period: 'week' | 'month'
}

/** 省份/名称 → 数值 的排行项（地图与排行图表通用） */
export interface BiProvinceValue {
  name: string
  value: number
}

/** 运营监控报表 */
export interface AdminBiMonitorData {
  kpis: BiKpi[]
  /** 30 天每日活跃用户数与注册用户数 */
  userTrend: { day: string; dau: number; newUsers: number }[]
  /** 30 天每日活跃设备数与激活设备数 */
  deviceTrend: { day: string; active: number; activated: number }[]
  /** 各省区激活设备数 */
  provinceDevices: BiProvinceValue[]
  /** 用户留存：7日/15日/1月/3月/半年 */
  retention: { labelKey: string; value: number }[]
  /** 宠物健康指标告警（轮播） */
  alerts: { id: string; petName: string; content: string; level: 'warn' | 'danger'; time: number }[]
  /** 宠物医院线上问诊数排行 */
  hospitalConsultRank: BiProvinceValue[]
}

/** 设备报表 */
export interface AdminBiDeviceData {
  kpis: BiKpi[]
  /** 30 天每天新增设备数与设备总数 */
  newTrend: { day: string; newDevices: number; totalDevices: number }[]
  /** 30 天设备在线数与平均使用时长（分钟） */
  onlineTrend: { day: string; online: number; avgDuration: number }[]
  /** 异常设备列表 */
  abnormalDevices: {
    id: string
    sn: string
    name: string
    petName: string
    /** 异常类型 i18n key */
    typeKey: string
    detail: string
    lastSyncAt: number
  }[]
}

/** 宠物监控报表 */
export interface AdminBiPetData {
  kpis: BiKpi[]
  /** 猫/狗分布 */
  speciesDist: BiProvinceValue[]
  /** top10 城市宠物数 */
  cityRank: BiProvinceValue[]
  /** 每日监测体征异常宠物数 */
  abnormalDaily: { day: string; value: number }[]
  /** 异常指标 top 排行 */
  abnormalTop: BiProvinceValue[]
  /** 每天在线宠物平均体征 */
  avgVitals: {
    day: string
    temperature: number
    heartRate: number
    spo2: number
    respiratoryRate: number
    calorie: number
  }[]
  /** 宠物运动指标趋势 */
  exerciseTrend: { day: string; steps: number; activeMin: number; sleep: number }[]
  /** 异常宠物列表 */
  abnormalPets: {
    id: string
    petName: string
    ownerName: string
    species: string
    /** 异常指标 i18n key */
    metricKey: string
    detail: string
    updatedAt: number
    level: 'warn' | 'danger'
  }[]
}

/** 宠物医院报表 */
export interface AdminBiHospitalData {
  kpis: BiKpi[]
  /** 医院合作方式分布 */
  cooperationDist: BiProvinceValue[]
  /** 各省合作宠物医院数 */
  provinceHospitals: BiProvinceValue[]
  /** 30 天每天问诊数/办结数/响应时长（分钟） */
  consultTrend: { day: string; consults: number; resolved: number; responseMin: number }[]
  /** 点赞优秀医院 top10 */
  likeHospitals: BiProvinceValue[]
  /** 点赞优秀医生 top10 */
  likeDoctors: BiProvinceValue[]
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

/** 帖子状态：草稿 / 已发布 */
export type PostStatus = 'draft' | 'published'

/** 帖子可见性：对外可见 / 对外隐藏（仅已发布帖子生效） */
export type PostVisibility = 'visible' | 'hidden'

/** 帖子可关联的数据类型：健康报告 / 运动轨迹 / 体征数据 / 运动数据 */
export type PostAttachmentType = 'report' | 'track' | 'vitals' | 'exercise'

/** 帖子视频（单个） */
export interface PostVideo {
  url: string
  poster?: string
  duration?: number
}

/** 帖子关联的宠物健康数据（健康报告 / 轨迹 / 体征 / 运动） */
export interface PostAttachment {
  type: PostAttachmentType
  petId: string
  petName: string
  title: string
  summary: string
  /** 关联对象 id（如报告 id） */
  refId?: string
}

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
  /** 状态：draft 草稿 / published 已发布 */
  status: PostStatus
  /** 可见性（仅已发布生效）：visible 对外可见 / hidden 对外隐藏 */
  visibility: PostVisibility
  /** 关联宠物（可选，不关联则为空） */
  petId?: string
  /** 单个视频（可选） */
  video?: PostVideo
  /** 关联的宠物健康数据（可选） */
  attachments?: PostAttachment[]
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
 * 消息中心（宠物主端）
 * ============================================================ */

/** 消息分类：健康消息 / 宠圈消息 / 系统消息 / 问诊消息（医生端） */
export type MessageCategory = 'health' | 'community' | 'system' | 'consultation'

/** 消息附带的宠物体征信息 */
export interface MessagePetVitals {
  petName: string
  petAvatar: string
  breed: string
  temperature: number
  heartRate: number
  spo2: number
  respiratoryRate: number
}

/** 消息中心消息 */
export interface MessageItem {
  id: string
  userId: string
  category: MessageCategory
  /** 主题 */
  title: string
  /** 发送人 */
  sender: string
  /** 列表摘要（简约内容） */
  summary: string
  /** 详情正文 */
  content: string
  /** 详情配图 */
  images: string[]
  /** 附带的宠物体征信息（健康消息等分享体征时非空） */
  petVitals?: MessagePetVitals
  /** 已读时间（未读为 null） */
  readAt: number | null
  createdAt: number
}

/** 各分类未读消息数 */
export interface MessageUnread {
  total: number
  health: number
  community: number
  system: number
  consultation: number
}

/* ============================================================
 * 萌宠相册（宠物主端）
 * ============================================================ */

/** 相册媒体项（图片 / 视频） */
export interface AlbumMedia {
  id: string
  petId: string
  type: 'image' | 'video'
  /** 图片为 dataURI；视频为播放 src（种子无真实源，仅展示海报） */
  url: string
  /** 视频海报（dataURI） */
  poster?: string
  /** 视频时长（秒） */
  duration?: number
  createdAt: number
  /** 软删除时间戳（进入回收站的时间）；为空表示未删除 */
  deletedAt?: number
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

import type {
  Consultation,
  DeviceInfo,
  GeoPoint,
  HealthMetric,
  OrderItem,
  PetInfo,
  ReportItem,
  SubscriptionPlan,
  UploadRecord,
  UserInfo,
  VetInfo,
} from '@/types'
import { pick, rand, randFloat, uid } from './helper'

/** 数据库中的用户（含密码，仅 mock 使用） */
export interface DbUser extends UserInfo {
  password: string
  account: string
}

/* ============================================================
 * 订阅套餐
 * ============================================================ */
export const plans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: '基础版',
    price: 99,
    durationMonths: 12,
    color: '#8e9aad',
    features: ['实时定位追踪', '电子围栏 x1', '基础健康监测', '月度健康报告'],
  },
  {
    id: 'pro',
    name: '专业版',
    price: 299,
    durationMonths: 12,
    color: '#00b4a6',
    features: [
      '包含基础版全部功能',
      '24h 全指标健康监测',
      'AI 智能健康分析',
      '医生在线问诊',
      '周度健康报告',
      '电子围栏 x3',
    ],
  },
  {
    id: 'premium',
    name: '尊享版',
    price: 599,
    durationMonths: 12,
    color: '#ff9500',
    features: [
      '包含专业版全部功能',
      '专属宠物医生',
      '深度 AI 疾病预警',
      '无限电子围栏',
      '实物体检报告',
    ],
  },
]

/* ============================================================
 * 数据池
 * ============================================================ */
const userFirstNames = ['林', '陈', '王', '李', '张', '赵', '刘', '周', '吴', '郑', '孙', '钱']
const userGivenNames = ['悦', '一诺', '子涵', '雨桐', '浩然', '思远', '嘉欣', '泽宇', '若曦', '俊杰', '可欣', '铭宇']
const petNames = ['布丁', '雪球', '豆豆', '可乐', '团子', '毛球', '旺财', '奶茶', '年糕', '糯米', '橘子', '煤球', '汤圆', '饺子', '果冻', '阿福', '米粒', '贝贝']
const dogBreeds = ['柯基', '金毛', '边牧', '柴犬', '泰迪', '哈士奇', '萨摩耶', '拉布拉多']
const catBreeds = ['布偶猫', '英短', '美短', '橘猫', '蓝猫', '暹罗猫', '狸花猫', '中华田园猫']
const avatarBg = ['#00b4a6', '#5b8ff9', '#ff9f43', '#ff6b6b', '#7d6bff', '#2bcbba', '#fd9644']

function avatarOf(name: string): string {
  // 用纯色底 + 首字的 emoji 占位（避免外链图片）
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="${pick(avatarBg)}"/><text x="48" y="62" font-size="40" text-anchor="middle" fill="#fff" font-family="sans-serif">${name.slice(0, 1)}</text></svg>`,
  )}`
}

/* ============================================================
 * 用户
 * ============================================================ */
export const users: DbUser[] = []

function addUser(data: Partial<DbUser>): DbUser {
  const user: DbUser = {
    id: `u${users.length + 1}`,
    account: `user${users.length + 1}`,
    password: '123456',
    name: '未知用户',
    phone: `13${rand(800000000, 999999999)}`,
    avatar: '',
    role: 'user',
    petIds: [],
    planId: 'basic',
    planExpireAt: null,
    registeredAt: new Date(Date.now() - rand(30, 600) * 86400000).toISOString(),
    status: 'active',
    ...data,
  }
  if (!user.avatar) user.avatar = avatarOf(user.name)
  if (!user.planExpireAt) user.planExpireAt = new Date(Date.now() + 300 * 86400000).toISOString()
  users.push(user)
  return user
}

// 演示宠物主
const demoOwner = addUser({
  account: 'user',
  name: '林悦',
  phone: '13800000001',
  role: 'user',
  planId: 'pro',
})
// 演示医生账号
addUser({
  account: 'doctor',
  name: '陈思远',
  phone: '13800000002',
  role: 'doctor',
})
// 演示运营账号
addUser({
  account: 'admin',
  name: '平台运营',
  phone: '13800000003',
  role: 'admin',
})

// 批量宠物主（运营端分页展示用）
for (let i = 0; i < 28; i++) {
  addUser({
    name: `${pick(userFirstNames)}${pick(userGivenNames)}`,
    role: 'user',
    planId: pick(['basic', 'basic', 'pro', 'pro', 'premium']),
    status: Math.random() > 0.92 ? 'disabled' : 'active',
  })
}

/* ============================================================
 * 宠物
 * ============================================================ */
export const pets: PetInfo[] = []

function addPet(data: Partial<PetInfo>): PetInfo {
  const pet: PetInfo = {
    id: `p${pets.length + 1}`,
    name: pick(petNames),
    species: Math.random() > 0.45 ? 'dog' : 'cat',
    breed: '未知',
    gender: Math.random() > 0.5 ? 'male' : 'female',
    birthDate: new Date(Date.now() - rand(6, 96) * 30 * 86400000).toISOString(),
    weight: randFloat(1.5, 28, 1),
    avatar: '',
    ownerId: demoOwner.id,
    deviceId: null,
    sterilized: Math.random() > 0.4,
    microchip: `${rand(900000000, 999999999)}${rand(100000000, 999999999)}`,
    createdAt: new Date(Date.now() - rand(10, 300) * 86400000).toISOString(),
    ...data,
  }
  if (!pet.avatar) pet.avatar = avatarOf(pet.name)
  if (!pet.breed || pet.breed === '未知') {
    pet.breed = pet.species === 'dog' ? pick(dogBreeds) : pick(catBreeds)
  }
  pets.push(pet)
  return pet
}

const p1 = addPet({
  id: 'p1',
  name: '布丁',
  species: 'dog',
  breed: '柯基',
  gender: 'male',
  birthDate: '2023-03-15',
  weight: 8.6,
  ownerId: demoOwner.id,
  sterilized: true,
})
const p2 = addPet({
  id: 'p2',
  name: '雪球',
  species: 'cat',
  breed: '布偶猫',
  gender: 'female',
  birthDate: '2024-01-20',
  weight: 4.2,
  ownerId: demoOwner.id,
  sterilized: true,
})

// 批量宠物（与批量用户配对）
for (let i = 4; i <= users.length; i++) {
  const owner = users.find((u) => u.id === `u${i}`)
  if (!owner) continue
  const pet = addPet({
    id: `p${pets.length + 1}`,
    ownerId: owner.id,
    deviceId: `d${pets.length + 3}`,
  })
  owner.petIds.push(pet.id)
}
demoOwner.petIds = ['p1', 'p2']

/* ============================================================
 * 设备（Pet-S1）
 * ============================================================ */
export const devices: DeviceInfo[] = []

function addDevice(data: Partial<DeviceInfo>): DeviceInfo {
  const device: DeviceInfo = {
    id: `d${devices.length + 1}`,
    sn: `SX01${String(devices.length + 1).padStart(7, '0')}`,
    imei: `86${rand(100000000000000, 999999999999999)}`,
    name: 'Pet-S1 智能项圈',
    model: 'Pet-S1',
    status: 'online',
    battery: rand(35, 98),
    firmware: 'v2.4.1',
    boundPetId: null,
    ownerId: null,
    activatedAt: null,
    geofence: null,
    lastSyncAt: new Date(Date.now() - rand(1, 60) * 60000).toISOString(),
    ...data,
  }
  devices.push(device)
  return device
}

addDevice({
  id: 'd1',
  sn: 'SX010001001',
  imei: '861234560000001',
  boundPetId: 'p1',
  ownerId: demoOwner.id,
  status: 'online',
  battery: 78,
  geofence: { center: { lat: 31.2304, lng: 121.4737 }, radius: 500, enabled: true },
})
addDevice({
  id: 'd2',
  sn: 'SX010001002',
  imei: '861234560000002',
  boundPetId: 'p2',
  ownerId: demoOwner.id,
  status: 'online',
  battery: 63,
  geofence: { center: { lat: 31.2204, lng: 121.4637 }, radius: 300, enabled: true },
})

// 与批量宠物绑定设备
for (let i = 3; i <= pets.length; i++) {
  const pet = pets.find((x) => x.id === `p${i}`)
  if (!pet) continue
  const d = addDevice({
    id: `d${i}`,
    sn: `SX01${String(1000 + i).padStart(6, '0')}`,
    boundPetId: pet.id,
    ownerId: pet.ownerId,
    status: Math.random() > 0.2 ? 'online' : 'offline',
    activatedAt: new Date(Date.now() - rand(5, 200) * 86400000).toISOString(),
    geofence: { center: { lat: randFloat(31.1, 31.35, 4), lng: randFloat(121.35, 121.55, 4) }, radius: pick([300, 500, 800]), enabled: Math.random() > 0.3 },
  })
  pet.deviceId = d.id
}

// 未绑定的库存设备（供绑定演示 + 运营端未激活数据）
for (let i = 0; i < 14; i++) {
  addDevice({
    id: `d${9000 + i}`,
    sn: `SX0199${String(i + 1).padStart(5, '0')}`,
    status: 'unbound',
    battery: rand(60, 99),
  })
}

/* ============================================================
 * 宠物医生
 * ============================================================ */
export const vets: VetInfo[] = [
  {
    id: 'v1',
    name: '陈思远',
    hospital: '安心宠物医院',
    title: '主任医师',
    avatar: avatarOf('陈'),
    certStatus: 'approved',
    specialty: '小动物内科 / 心脏病学',
    phone: '13800000002',
    petIds: ['p1', 'p2', 'p3', 'p5'],
  },
  {
    id: 'v2',
    name: '李晓璐',
    hospital: '萌宠之家诊疗中心',
    title: '主治医师',
    avatar: avatarOf('李'),
    certStatus: 'approved',
    specialty: '皮肤科 / 老年宠护理',
    phone: '13911110002',
    petIds: ['p4', 'p6'],
  },
  {
    id: 'v3',
    name: '王建国',
    hospital: '爱宠动物医院',
    title: '执业兽医师',
    avatar: avatarOf('王'),
    certStatus: 'pending',
    specialty: '骨科 / 麻醉',
    phone: '13877770003',
    petIds: [],
  },
  {
    id: 'v4',
    name: '赵倩',
    hospital: '暖阳宠物诊所',
    title: '兽医师',
    avatar: avatarOf('赵'),
    certStatus: 'pending',
    specialty: '内科 / 影像学',
    phone: '13755550004',
    petIds: [],
  },
]

/* ============================================================
 * 健康数据（仅演示宠物 p1/p2 生成）
 * ============================================================ */
export const health: Record<string, HealthMetric[]> = {}
/** 更细粒度的实时流（每 5 分钟一条，最近 2 小时） */
export const telemetry: Record<string, HealthMetric[]> = {}
/** 近 7 天日汇总 */
export const dailyAgg: Record<string, { ts: number; steps: number; sleepHours: number; avgHeartRate: number }[]> = {}

function genHealth(pet: PetInfo): HealthMetric[] {
  const isCat = pet.species === 'cat'
  const hrBase = isCat ? 150 : 95
  const rrBase = isCat ? 28 : 22
  const tempBase = isCat ? 38.6 : 38.3
  const now = Date.now()
  const pts: HealthMetric[] = []
  for (let i = 24; i >= 0; i--) {
    const ts = now - i * 3600000
    const hour = new Date(ts).getHours()
    const sleeping = hour >= 22 || hour <= 6
    const nap = !sleeping && Math.random() < 0.18
    const rest = sleeping || nap
    const hr = rest ? hrBase + rand(-12, 0) : hrBase + rand(-6, 22)
    const rr = rest ? rrBase - rand(4, 8) : rrBase + rand(-3, 6)
    pts.push({
      ts,
      heartRate: hr,
      respiratoryRate: rr,
      spo2: randFloat(95, 100),
      temperature: Number((tempBase + (Math.random() * 0.6 - 0.3)).toFixed(1)),
      activity: rest ? rand(0, 15) : rand(90, 620),
      sleepStage: sleeping ? (Math.random() > 0.55 ? 'deep' : 'light') : 'awake',
    })
  }
  return pts
}

function genTelemetry(pet: PetInfo): HealthMetric[] {
  const isCat = pet.species === 'cat'
  const hrBase = isCat ? 150 : 95
  const now = Date.now()
  const pts: HealthMetric[] = []
  for (let i = 23; i >= 0; i--) {
    const ts = now - i * 5 * 60000
    const hour = new Date(ts).getHours()
    const resting = hour >= 22 || hour <= 6
    pts.push({
      ts,
      heartRate: resting ? hrBase + rand(-10, 2) : hrBase + rand(-4, 18),
      respiratoryRate: isCat ? rand(22, 32) : rand(16, 30),
      spo2: randFloat(95, 100),
      temperature: Number(((isCat ? 38.6 : 38.3) + (Math.random() * 0.4 - 0.2)).toFixed(1)),
      activity: resting ? rand(0, 10) : rand(120, 560),
      sleepStage: resting ? 'light' : 'awake',
    })
  }
  return pts
}

function genDaily(pet: PetInfo) {
  const isCat = pet.species === 'cat'
  const hrBase = isCat ? 150 : 95
  const arr: { ts: number; steps: number; sleepHours: number; avgHeartRate: number }[] = []
  const now = Date.now()
  for (let i = 6; i >= 0; i--) {
    const ts = now - i * 86400000
    arr.push({
      ts,
      steps: rand(4200, 12800),
      sleepHours: Number((pet.species === 'cat' ? randFloat(12, 16, 1) : randFloat(9, 13, 1))),
      avgHeartRate: hrBase + rand(-6, 8),
    })
  }
  return arr
}

for (const pet of [p1, p2]) {
  health[pet.id] = genHealth(pet)
  telemetry[pet.id] = genTelemetry(pet)
  dailyAgg[pet.id] = genDaily(pet)
}

/* ============================================================
 * 轨迹（定位页）
 * ============================================================ */
export const tracks: Record<string, GeoPoint[]> = {}

function genTrack(center: { lat: number; lng: number }): GeoPoint[] {
  const now = Date.now()
  const pts: GeoPoint[] = []
  let lat = center.lat
  let lng = center.lng
  for (let i = 30; i >= 0; i--) {
    pts.push({ lat, lng, ts: now - i * 2 * 60000 })
    lat += randFloat(-0.0009, 0.0009, 6)
    lng += randFloat(-0.0009, 0.0009, 6)
  }
  return pts
}

for (const pet of [p1, p2]) {
  const device = devices.find((d) => d.boundPetId === pet.id)
  tracks[pet.id] = genTrack(device?.geofence?.center ?? { lat: 31.2304, lng: 121.4737 })
}

/* ============================================================
 * 健康报告
 * ============================================================ */
const abnormalPool: {
  key: string
  label: string
  value: string
  level: 'warn' | 'danger' | 'info'
  suggestion: string
}[] = [
  { key: 'hr', label: '夜间心率', value: '偏高', level: 'warn', suggestion: '建议减少临睡前兴奋活动，观察 3 天心率曲线。' },
  { key: 'activity', label: '活动量', value: '较上周下降 18%', level: 'warn', suggestion: '活动量下降可能与天气或情绪有关，建议增加每日遛弯时长。' },
  { key: 'sleep', label: '睡眠时长', value: '偏短', level: 'warn', suggestion: '睡眠偏短，注意营造安静的睡眠环境，避免夜间打扰。' },
  { key: 'spo2', label: '血氧饱和度', value: '轻度偏低', level: 'info', suggestion: '血氧轻度偏低，建议保持运动，避免剧烈活动后立即测量。' },
  { key: 'temp', label: '体温', value: '轻微波动', level: 'info', suggestion: '体温轻微波动在正常范围内，持续观察即可。' },
]

function genReports(pet: PetInfo): ReportItem[] {
  const list: ReportItem[] = []
  const now = Date.now()
  const total = 4
  for (let i = 0; i < total; i++) {
    const endAt = now - i * 7 * 86400000
    const startAt = endAt - 6 * 86400000
    const isLatest = i === 0
    const abnormal: ReportItem['abnormal'] = []
    if (isLatest) {
      abnormal.push(abnormalPool[0], abnormalPool[1])
    } else if (Math.random() > 0.4) {
      abnormal.push(pick(abnormalPool))
    }
    const healthData = health[pet.id]
    const avgHr = Math.round(healthData.reduce((s, m) => s + m.heartRate, 0) / healthData.length)
    const totalActivity = healthData.reduce((s, m) => s + m.activity, 0)
    const sleepHours = Number(
      (healthData.filter((m) => m.sleepStage !== 'awake').length * 1.0 * 0.8).toFixed(1),
    )
    const doctorReview: ReportItem['doctorReview'] = isLatest ? 'pending' : Math.random() > 0.2 ? 'approved' : 'rejected'
    list.push({
      id: `r_${pet.id}_${i}`,
      petId: pet.id,
      period: `${new Date(startAt).toLocaleDateString('zh-CN')} 至 ${new Date(endAt).toLocaleDateString('zh-CN')}`,
      startAt,
      endAt,
      score: isLatest ? rand(78, 88) : rand(82, 96),
      summary: `${pet.name} 本周整体健康状态${isLatest ? '有轻度异常' : '良好'}，建议关注${abnormal.map((a) => a.label).join('、') || '日常运动与饮食'}。`,
      aiConclusion: isLatest
        ? `根据 Pet-S1 项圈连续 7 天采集的数据分析，${pet.name} 夜间心率均值 ${avgHr} 次/分，处于品种参考区间上限；活动量较上周下降约 18%。综合判断：整体健康度良好，存在轻度疲劳或环境适应迹象，建议调整作息并持续监测，暂无需就医。`
        : `数据分析显示 ${pet.name} 各项指标处于健康区间，生命体征平稳，活动与睡眠节律正常，继续保持当前饲养习惯即可。`,
      abnormal,
      metricsSummary: {
        heartRate: { avg: avgHr, max: avgHr + rand(15, 30), min: Math.max(50, avgHr - rand(15, 25)) },
        respiratoryRate: { avg: pet.species === 'cat' ? 28 : 22, max: rand(34, 40), min: rand(14, 18) },
        spo2: { avg: randFloat(97, 99, 1), min: randFloat(94, 96, 1) },
        temperature: { avg: pet.species === 'cat' ? 38.6 : 38.3, max: Number((38.3 + 0.7).toFixed(1)), min: Number((38.3 - 0.4).toFixed(1)) },
        totalActivity,
        sleepDuration: sleepHours,
      },
      doctorId: null,
      doctorReview,
      doctorComment: null,
      createdAt: endAt,
    })
  }
  return list
}

export const reports: ReportItem[] = [...genReports(p1), ...genReports(p2)]

/* ============================================================
 * 订单
 * ============================================================ */
const payMethods = ['微信支付', '支付宝', '银行卡', 'Apple Pay']

export const orders: OrderItem[] = []
function genOrders() {
  const owners = users.filter((u) => u.role === 'user')
  let n = 0
  const now = Date.now()
  for (let i = 0; i < 36; i++) {
    const owner = pick(owners)
    const plan = pick(plans)
    const roll = Math.random()
    const status = roll > 0.78 ? 'paid' : roll > 0.62 ? 'pending' : roll > 0.55 ? 'refunded' : 'paid'
    n += 1
    orders.push({
      id: `o${i + 1}`,
      orderNo: `SP${new Date(now - i * rand(1, 5) * 86400000).toISOString().slice(0, 10).replace(/-/g, '')}${String(10000 + n)}`,
      userId: owner.id,
      userName: owner.name,
      petId: owner.petIds[0] ?? null,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      status,
      payMethod: status === 'paid' ? pick(payMethods) : null,
      createdAt: now - i * rand(1, 6) * 86400000 - rand(0, 10) * 3600000,
      paidAt: status === 'paid' ? now - i * rand(1, 6) * 86400000 : null,
    })
  }
}
genOrders()

/* ============================================================
 * 体征上传记录
 * ============================================================ */
export const uploadLogs: UploadRecord[] = []

function genUploadMetric(pet: PetInfo): HealthMetric {
  const isCat = pet.species === 'cat'
  const hrBase = isCat ? 150 : 95
  const hour = new Date().getHours()
  const resting = hour >= 22 || hour <= 6
  return {
    ts: Date.now(),
    heartRate: resting ? hrBase + rand(-10, 2) : hrBase + rand(-4, 18),
    respiratoryRate: isCat ? rand(22, 32) : rand(16, 30),
    spo2: randFloat(95, 100),
    temperature: Number(((isCat ? 38.6 : 38.3) + (Math.random() * 0.4 - 0.2)).toFixed(1)),
    activity: resting ? rand(0, 10) : rand(120, 560),
    sleepStage: resting ? 'light' : 'awake',
  }
}

/** 模拟项圈上报一次完整生命体征：写入实时流并记录上报日志 */
export function pushUpload(deviceId: string, source: UploadRecord['source']): UploadRecord {
  const device = devices.find((d) => d.id === deviceId)
  const pet = device?.boundPetId ? pets.find((p) => p.id === device.boundPetId) : undefined
  const metric = pet ? genUploadMetric(pet) : genUploadMetric({ species: 'dog' } as PetInfo)
  const record: UploadRecord = {
    id: uid('up'),
    deviceId,
    petId: pet?.id ?? '',
    ts: metric.ts,
    source,
    status: 'success',
    metrics: {
      temperature: metric.temperature,
      heartRate: metric.heartRate,
      spo2: metric.spo2,
      respiratoryRate: metric.respiratoryRate,
    },
  }
  if (pet && telemetry[pet.id]) {
    telemetry[pet.id].push(metric)
    if (telemetry[pet.id].length > 30) telemetry[pet.id] = telemetry[pet.id].slice(-30)
  }
  if (device) device.lastSyncAt = new Date(metric.ts).toISOString()
  uploadLogs.unshift(record)
  return record
}

// 种子：演示项圈 d1 今日自动上报 6 条
const d1Seed = devices.find((d) => d.id === 'd1')
if (d1Seed && d1Seed.boundPetId) {
  for (let i = 6; i >= 1; i--) {
    const ts = Date.now() - i * 20 * 60000
    const metric = genUploadMetric(findPetById(d1Seed.boundPetId)!)
    metric.ts = ts
    uploadLogs.unshift({
      id: `up_d1_seed${i}`,
      deviceId: d1Seed.id,
      petId: d1Seed.boundPetId,
      ts,
      source: 'auto',
      status: 'success',
      metrics: {
        temperature: metric.temperature,
        heartRate: metric.heartRate,
        spo2: metric.spo2,
        respiratoryRate: metric.respiratoryRate,
      },
    })
  }
}

/* ============================================================
 * 问诊（健康数据推送）
 * ============================================================ */
export const consultations: Consultation[] = [
  {
    id: 'c1',
    petId: 'p1',
    ownerId: demoOwner.id,
    doctorId: 'v1',
    status: 'active',
    pushedAt: Date.now() - 2 * 86400000,
    note: '布丁最近食欲一般，晚上偶尔哼唧，请医生帮忙看看数据。',
  },
  {
    id: 'c2',
    petId: 'p2',
    ownerId: demoOwner.id,
    doctorId: 'v1',
    status: 'active',
    pushedAt: Date.now() - 5 * 86400000,
    note: '雪球掉毛有点多，想确认下是否影响健康。',
  },
]

export function findVetById(id: string): VetInfo | undefined {
  return vets.find((v) => v.id === id)
}

export function findConsultation(petId: string, doctorId: string): Consultation | undefined {
  return consultations.find((c) => c.petId === petId && c.doctorId === doctorId && c.status === 'active')
}

/* ============================================================
 * Token（登录态）
 * ============================================================ */
export const tokenUsers: Record<string, string> = {}

export function issueToken(user: DbUser): string {
  const token = `tk_${user.id}_${Math.random().toString(36).slice(2, 10)}`
  tokenUsers[token] = user.id
  return token
}

export function findUserByToken(token: string): DbUser | undefined {
  const userId = tokenUsers[token]
  if (!userId) return undefined
  return users.find((u) => u.id === userId)
}

export function findUserById(id: string): DbUser | undefined {
  return users.find((u) => u.id === id)
}

export function publicUser(user: DbUser): UserInfo {
  const { password: _p, account: _a, ...rest } = user
  void _p
  void _a
  return rest
}

export function findPetById(id: string): PetInfo | undefined {
  return pets.find((p) => p.id === id)
}

export function findDeviceById(id: string): DeviceInfo | undefined {
  return devices.find((d) => d.id === id)
}

export function findDeviceBySn(sn: string): DeviceInfo | undefined {
  return devices.find((d) => d.sn.toLowerCase() === sn.trim().toLowerCase())
}

export function findVetByUserId(userId: string): VetInfo | undefined {
  return vets.find((v) => v.phone === users.find((u) => u.id === userId)?.phone)
}

/** 为演示账号预置登录 token，便于刷新页面保持登录 */
export function preheatTokens(): void {
  users.forEach((u) => {
    if (['user', 'doctor', 'admin'].includes(u.account)) issueToken(u)
  })
}
preheatTokens()

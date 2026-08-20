import type {
  AlbumMedia,
  CommunityComment,
  CommunityPost,
  Consultation,
  DeviceInfo,
  DeviceMaster,
  DoctorReview,
  DictItem,
  DictType,
  FirmwarePackage,
  GeoPoint,
  HealthMetric,
  LoginLog,
  MessageItem,
  OrderItem,
  PetInfo,
  ReportItem,
  Role,
  SubscriptionPlan,
  SysMenu,
  SysRole,
  SysUser,
  Terminal,
  UploadRecord,
  UserInfo,
  VetInfo,
} from '@/types'
import { pick, rand, randFloat, uid, reportNo } from './helper'
import { dayExercise } from './exercise'
import { referenceRangesOf } from './refRange'
import bdAvatar from '@/asset/image/宠物头像-布丁.png'
import xqAvatar from '@/asset/image/宠物头像-雪球.png'

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

const postImagePalette = ['#ff9f43', '#5b8ff9', '#ff6b6b', '#7d6bff', '#2bcbba', '#fd9644', '#ff6b00']

/** 帖子配图：纯色底 + 🐾 + 标签（避免外链图片，风格同 avatarOf；不加渐变/defs 避免 data-URI 冲突） */
function postImageOf(label: string, color: string): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="${color}"/><text x="300" y="210" font-size="120" text-anchor="middle">🐾</text><text x="300" y="336" font-size="26" fill="#fff" text-anchor="middle">${label}</text></svg>`,
  )}`
}

/* ============================================================
 * 用户
 * ============================================================ */
export const users: DbUser[] = []

/**
 * 注册新账号（手机号或邮箱注册，默认创建宠物主）。返回新用户；注册时已由
 * mock 校验过手机号/邮箱未占用、验证码正确。医生/平台端注册时传入对应 role。
 */
export function registerUser(input: {
  account: string
  phone?: string
  email?: string
  password: string
  name?: string
  role?: Role
}): DbUser {
  const isEmail = Boolean(input.email)
  const last4 = (input.phone || input.email || '').replace(/\D/g, '').slice(-4)
  const role = input.role ?? 'user'
  const name =
    input.name ||
    (isEmail
      ? (input.email || '').split('@')[0] || '宠物主'
      : last4
        ? `宠主${last4}`
        : '宠物主')
  const user: DbUser = {
    id: `u${users.length + 1}`,
    account: input.account,
    password: input.password,
    name,
    phone: input.phone || '',
    email: isEmail ? input.email : '',
    avatar: avatarOf(name),
    role,
    petIds: [],
    planId: null,
    planExpireAt: null,
    registeredAt: new Date().toISOString(),
    status: 'active',
  }
  users.push(user)
  return user
}

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
  email: 'linyue@shuxinpet.com',
  role: 'user',
  planId: 'pro',
  gender: 'female',
  birthday: '1995-06-18',
  region: '上海市浦东新区',
  bio: '爱猫爱狗，家有一猫一狗，欢迎交流养宠经验～',
})
// 演示医生账号
addUser({
  account: 'doctor',
  name: '陈思远',
  phone: '13800000002',
  email: 'doctor@shuxinpet.com',
  role: 'doctor',
})
// 演示运营账号
addUser({
  account: 'admin',
  name: '平台运营',
  phone: '13800000003',
  email: 'admin@shuxinpet.com',
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
    isPregnant: false,
    isLactating: false,
    microchip: `${rand(900000000, 999999999)}${rand(100000000, 999999999)}`,
    createdAt: new Date(Date.now() - rand(10, 300) * 86400000).toISOString(),
    vaccines: [],
    dewormings: [],
    personalityTags: [],
    ...data,
  }
  if (!pet.avatar) pet.avatar = avatarOf(pet.name)
  if (!pet.breed || pet.breed === '未知') {
    pet.breed = pet.species === 'dog' ? pick(dogBreeds) : pick(catBreeds)
  }
  pets.push(pet)
  return pet
}

addPet({
  id: 'p1',
  name: '布丁',
  avatar: bdAvatar,
  species: 'dog',
  breed: '柯基',
  gender: 'male',
  birthDate: '2023-03-15',
  weight: 8.6,
  ownerId: demoOwner.id,
  sterilized: true,
  vaccines: [
    { id: 'p1v1', name: '犬八联疫苗', date: '2024-03-20', note: '第三针' },
    { id: 'p1v2', name: '狂犬病疫苗', date: '2025-05-18' },
  ],
  dewormings: [
    { id: 'p1d1', name: '体内驱虫', date: '2025-06-01' },
    { id: 'p1d2', name: '体外驱虫', date: '2025-06-15' },
    { id: 'p1d3', name: '体内驱虫', date: '2025-07-01' },
  ],
  personalityTags: ['活泼', '粘人', '贪吃', '拆家'],
})
addPet({
  id: 'p2',
  name: '雪球',
  avatar: xqAvatar,
  species: 'cat',
  breed: '布偶猫',
  gender: 'female',
  birthDate: '2024-01-20',
  weight: 4.2,
  ownerId: demoOwner.id,
  sterilized: true,
  vaccines: [
    { id: 'p2v1', name: '猫三联疫苗', date: '2024-04-02' },
    { id: 'p2v2', name: '狂犬病疫苗', date: '2025-01-12' },
  ],
  dewormings: [
    { id: 'p2d1', name: '体内外同驱', date: '2025-06-20' },
  ],
  personalityTags: ['高冷', '爱睡觉', '挑食'],
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

/** 根据设备状态与 WiFi 配置生成三种通讯方式的连接状态与信号 */
function makeNetworks(status: string, wifiSsid: string | null): DeviceInfo['networks'] {
  const connected = status === 'online' || status === 'low-power'
  return [
    { method: 'ble', supported: true, connected, signal: rand(-85, -40) },
    { method: 'wifi', supported: true, connected: connected && !!wifiSsid, signal: wifiSsid ? rand(-70, -40) : rand(-92, -60) },
    { method: '4g', supported: true, connected, signal: rand(35, 100) },
  ]
}

function addDevice(data: Partial<DeviceInfo>): DeviceInfo {
  const device: DeviceInfo = {
    id: `d${devices.length + 1}`,
    sn: `SX01${String(devices.length + 1).padStart(7, '0')}`,
    imei: `86${rand(100000000000000, 999999999999999)}`,
    name: 'Pet-S1 智能项圈',
    model: 'Pet-S1',
    type: 'collar',
    status: 'online',
    battery: rand(35, 98),
    signal: rand(-85, -40),
    firmware: 'v2.4.1',
    boundPetId: null,
    ownerId: null,
    activatedAt: null,
    geofence: null,
    lastSyncAt: new Date(Date.now() - rand(1, 60) * 60000).toISOString(),
    networks: [],
    wifiSsid: null,
    ...data,
  }
  if (!data.networks) {
    device.networks = makeNetworks(device.status, device.wifiSsid)
  }
  devices.push(device)
  return device
}

addDevice({
  id: 'd1',
  sn: 'SX010001001',
  imei: '861234560000001',
  type: 'collar',
  boundPetId: 'p1',
  ownerId: demoOwner.id,
  status: 'online',
  battery: 78,
  signal: -52,
  wifiSsid: 'PetHome_5G',
  geofence: { center: { lat: 31.2304, lng: 121.4737 }, radius: 500, enabled: true },
})
addDevice({
  id: 'd2',
  sn: 'SX010001002',
  imei: '861234560000002',
  type: 'neckring',
  boundPetId: 'p2',
  ownerId: demoOwner.id,
  status: 'online',
  battery: 63,
  signal: -68,
  firmware: 'v2.5.0',
  wifiSsid: 'SX-Office',
  geofence: { center: { lat: 31.2204, lng: 121.4637 }, radius: 300, enabled: true },
})

// 与批量宠物绑定设备
for (let i = 3; i <= pets.length; i++) {
  const pet = pets.find((x) => x.id === `p${i}`)
  if (!pet) continue
  const d = addDevice({
    id: `d${i}`,
    sn: `SX01${String(1000 + i).padStart(6, '0')}`,
    type: Math.random() > 0.5 ? 'collar' : 'neckring',
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
    type: Math.random() > 0.5 ? 'collar' : 'neckring',
    status: 'unbound',
    battery: rand(60, 99),
  })
}

/* ============================================================
 * 设备主档案（产线 / 在售 / 已售的全部宠物设备）
 * ============================================================ */
const baseMac = (hex: string) =>
  `A4:${hex}:00:${rand(10000, 65535).toString(16).padStart(4, '0').toUpperCase()}:${rand(10000, 65535).toString(16).padStart(4, '0').toUpperCase()}:${rand(10000, 65535).toString(16).padStart(4, '0').toUpperCase()}`

export const deviceMasters: DeviceMaster[] = [
  {
    id: 'dm1',
    sn: 'SX010001001',
    imei: '861234560000001',
    productName: 'Pet-S1 智能项圈',
    brand: '数心科技',
    model: 'Pet-S1',
    assetNo: 'ZC-2023-0001',
    imageUrl: '',
    category1: 'cat1Wearable',
    category2: 'cat2Collar',
    mac: 'A4:6E:8C:1001:0001:0001',
    hardwareVersion: 'V1.2',
    firmwareVersion: 'v2.4.1',
    commMethods: ['4g', 'ble', 'wifi'],
    macByMethod: { '4g': 'A4:6E:8C:4G01:0001:0001', ble: 'A4:6E:8C:BL01:0001:0001', wifi: 'A4:6E:8C:WF01:0001:0001' },
    protocol: 'MQTT v3.1.1',
    color: 'colorBlack',
    manuDate: '2023-06-18',
    registerDate: '2023-08-01',
    iotDeviceId: 'iot_001001',
    iotToken: 'tok_8f2a91c4',
    indicators: ['heartRate', 'respiratoryRate', 'spo2', 'temperature', 'activity', 'sleep', 'calorie'],
    status: 'active',
  },
  {
    id: 'dm2',
    sn: 'SX010001002',
    imei: '861234560000002',
    productName: 'Pet-S1 智能项圈',
    brand: '数心科技',
    model: 'Pet-S1',
    assetNo: 'ZC-2023-0002',
    imageUrl: '',
    category1: 'cat1Wearable',
    category2: 'cat2Collar',
    mac: baseMac('6E:8D'),
    hardwareVersion: 'V1.2',
    firmwareVersion: 'v2.4.1',
    commMethods: ['4g', 'ble'],
    macByMethod: { '4g': baseMac('6E:8D'), ble: baseMac('6E:8D') },
    protocol: 'MQTT v3.1.1',
    color: 'colorPink',
    manuDate: '2023-06-18',
    registerDate: '2023-08-02',
    iotDeviceId: 'iot_001002',
    iotToken: 'tok_7b12c8e0',
    indicators: ['heartRate', 'spo2', 'temperature', 'activity', 'sleep'],
    status: 'active',
  },
  {
    id: 'dm3',
    sn: 'SX010001003',
    imei: '861234560000003',
    productName: 'Pet-S1 智能项圈',
    brand: '数心科技',
    model: 'Pet-S1',
    assetNo: 'ZC-2023-0003',
    imageUrl: '',
    category1: 'cat1Wearable',
    category2: 'cat2Collar',
    mac: baseMac('6E:8E'),
    hardwareVersion: 'V1.3',
    firmwareVersion: 'v2.4.0',
    commMethods: ['4g', 'wifi'],
    macByMethod: { '4g': baseMac('6E:8E'), wifi: baseMac('6E:8E') },
    protocol: 'MQTT v3.1.1',
    color: 'colorBlue',
    manuDate: '2023-07-02',
    registerDate: '2023-08-05',
    iotDeviceId: 'iot_001003',
    iotToken: 'tok_5c30aa11',
    indicators: ['heartRate', 'respiratoryRate', 'spo2', 'temperature'],
    status: 'active',
  },
  {
    id: 'dm4',
    sn: 'SX019900001',
    imei: '861234567890004',
    productName: 'Pet-S1 智能项圈',
    brand: '数心科技',
    model: 'Pet-S1',
    assetNo: 'ZC-2024-0081',
    imageUrl: '',
    category1: 'cat1Wearable',
    category2: 'cat2Collar',
    mac: baseMac('6E:8F'),
    hardwareVersion: 'V1.4',
    firmwareVersion: 'v2.5.0',
    commMethods: ['4g', 'ble', 'wifi'],
    macByMethod: { '4g': baseMac('6E:8F'), ble: baseMac('6E:8F'), wifi: baseMac('6E:8F') },
    protocol: 'MQTT v3.1.1',
    color: 'colorBlack',
    manuDate: '2024-03-12',
    registerDate: '',
    iotDeviceId: '',
    iotToken: '',
    indicators: ['heartRate', 'respiratoryRate', 'spo2', 'temperature', 'activity', 'sleep', 'calorie'],
    status: 'active',
  },
  {
    id: 'dm5',
    sn: 'SX019900002',
    imei: '861234567890005',
    productName: 'Pet-S1 智能项圈',
    brand: '数心科技',
    model: 'Pet-S1',
    assetNo: 'ZC-2024-0082',
    imageUrl: '',
    category1: 'cat1Wearable',
    category2: 'cat2Collar',
    mac: baseMac('6E:90'),
    hardwareVersion: 'V1.4',
    firmwareVersion: 'v2.5.0',
    commMethods: ['ble', 'wifi'],
    macByMethod: { ble: baseMac('6E:90'), wifi: baseMac('6E:90') },
    protocol: 'MQTT v3.1.1',
    color: 'colorPink',
    manuDate: '2024-03-15',
    registerDate: '',
    iotDeviceId: '',
    iotToken: '',
    indicators: ['heartRate', 'spo2', 'temperature', 'activity'],
    status: 'active',
  },
  {
    id: 'dm6',
    sn: 'SX010001004',
    imei: '861234567890006',
    productName: 'Pet-S1 智能项圈',
    brand: '数心科技',
    model: 'Pet-S1',
    assetNo: 'ZC-2023-0004',
    imageUrl: '',
    category1: 'cat1Wearable',
    category2: 'cat2Collar',
    mac: baseMac('6E:91'),
    hardwareVersion: 'V1.2',
    firmwareVersion: 'v2.3.9',
    commMethods: ['4g'],
    macByMethod: { '4g': baseMac('6E:91') },
    protocol: 'MQTT v3.1.1',
    color: 'colorBlack',
    manuDate: '2023-06-10',
    registerDate: '2023-07-28',
    iotDeviceId: 'iot_001004',
    iotToken: 'tok_9e44b2dd',
    indicators: ['heartRate', 'temperature', 'activity'],
    status: 'inactive',
  },
]

/* ============================================================
 * 固件包
 * ============================================================ */
export const firmwarePackages: FirmwarePackage[] = [
  {
    id: 'fw1',
    name: 'Pet-S1 基础固件',
    version: 'v2.4.1',
    supportModels: ['Pet-S1'],
    supportCategories: ['cat1Wearable'],
    releaseDate: '2024-03-10',
    status: 'published',
    fileSize: 24 * 1024 * 1024,
    fileName: 'Pet-S1_v2.4.1.bin',
    upgradedCount: 1286,
    description: '优化心率算法在运动场景下的噪声过滤，修复低电量下蓝牙重连失败问题。',
  },
  {
    id: 'fw2',
    name: 'Pet-S1 健康算法包',
    version: 'v1.3.0',
    supportModels: ['Pet-S1'],
    supportCategories: ['cat1Wearable'],
    releaseDate: '2024-02-28',
    status: 'published',
    fileSize: 8 * 1024 * 1024,
    fileName: 'Pet-S1_health_v1.3.0.pkg',
    upgradedCount: 954,
    description: '新增睡眠分期识别模型，提升呼吸频率测量的抗干扰能力。',
  },
  {
    id: 'fw3',
    name: 'Pet-S1 定位增强包',
    version: 'v1.1.2',
    supportModels: ['Pet-S1'],
    supportCategories: ['cat1Wearable'],
    releaseDate: '2024-03-01',
    status: 'unpublished',
    fileSize: 12 * 1024 * 1024,
    fileName: 'Pet-S1_gps_v1.1.2.pkg',
    upgradedCount: 0,
    description: '优化室内多径环境下的定位精度，待灰度发布验证。',
  },
  {
    id: 'fw4',
    name: 'Pet-S1 预览固件',
    version: 'v2.5.0-beta',
    supportModels: ['Pet-S1'],
    supportCategories: ['cat1Wearable'],
    releaseDate: '2024-03-20',
    status: 'unpublished',
    fileSize: 26 * 1024 * 1024,
    fileName: 'Pet-S1_v2.5.0-beta.bin',
    upgradedCount: 0,
    description: '新一代架构预览版，包含全新 UI 升级包，仅限测试设备。',
  },
  {
    id: 'fw5',
    name: 'Pet-S1 固件 v2.5.0',
    version: 'v2.5.0',
    supportModels: ['Pet-S1'],
    supportCategories: ['cat1Wearable'],
    releaseDate: '2024-04-02',
    status: 'published',
    fileSize: 28 * 1024 * 1024,
    fileName: 'Pet-S1_v2.5.0.bin',
    upgradedCount: 342,
    description: '重构定位引擎，室内定位精度提升 30%；优化低功耗蓝牙连接稳定性；新增异常行为识别算法。',
  },
]

/** 比较语义化版本号（忽略 v 前缀，逐段数值比较；用于固件版本判断） */
export function compareVersion(a: string, b: string): number {
  const pa = a.replace(/^v/i, '').split('.').map(Number)
  const pb = b.replace(/^v/i, '').split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x - y
  }
  return 0
}

/** 指定型号最新已发布（稳定）固件版本号，无则返回空串 */
export function latestFirmwareVersion(model: string): string {
  const candidates = firmwarePackages
    .filter((f) => f.status === 'published' && f.supportModels.includes(model) && !f.version.includes('-'))
    .map((f) => f.version)
  if (!candidates.length) return ''
  candidates.sort(compareVersion)
  return candidates[candidates.length - 1]
}

/* ============================================================
 * 宠物医生
 * ============================================================ */

/** 生成一条宠主评价（时间用相对天数，避免写死日期） */
let reviewSeq = 0
function reviewOf(userName: string, score: number, content: string, tags: string[], daysAgo: number): DoctorReview {
  reviewSeq += 1
  return {
    id: `rv${reviewSeq}`,
    userName,
    avatar: avatarOf(userName.slice(0, 1)),
    score,
    content,
    tags,
    createdAt: Date.now() - daysAgo * 86400000,
  }
}

export const vets: VetInfo[] = [
  {
    id: 'v1',
    name: '陈思远',
    hospital: '安心宠物医院',
    title: '主任医师',
    avatar: avatarOf('陈'),
    certStatus: 'approved',
    specialty: '小动物内科 / 心脏病学',
    consultPrice: 60,
    phone: '13800000002',
    petIds: ['p1', 'p2', 'p3', 'p5'],
    department: '内科',
    rating: 98,
    consultCount: 1286,
    avgWaitTime: 8,
    bio: '从事小动物临床诊疗 15 年，主攻犬猫内科与心脏病学，擅长老年宠物的慢病管理与心衰综合治疗，累计接诊宠物 5000+ 例。',
    certNo: '兽执业字第 2019-003-1527 号',
    specialtyDesc: '犬猫呕吐拉稀等症状，传染性疾病，寄生虫疾病，消化系统，呼吸系统，泌尿系统疾病，产科，心脏病科等疾病。专攻产科，心脏及肿瘤相关疾病。',
    species: ['dog', 'cat'],
    score: 4.9,
    monthlyAnswers: 268,
    monthlyPrescriptions: 52,
    honors: ['技术院长', '业内专家', '211 院校'],
    priceText: 59,
    pricePhone: 79,
    reviews: [
      reviewOf('布丁妈妈', 5, '陈医生非常专业，我家柯基拉肚子，问诊后按建议调整饮食两天就好了，回复也很快！', ['专业', '耐心', '回复快'], 2),
      reviewOf('可乐爸', 4.5, '经验很丰富，判断准确，就是高峰期等待时间稍长一点。', ['经验丰富', '专业'], 6),
      reviewOf('团子妈妈', 5, '猫咪心脏病复查一直找陈医生，讲解通俗易懂，处方也很到位。', ['耐心', '专业', '值得信赖'], 12),
      reviewOf('旺财主人', 4.8, '第一次线上问诊，流程很顺畅，医生追问了很多细节，很负责。', ['负责', '细致'], 20),
    ],
  },
  {
    id: 'v2',
    name: '李晓璐',
    hospital: '萌宠之家诊疗中心',
    title: '主治医师',
    avatar: avatarOf('李'),
    certStatus: 'approved',
    specialty: '皮肤科 / 老年宠护理',
    consultPrice: 40,
    phone: '13911110002',
    petIds: ['p4', 'p6'],
    department: '皮肤科',
    rating: 97,
    consultCount: 863,
    avgWaitTime: 6,
    bio: '擅长犬猫皮肤病诊治、过敏原排查及老年宠物综合护理，注重以通俗易懂的方式为家长讲解护理要点。',
    certNo: '兽执业字第 2021-006-2088 号',
    specialtyDesc: '擅长犬猫皮肤病、过敏性疾病、耳道及眼部疾病诊治，老年宠慢性病管理与术后护理指导。',
    species: ['dog', 'cat'],
    score: 4.8,
    monthlyAnswers: 186,
    monthlyPrescriptions: 31,
    honors: ['业内专家', '211 院校'],
    priceText: 39,
    pricePhone: 59,
    reviews: [
      reviewOf('雪球妈妈', 5, '皮肤问题反复了半年，李医生一步步排查过敏原，现在终于稳定了，太感谢！', ['专业', '耐心'], 3),
      reviewOf('奶茶主人', 4.8, '回复特别细致，用药说明很清楚，还会主动回访。', ['细致', '负责'], 9),
      reviewOf('豆豆妈妈', 4.5, '老年猫护理指导很实用，态度也好。', ['专业', '态度好'], 18),
    ],
  },
  {
    id: 'v3',
    name: '王建国',
    hospital: '爱宠动物医院',
    title: '执业兽医师',
    avatar: avatarOf('王'),
    certStatus: 'pending',
    specialty: '骨科 / 麻醉',
    consultPrice: 30,
    phone: '13877770003',
    petIds: [],
    department: '骨科',
    rating: 95,
    consultCount: 432,
    avgWaitTime: 12,
    bio: '专注小动物骨科与麻醉方向，熟练开展骨折内固定、髌骨脱位修复等手术，术前术后管理经验丰富。',
    certNo: '兽执业字第 2023-002-3156 号',
    specialtyDesc: '擅长犬猫骨科疾病诊治与麻醉管理，熟练开展骨折内固定、髌骨脱位修复等手术。',
    species: ['dog', 'cat'],
    score: 4.7,
    monthlyAnswers: 92,
    monthlyPrescriptions: 18,
    honors: ['业内专家'],
    priceText: 29,
    pricePhone: 49,
    reviews: [
      reviewOf('阿福主人', 4.7, '骨科术前咨询讲解很透彻，让人安心。', ['专业'], 5),
      reviewOf('橘子妈妈', 4.6, '骨折术后恢复指导到位，回答及时。', ['回复快'], 15),
    ],
  },
  {
    id: 'v4',
    name: '赵倩',
    hospital: '暖阳宠物诊所',
    title: '兽医师',
    avatar: avatarOf('赵'),
    certStatus: 'pending',
    specialty: '内科 / 影像学',
    consultPrice: 30,
    phone: '13755550004',
    petIds: [],
    department: '内科',
    rating: 96,
    consultCount: 358,
    avgWaitTime: 10,
    bio: '擅长犬猫内科疾病的诊断与超声影像判读，对消化系统疾病及泌尿系统疾病有较深入研究。',
    certNo: '兽执业字第 2022-008-4730 号',
    specialtyDesc: '擅长犬猫内科疾病诊断与超声影像判读，对消化系统及泌尿系统疾病有深入研究。',
    species: ['dog', 'cat'],
    score: 4.8,
    monthlyAnswers: 104,
    monthlyPrescriptions: 23,
    honors: ['211 院校'],
    priceText: 29,
    pricePhone: 49,
    reviews: [
      reviewOf('米粒妈妈', 4.8, 'B 超报告解读很详细，泌尿问题给了明确方案。', ['专业', '细致'], 4),
      reviewOf('果冻主人', 4.7, '态度亲切，解释清楚，很不错。', ['态度好'], 11),
    ],
  },
]

/* ============================================================
 * 健康数据（为全部已绑定设备的宠物生成，供运营端健康管理按宠物维度查看）
 * ============================================================ */
export const health: Record<string, HealthMetric[]> = {}
/** 更细粒度的实时流（每 5 分钟一条，最近 2 小时） */
export const telemetry: Record<string, HealthMetric[]> = {}
/** 日汇总（近 90 天，含四体征日均/极值，供体征详情页按 周/月/季度 周期展示） */
export interface DailyAgg {
  ts: number
  heartRate: { avg: number; max: number; min: number }
  respiratoryRate: { avg: number; max: number; min: number }
  spo2: { avg: number; max: number; min: number }
  temperature: { avg: number; max: number; min: number }
  steps: number
  sleepHours: number
  avgHeartRate: number
}
export const dailyAgg: Record<string, DailyAgg[]> = {}

function genHealth(pet: PetInfo): HealthMetric[] {
  const isCat = pet.species === 'cat'
  const hrBase = isCat ? 150 : 95
  const rrBase = isCat ? 28 : 22
  const tempBase = isCat ? 38.6 : 38.4
  const now = Date.now()
  const pts: HealthMetric[] = []
  for (let i = 24; i >= 0; i--) {
    const ts = now - i * 3600000
    const hour = new Date(ts).getHours()
    const sleeping = hour >= 22 || hour <= 6
    const nap = !sleeping && Math.random() < 0.18
    const rest = sleeping || nap
    const hr = rest ? hrBase + rand(-12, 0) : hrBase + rand(-6, 22)
    // 呼吸频率跨度略大：多数落在物种绿色区间，偶有触碰橙色预警区间，便于体征页展示三色
    const rr = rest ? rrBase - rand(3, 7) : rrBase + rand(-4, 9)
    pts.push({
      ts,
      heartRate: hr,
      respiratoryRate: rr,
      spo2: randFloat(95, 100),
      // 体温跨度稍大：多数落在绿色正常区间，偶有触碰橙色预警区间，便于体征页展示三色
      temperature: Number((tempBase + (Math.random() * 0.8 - 0.3)).toFixed(1)),
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
      temperature: Number(((isCat ? 38.6 : 38.4) + (Math.random() * 0.4 - 0.2)).toFixed(1)),
      activity: resting ? rand(0, 10) : rand(120, 560),
      sleepStage: resting ? 'light' : 'awake',
    })
  }
  return pts
}

function genDaily(pet: PetInfo): DailyAgg[] {
  const isCat = pet.species === 'cat'
  const hrBase = isCat ? 150 : 95
  const rrBase = isCat ? 28 : 22
  const tempBase = isCat ? 38.6 : 38.4
  const arr: DailyAgg[] = []
  const now = Date.now()
  for (let i = 89; i >= 0; i--) {
    const ts = now - i * 86400000
    arr.push({
      ts,
      heartRate: {
        avg: hrBase + rand(-6, 8),
        max: hrBase + rand(10, 26),
        min: Math.max(40, hrBase + rand(-20, -8)),
      },
      respiratoryRate: {
        avg: rrBase + rand(-3, 3),
        // max 略高，让周/月/季视图的呼吸频率也能偶见橙色预警点
        max: rrBase + rand(3, 11),
        min: rrBase + rand(-6, -2),
      },
      spo2: { avg: randFloat(96, 99, 1), max: randFloat(99, 100, 1), min: randFloat(93, 96, 1) },
      temperature: {
        avg: Number((tempBase + rand(-0.2, 0.4)).toFixed(1)),
        max: Number((tempBase + rand(0.3, 0.7)).toFixed(1)),
        min: Number((tempBase + rand(-0.4, -0.1)).toFixed(1)),
      },
      steps: rand(4200, 12800),
      sleepHours: Number((pet.species === 'cat' ? randFloat(12, 16, 1) : randFloat(9, 13, 1))),
      avgHeartRate: hrBase + rand(-6, 8),
    })
  }
  return arr
}

// 为全部已绑定设备的宠物生成健康数据（运营端健康管理按宠物维度查看）
for (const pet of pets) {
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

for (const pet of pets) {
  const device = devices.find((d) => d.boundPetId === pet.id)
  tracks[pet.id] = genTrack(device?.geofence?.center ?? { lat: 31.2304, lng: 121.4737 })
}

/* ============================================================
 * 历史轨迹（历史轨迹页：多日 + 时间区间筛选）
 * ============================================================ */
export const trackHistory: Record<string, GeoPoint[]> = {}

function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 最近 7 天：过去 6 天每天 1~2 段散步（8:00~19:00 随机起始，每段 30~45 点、间隔 3 分钟） */
function genHistoryTrack(center: { lat: number; lng: number }): GeoPoint[] {
  const now = Date.now()
  const DAY = 86400000
  const pts: GeoPoint[] = []

  for (let d = 6; d >= 1; d--) {
    const dayStart = startOfDay(now - d * DAY)
    let sessionStart = dayStart + (8 + rand(0, 11)) * 3600000 // 8:00~19:00 起始
    const sessions = rand(1, 2)
    for (let s = 0; s < sessions; s++) {
      let lat = center.lat
      let lng = center.lng
      const count = 30 + rand(0, 15)
      for (let i = 0; i < count; i++) {
        const ts = sessionStart + i * 3 * 60000
        if (ts > now) break
        pts.push({ lat, lng, ts })
        lat += randFloat(-0.0011, 0.0011, 6)
        lng += randFloat(-0.0011, 0.0011, 6)
      }
      sessionStart += (3 + rand(1, 3)) * 3600000 // 下一段间隔 3~5 小时
    }
  }

  // 今天：一段散步，结束于当前时间前约 2 分钟，保证「今天」与当前定位都有轨迹
  {
    let lat = center.lat
    let lng = center.lng
    const start = now - 119 * 60000
    for (let i = 0; i < 40; i++) {
      const ts = i === 39 ? now - 2 * 60000 : start + i * 3 * 60000
      pts.push({ lat, lng, ts })
      lat += randFloat(-0.0011, 0.0011, 6)
      lng += randFloat(-0.0011, 0.0011, 6)
    }
  }

  return pts.sort((a, b) => a.ts - b.ts)
}

for (const pet of pets) {
  const device = devices.find((d) => d.boundPetId === pet.id)
  trackHistory[pet.id] = genHistoryTrack(device?.geofence?.center ?? { lat: 31.2304, lng: 121.4737 })
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
    const score = isLatest ? rand(78, 88) : rand(82, 96)
    const grade: ReportItem['grade'] = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D'
    // 由近 7 天日汇总推导运动指标
    const exDays = (dailyAgg[pet.id] ?? []).filter((d) => d.ts >= startAt && d.ts <= endAt)
    const exTotal = exDays.reduce((s, d) => s + d.steps, 0)
    const exDaily = exDays.length ? Math.round(exTotal / exDays.length) : 0
    const exs = exDays.map((d) => dayExercise(pet, d.ts, d.steps))
    const med = (ns: number[]) => (ns.length ? [...ns].sort((a, b) => a - b)[Math.floor(ns.length / 2)] : 0)
    const r1 = (n: number) => Math.round(n * 10) / 10
    const r2 = (n: number) => Math.round(n * 100) / 100
    // 上一周期（前 7 天）用于「与上周比较」
    const prevDays = (dailyAgg[pet.id] ?? []).filter((d) => d.ts >= startAt - 7 * 86400000 && d.ts < startAt)
    const prevExs = prevDays.map((d) => dayExercise(pet, d.ts, d.steps))
    const compare = {
      temperature: r1(med(exDays.map((d) => d.temperature.avg)) - med(prevDays.map((d) => d.temperature.avg))),
      heartRate: Math.round(med(exDays.map((d) => d.heartRate.avg)) - med(prevDays.map((d) => d.heartRate.avg))),
      spo2: r1(med(exDays.map((d) => d.spo2.avg)) - med(prevDays.map((d) => d.spo2.avg))),
      respiratoryRate: Math.round(med(exDays.map((d) => d.respiratoryRate.avg)) - med(prevDays.map((d) => d.respiratoryRate.avg))),
      stepFreq: Math.round(med(exs.map((e) => e.stepFreq)) - med(prevExs.map((e) => e.stepFreq))),
      stride: r1(med(exs.map((e) => e.stride)) - med(prevExs.map((e) => e.stride))),
      speed: r2(med(exs.map((e) => e.speed)) - med(prevExs.map((e) => e.speed))),
      calorie: Math.round(med(exDays.map((d) => d.steps * 0.05)) - med(prevDays.map((d) => d.steps * 0.05))),
    }
    const recommendations: string[] = []
    if (grade === 'A') recommendations.push('整体健康稳定，各项指标均在正常范围，继续保持当前生活节奏。')
    if (grade === 'B') recommendations.push('个别指标轻微波动，属正常生理范围，建议观察并保持健康作息。')
    if (grade === 'C') recommendations.push('存在亚健康信号，建议调整饮食与运动、观察异常指标，并预约基础体检。')
    if (grade === 'D') recommendations.push('存在明显病理风险，请尽快联系宠物医院就诊。')
    if (abnormal.length) recommendations.push(`重点关注：${abnormal.map((a) => a.label).join('、')}，建议加强监测。`)
    const vetReferral = {
      needed: grade === 'D',
      urgency: (grade === 'D' ? 'urgent' : 'routine') as 'routine' | 'urgent' | 'emergency',
      warning: grade === 'D' ? '建议尽快联系宠物医院就诊，并携带本周期完整数据。' : '',
      suggestedExams: grade === 'D' ? ['血常规', '影像学检查（X 光 / 超声）'] : [],
    }
    const doctorReview: ReportItem['doctorReview'] = isLatest ? 'pending' : Math.random() > 0.2 ? 'approved' : 'rejected'
    list.push({
      id: `r_${pet.id}_${i}`,
      reportNo: reportNo(),
      petId: pet.id,
      period: `${new Date(startAt).toLocaleDateString('zh-CN')} 至 ${new Date(endAt).toLocaleDateString('zh-CN')}`,
      startAt,
      endAt,
      score,
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
      grade,
      referenceRanges: referenceRangesOf(pet),
      compare,
      recommendations,
      vetReferral,
      exerciseSummary: {
        totalActivity: exTotal,
        dailyActivity: exDaily,
        stepFreq: Math.round(med(exs.map((e) => e.stepFreq))),
        stride: Number(med(exs.map((e) => e.stride)).toFixed(1)),
        speed: Number(med(exs.map((e) => e.speed)).toFixed(2)),
        exerciseDurationMin: Math.round(med(exs.map((e) => e.durationMin))),
      },
      doctorId: null,
      doctorReview,
      doctorComment: null,
      // 最新一期默认未读，历史报告视为已读
      readAt: isLatest ? null : endAt,
      createdAt: endAt,
    })
  }
  return list
}

export const reports: ReportItem[] = pets.flatMap((p) => genReports(p))

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
    images: [],
    healthSnapshot: {
      temperature: 38.5,
      heartRate: 96,
      spo2: 98,
      respiratoryRate: 22,
      calorie: 386,
      activityPercent: 68,
      sleepHours: 9.2,
      updatedAt: Date.now() - 2 * 86400000 + 3600000,
    },
    exerciseSnapshot: {
      stepFreq: 82,
      stride: 27,
      gait: 'walk',
      speed: 0.8,
      updatedAt: Date.now() - 2 * 86400000 + 3600000,
    },
    replies: [
      {
        id: 'r1',
        vetId: 'v1',
        content: '根据你提交的体征数据，布丁体温 38.5°C、心率 96 次/分都在正常范围内。食欲下降同时伴偶尔哼唧，多考虑轻微胃肠不适或换粮应激，暂不严重。建议先调整饮食观察 2~3 天。',
        medicines: [
          { name: '宠物益生菌', usage: '每日 1 次，每次 1 袋，温水化开拌粮，连用 5 天' },
          { name: '肠胃调理处方粮', usage: '替代日常主粮，喂食 3~5 天缓解肠胃负担' },
        ],
        repliedAt: Date.now() - 2 * 86400000 + 5 * 3600000,
      },
    ],
  },
  {
    id: 'c2',
    petId: 'p2',
    ownerId: demoOwner.id,
    doctorId: 'v1',
    status: 'active',
    pushedAt: Date.now() - 5 * 86400000,
    note: '雪球掉毛有点多，想确认下是否影响健康。',
    images: [],
    healthSnapshot: {
      temperature: 38.4,
      heartRate: 148,
      spo2: 99,
      respiratoryRate: 26,
      calorie: 212,
      activityPercent: 35,
      sleepHours: 13.5,
      updatedAt: Date.now() - 5 * 86400000 + 3600000,
    },
    exerciseSnapshot: {
      stepFreq: 46,
      stride: 16,
      gait: 'rest',
      speed: 0.1,
      updatedAt: Date.now() - 5 * 86400000 + 3600000,
    },
    replies: [
      {
        id: 'r2',
        vetId: 'v1',
        content: '雪球各项生命体征正常，掉毛多为季节性换毛，与健康无碍。注意每日梳毛减少毛球风险，可适量补充鱼油改善皮毛质量。',
        medicines: [
          { name: '深海鱼油（宠物专用）', usage: '每日 1 粒，挤破拌入食物' },
          { name: '化毛膏', usage: '每周 2~3 次，每次 3~5cm，帮助排出毛球' },
        ],
        repliedAt: Date.now() - 5 * 86400000 + 6 * 3600000,
      },
    ],
  },
]

export function findConsultationById(id: string): Consultation | undefined {
  return consultations.find((c) => c.id === id)
}

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

/* ============================================================
 * 宠屋（宠物社区）
 * ============================================================ */
export const communityFollows: { followerId: string; targetId: string }[] = []
export const communityLikes: { postId: string; userId: string }[] = []
export const communityPosts: CommunityPost[] = []
export const communityComments: CommunityComment[] = []

interface PostSeed {
  authorId: string
  petName: string
  caption: string
  imageCount: number
  views: number
  likes: number
  comments: number
  minutesAgo: number
}

const POST_SEEDS: PostSeed[] = [
  // 林悦自己的帖子（已发布、可见，展示在宠物圈；可在「我的发布」中管理可见性/删除）
  { authorId: 'u1', petName: '布丁', caption: '布丁今天的柯基拖地舞，笑死我了 🐶', imageCount: 4, views: 320, likes: 45, comments: 8, minutesAgo: 25 },
  { authorId: 'u1', petName: '雪球', caption: '布偶猫的午后时光，软成一滩水', imageCount: 3, views: 560, likes: 80, comments: 12, minutesAgo: 60 * 28 },
  // u5（林悦已关注，出现在"关注萌宠"）
  { authorId: 'u5', petName: '豆豆', caption: '带豆豆去公园撒欢，跑了一下午', imageCount: 6, views: 2100, likes: 320, comments: 46, minutesAgo: 40 },
  { authorId: 'u5', petName: '豆豆', caption: '第一次学会握手，老母亲泪目', imageCount: 2, views: 880, likes: 120, comments: 15, minutesAgo: 60 * 3 },
  { authorId: 'u5', petName: '可乐', caption: '两小只的日常抢玩具大战', imageCount: 5, views: 3400, likes: 510, comments: 88, minutesAgo: 60 * 26 },
  // u8（林悦已关注）
  { authorId: 'u8', petName: '团子', caption: '柴犬的微笑治愈所有不开心', imageCount: 4, views: 4600, likes: 720, comments: 130, minutesAgo: 60 * 5 },
  { authorId: 'u8', petName: '毛球', caption: '新到家的英短小朋友，求取名', imageCount: 9, views: 5200, likes: 830, comments: 210, minutesAgo: 60 * 30 },
  { authorId: 'u8', petName: '旺财', caption: '金毛的拆家现场，家里遭殃了', imageCount: 3, views: 1300, likes: 190, comments: 34, minutesAgo: 60 * 9 },
  // 未关注的作者
  { authorId: 'u4', petName: '奶茶', caption: '橘猫的一天：吃、睡、撒娇', imageCount: 1, views: 680, likes: 95, comments: 10, minutesAgo: 60 * 7 },
  { authorId: 'u7', petName: '年糕', caption: '边牧到底有多聪明，有图为证', imageCount: 6, views: 6100, likes: 940, comments: 176, minutesAgo: 60 * 11 },
  { authorId: 'u10', petName: '糯米', caption: '布偶猫踩奶现场，太治愈了', imageCount: 2, views: 1500, likes: 240, comments: 29, minutesAgo: 60 * 15 },
  { authorId: 'u12', petName: '橘子', caption: '萨摩耶的微笑暴击，融化冬天', imageCount: 4, views: 3900, likes: 580, comments: 92, minutesAgo: 60 * 22 },
  { authorId: 'u15', petName: '煤球', caption: '狸花猫的王者气质，家猫版', imageCount: 1, views: 420, likes: 60, comments: 6, minutesAgo: 60 * 33 },
  { authorId: 'u18', petName: '汤圆', caption: '泰迪的造型秀，托尼老师上线', imageCount: 5, views: 980, likes: 140, comments: 22, minutesAgo: 60 * 40 },
]

POST_SEEDS.forEach((s, i) => {
  const images: string[] = []
  for (let k = 0; k < s.imageCount; k++) {
    images.push(postImageOf(`${s.petName} ${k + 1}`, pick(postImagePalette)))
  }
  communityPosts.push({
    id: `cp${i + 1}`,
    authorId: s.authorId,
    petName: s.petName,
    caption: s.caption,
    images,
    viewCount: s.views,
    likeCount: s.likes,
    commentCount: s.comments,
    createdAt: Date.now() - s.minutesAgo * 60000,
    status: 'published',
    visibility: 'visible',
  })
})

// 演示关注：林悦 关注 u5、u8（使"关注萌宠"页签非空）
communityFollows.push({ followerId: 'u1', targetId: 'u5' }, { followerId: 'u1', targetId: 'u8' })
// 演示点赞：林悦 赞过 cp3（u5 的第一帖）
communityLikes.push({ postId: 'cp3', userId: 'u1' })

// 演示评论（含 u1 与其他用户），使部分帖子详情有内容
const commentSeeds: { postId: string; authorId: string; content: string; minutesAgo: number }[] = [
  { postId: 'cp3', authorId: 'u7', content: '豆豆太可爱了，被萌到了！', minutesAgo: 30 },
  { postId: 'cp3', authorId: 'u1', content: '同款公园，下次偶遇呀 😄', minutesAgo: 20 },
  { postId: 'cp7', authorId: 'u4', content: '求更新小猫咪的近照！', minutesAgo: 120 },
  { postId: 'cp7', authorId: 'u8', content: '最近又胖了一圈哈哈', minutesAgo: 80 },
  { postId: 'cp10', authorId: 'u5', content: '边牧果然是智商担当', minutesAgo: 300 },
]
commentSeeds.forEach((c, i) => {
  communityComments.push({
    id: `cc${i + 1}`,
    postId: c.postId,
    authorId: c.authorId,
    content: c.content,
    createdAt: Date.now() - c.minutesAgo * 60000,
  })
})

/* ============================================================
 * 消息中心（宠物主端）
 * ============================================================ */
export const messages: MessageItem[] = []

interface MessageSeed {
  category: MessageItem['category']
  title: string
  sender: string
  summary: string
  content: string
  /** 配图张数（0 表示无图） */
  imageCount: number
  /** 附带的宠物体征（undefined 表示无） */
  vitals?: MessageItem['petVitals']
  /** 是否未读 */
  unread: boolean
  /** 发送于多少分钟前 */
  minutesAgo: number
}

const MESSAGE_SEEDS: MessageSeed[] = [
  {
    category: 'health',
    title: '布丁今日健康快报',
    sender: '数心智能健康中心',
    summary: '布丁今日体征平稳，心率、体温均在正常范围，运动量充足。',
    content:
      '亲爱的林悦，您好！\n\n布丁今天的健康数据已生成，整体状态良好：\n· 心率、呼吸、血氧、体温均处于正常区间\n· 今日活动量达标，睡眠质量优秀\n· 无异常告警记录\n\n请继续保持当前的作息与饮食节奏，Pet-S1 将为您持续守护。',
    imageCount: 1,
    vitals: {
      petName: '布丁',
      petAvatar: bdAvatar,
      breed: '柯基',
      temperature: 38.5,
      heartRate: 96,
      spo2: 98,
      respiratoryRate: 22,
    },
    unread: true,
    minutesAgo: 35,
  },
  {
    category: 'health',
    title: '雪球心率偏快提醒',
    sender: '数心智能健康中心',
    summary: '雪球 14:20 出现一过性心率升高，请留意其活动与情绪状态。',
    content:
      '尊敬的林悦：\n\n系统监测到雪球在 14:20 左右出现一过性心率升高（峰值 168 次/分），持续约 3 分钟后自行恢复。\n\n结合当时活动量判断，多为追逐玩耍或短暂应激所致，暂不构成健康风险。建议持续观察，若频繁出现请及时联系兽医。',
    imageCount: 0,
    vitals: {
      petName: '雪球',
      petAvatar: xqAvatar,
      breed: '布偶猫',
      temperature: 38.4,
      heartRate: 152,
      spo2: 99,
      respiratoryRate: 26,
    },
    unread: true,
    minutesAgo: 60 * 3,
  },
  {
    category: 'health',
    title: '布丁周度健康报告已生成',
    sender: '数心智能健康中心',
    summary: '布丁本周综合健康评分 92 分（A 级），点击查看完整报告。',
    content:
      '布丁本周健康报告已生成，综合评分 92 分，评级 A。\n\n本周各指标波动平稳，运动量与睡眠均保持良好，未发现需关注的异常项。详细数据分析可前往「健康报告」页查看。',
    imageCount: 0,
    unread: false,
    minutesAgo: 60 * 26,
  },
  {
    category: 'community',
    title: '你的帖子被点赞了',
    sender: '宠圈小助手',
    summary: '「布丁今天的柯基拖地舞」收获 45 个赞，快去看看谁在关注你。',
    content:
      '你发布的「布丁今天的柯基拖地舞，笑死我了 🐶」近期人气高涨，共收获 45 个赞、8 条评论。\n\n感谢你分享布丁的欢乐日常，继续记录更多萌宠瞬间吧！',
    imageCount: 0,
    unread: true,
    minutesAgo: 50,
  },
  {
    category: 'community',
    title: '关注的人更新了动态',
    sender: '宠圈小助手',
    summary: '「豆豆」发布了新动态：第一次学会握手，老母亲泪目。',
    content:
      '你关注的宠友「豆豆」刚刚更新了动态，分享了萌宠学会握手的喜悦瞬间。\n\n点击下方图片查看原帖，快去点个赞互动一下吧～',
    imageCount: 1,
    unread: true,
    minutesAgo: 60 * 3,
  },
  {
    category: 'community',
    title: '有人评论了你的帖子',
    sender: '宠圈小助手',
    summary: '「奶茶」评论了你的帖子：「同款公园，下次偶遇呀 😄」',
    content:
      '宠友「奶茶」在你的帖子「布丁今天的柯基拖地舞」下评论：「同款公园，下次偶遇呀 😄」。\n\n进入宠圈查看全部评论并回复吧。',
    imageCount: 0,
    unread: false,
    minutesAgo: 60 * 5,
  },
  {
    category: 'system',
    title: '订阅服务续费提醒',
    sender: '数心智能平台',
    summary: '你的专业版订阅将于 30 天后到期，续费可享早鸟优惠。',
    content:
      '尊敬的林悦：\n\n您订阅的「专业版」服务将于 30 天后到期。到期后 AI 智能分析、医生在线问诊等高级功能将暂停。\n\n续费可享限时早鸟优惠，点击「订阅服务」了解详情。',
    imageCount: 0,
    unread: true,
    minutesAgo: 60 * 8,
  },
  {
    category: 'system',
    title: '设备固件有新版本',
    sender: '数心智能平台',
    summary: 'Pet-S1 固件 V2.4.1 已发布，建议及时升级以获得更好体验。',
    content:
      '您的 Pet-S1 智能项圈有新的固件版本 V2.4.1 可升级。\n\n本次更新优化了心率监测精度与定位稳定性，建议在设备电量充足时前往「设备管理 → 固件升级」完成更新。',
    imageCount: 0,
    unread: false,
    minutesAgo: 60 * 20,
  },
  {
    category: 'system',
    title: '欢迎加入数心智能宠物平台',
    sender: '数心智能平台',
    summary: '欢迎加入，为你的爱宠绑定 Pet-S1，开启 24 小时健康守护。',
    content:
      '欢迎加入数心智能宠物平台！\n\n为你的爱宠佩戴 Pet-S1 智能项圈，即可享受 24 小时生命体征监测、实时定位与电子围栏、健康报告等一站式守护服务。',
    imageCount: 1,
    unread: false,
    minutesAgo: 60 * 24 * 3,
  },
]

MESSAGE_SEEDS.forEach((s, i) => {
  const images: string[] = []
  for (let k = 0; k < s.imageCount; k++) {
    images.push(postImageOf(`消息配图 ${k + 1}`, pick(postImagePalette)))
  }
  messages.push({
    id: `msg${i + 1}`,
    userId: demoOwner.id,
    category: s.category,
    title: s.title,
    sender: s.sender,
    summary: s.summary,
    content: s.content,
    images,
    petVitals: s.vitals,
    readAt: s.unread ? null : Date.now() - s.minutesAgo * 60000,
    createdAt: Date.now() - s.minutesAgo * 60000,
  })
})

/* ---- 医生端消息（问诊消息 / 系统消息）---- */
const demoDoctor = users.find((u) => u.account === 'doctor')
if (demoDoctor) {
  const DOCTOR_MESSAGE_SEEDS: MessageSeed[] = [
    {
      category: 'consultation',
      title: '收到新的问诊请求',
      sender: '布丁妈妈 · 林悦',
      summary: '宠物「布丁」出现腹泻，主人已提交问诊，请尽快查看并回复。',
      content:
        '陈医生，您好！\n\n宠物主林悦为「布丁」（柯基）提交了新的问诊：\n· 症状：近两日食欲不振，伴轻微腹泻\n· 主诉：需咨询是否需要调整饮食或就医\n\n问诊附带体征与运动快照，请在「在线问诊」中查看详情并及时回复。',
      imageCount: 0,
      unread: true,
      minutesAgo: 18,
    },
    {
      category: 'consultation',
      title: '问诊宠物体征提醒',
      sender: '数心智能健康中心',
      summary: '监护宠物「雪球」心率出现一过性升高，建议结合问诊记录综合判断。',
      content:
        '您监护的「雪球」（布偶猫）在 15:40 出现一过性心率升高（峰值 172 次/分），持续约 2 分钟后自行恢复。\n\n该宠物近期有活跃问诊记录，建议您在回复问诊时结合本次体征波动综合评估。',
      imageCount: 0,
      unread: true,
      minutesAgo: 60 * 2,
    },
    {
      category: 'consultation',
      title: '问诊已到期提醒',
      sender: '数心智能健康中心',
      summary: '您有一条问诊超过 24 小时未回复，请及时处理以免影响接诊率。',
      content:
        '宠物主「豆豆妈妈」发起的问诊已超过 24 小时未回复。\n\n为保障宠物健康与您的接诊评价，请尽快前往「在线问诊」查看并回复。',
      imageCount: 0,
      unread: false,
      minutesAgo: 60 * 26,
    },
    {
      category: 'system',
      title: '执业证书年审提醒',
      sender: '数心智能平台',
      summary: '您的执业兽医师证书即将到期，请在 30 天内完成年审资料提交。',
      content:
        '陈思远医生，您好！\n\n系统提示您的《执业兽医师资格证书》（兽执业字第 2019-003-1527 号）即将到期。\n\n为保障医生资质正常展示与在线问诊接单，请及时在「个人中心」更新相关认证资料。',
      imageCount: 0,
      unread: true,
      minutesAgo: 60 * 9,
    },
    {
      category: 'system',
      title: '平台接诊规范更新',
      sender: '数心智能平台',
      summary: '《线上问诊服务规范》已更新，新增远程处方与用药安全相关条款。',
      content:
        '为保障线上问诊服务质量，平台已更新《线上问诊服务规范》，重点新增远程处方资质审核、用药安全提醒等条款。\n\n请在接诊前阅读并遵守最新规范，共同守护宠物健康。',
      imageCount: 0,
      unread: false,
      minutesAgo: 60 * 22,
    },
    {
      category: 'system',
      title: '欢迎加入数心智能医生端',
      sender: '数心智能平台',
      summary: '欢迎陈医生入驻，完善档案即可开始在线接诊与宠物监护服务。',
      content:
        '陈思远医生，欢迎入驻数心智能宠物平台医生端！\n\n您可以在工作台开启在线问诊、监护合作宠物、查看实时监测与数据统计。完善个人档案与执业信息后即可正式接诊。',
      imageCount: 0,
      unread: false,
      minutesAgo: 60 * 24 * 3,
    },
  ]
  DOCTOR_MESSAGE_SEEDS.forEach((s, i) => {
    const images: string[] = []
    for (let k = 0; k < s.imageCount; k++) {
      images.push(postImageOf(`消息配图 ${k + 1}`, pick(postImagePalette)))
    }
    messages.push({
      id: `dmsg${i + 1}`,
      userId: demoDoctor.id,
      category: s.category,
      title: s.title,
      sender: s.sender,
      summary: s.summary,
      content: s.content,
      images,
      petVitals: s.vitals,
      readAt: s.unread ? null : Date.now() - s.minutesAgo * 60000,
      createdAt: Date.now() - s.minutesAgo * 60000,
    })
  })
}

/** 某用户（可选分类）的消息，按发送时间倒序 */
export function messagesOf(userId: string, category?: MessageItem['category']): MessageItem[] {
  return messages
    .filter((m) => m.userId === userId && (!category || m.category === category))
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function findMessageById(id: string): MessageItem | undefined {
  return messages.find((m) => m.id === id)
}

/** 各分类未读数（含总数） */
export function unreadByCategory(userId: string): { total: number; health: number; community: number; system: number; consultation: number } {
  const unread = messages.filter((m) => m.userId === userId && m.readAt === null)
  const countOf = (c: MessageItem['category']) => unread.filter((m) => m.category === c).length
  return {
    total: unread.length,
    health: countOf('health'),
    community: countOf('community'),
    system: countOf('system'),
    consultation: countOf('consultation'),
  }
}

/** 标记单条已读 */
export function markMessageRead(id: string): void {
  const m = messages.find((x) => x.id === id)
  if (m && m.readAt === null) m.readAt = Date.now()
}

/** 标记全部已读 */
export function markAllMessagesRead(userId: string): void {
  messages.forEach((m) => {
    if (m.userId === userId && m.readAt === null) m.readAt = Date.now()
  })
}

/** 批量标记已读（返回实际处理条数） */
export function markMessagesRead(ids: string[]): number {
  let n = 0
  messages.forEach((m) => {
    if (ids.includes(m.id) && m.readAt === null) {
      m.readAt = Date.now()
      n++
    }
  })
  return n
}

/** 批量删除消息（返回实际删除条数） */
export function removeMessages(ids: string[]): number {
  let n = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    if (ids.includes(messages[i].id)) {
      messages.splice(i, 1)
      n++
    }
  }
  return n
}

/* ============================================================
 * 萌宠相册（宠物主端）
 * ============================================================ */
export const albumMedia: AlbumMedia[] = []

/** 视频海报：纯色底 + 🎬 + 标签（无真实视频源，仅海报展示） */
function videoPosterOf(label: string, color: string): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="${color}"/><text x="300" y="250" font-size="150" text-anchor="middle">🎬</text><text x="300" y="390" font-size="40" fill="#fff" text-anchor="middle" font-family="sans-serif">${label}</text></svg>`,
  )}`
}

// 种子：为演示宠物 p1/p2 各生成图片 + 视频（时间倒序，模拟相册历史）
const ALBUM_SEEDS: { petId: string; petName: string }[] = [
  { petId: 'p1', petName: '布丁' },
  { petId: 'p2', petName: '雪球' },
]

ALBUM_SEEDS.forEach(({ petId, petName }) => {
  const now = Date.now()
  const MIN = 60000
  // minutesAgo 越大越旧，数组按时间正序（新在前）
  const spots: { type: 'image' | 'video'; minutesAgo: number }[] = [
    { type: 'image', minutesAgo: 18 },
    { type: 'video', minutesAgo: 60 * 5 },
    { type: 'image', minutesAgo: 60 * 26 },
    { type: 'image', minutesAgo: 60 * 49 },
    { type: 'video', minutesAgo: 60 * 24 * 2 },
    { type: 'image', minutesAgo: 60 * 24 * 3 },
    { type: 'image', minutesAgo: 60 * 24 * 5 },
    { type: 'image', minutesAgo: 60 * 24 * 8 },
    { type: 'image', minutesAgo: 60 * 24 * 12 },
    { type: 'image', minutesAgo: 60 * 24 * 20 },
  ]
  spots.forEach((s, i) => {
    const base = { id: `al_${petId}_${i}`, petId, createdAt: now - s.minutesAgo * MIN }
    if (s.type === 'video') {
      albumMedia.push({
        ...base,
        type: 'video',
        url: '',
        poster: videoPosterOf(`${petName} 视频 ${i}`, pick(postImagePalette)),
        duration: 12 + ((i * 17) % 60),
      })
    } else {
      albumMedia.push({
        ...base,
        type: 'image',
        url: postImageOf(`${petName} 照片 ${i}`, pick(postImagePalette)),
      })
    }
  })
})

/** 某宠物的相册媒体（排除已进回收站），按时间倒序 */
export function albumMediaOf(petId: string): AlbumMedia[] {
  return albumMedia
    .filter((m) => m.petId === petId && !m.deletedAt)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function findAlbumMediaById(id: string): AlbumMedia | undefined {
  return albumMedia.find((m) => m.id === id)
}

/** 回收站：这些宠物下已软删除的相册媒体，按删除时间倒序 */
export function albumTrashOf(petIds: string[]): AlbumMedia[] {
  return albumMedia
    .filter((m) => petIds.includes(m.petId) && m.deletedAt)
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
}

const ALBUM_TRASH_TTL = 30 * 86400000

/** 惰性清理：移除回收站中删除已超过 1 个月的媒体 */
export function purgeExpiredAlbumTrash(): void {
  const now = Date.now()
  for (let i = albumMedia.length - 1; i >= 0; i--) {
    const m = albumMedia[i]
    if (m.deletedAt && now - m.deletedAt > ALBUM_TRASH_TTL) albumMedia.splice(i, 1)
  }
}

/* ============================================================
 * 系统管理（平台运营端）
 * ============================================================ */
export const sysUsers: SysUser[] = []
export const sysRoles: SysRole[] = []
export const sysMenus: SysMenu[] = []
export const dictTypes: DictType[] = []
export const dictItems: DictItem[] = []
export const loginLogs: LoginLog[] = []
export const terminals: Terminal[] = []

const sysNow = Date.now()
const sysDay = 86400000

// 菜单（镜像平台真实菜单结构，parentId 关联成树）
const MENU_SEEDS: Array<Omit<SysMenu, 'children'>> = [
  { id: 'm1', parentId: null, name: '工作台', type: 'dir', icon: 'TrendCharts', path: '/admin/dashboard', perm: '', sort: 1, visible: true, status: 'active' },
  { id: 'm2', parentId: null, name: 'BI 报表', type: 'dir', icon: 'DataAnalysis', path: '/admin/bi', perm: '', sort: 2, visible: true, status: 'active' },
  { id: 'm24', parentId: 'm2', name: '运营监控', type: 'menu', icon: 'Odometer', path: '/admin/bi/monitor', perm: 'admin:bi:monitor:list', sort: 1, visible: true, status: 'active' },
  { id: 'm25', parentId: 'm2', name: '设备报表', type: 'menu', icon: 'Cpu', path: '/admin/bi/device', perm: 'admin:bi:device:list', sort: 2, visible: true, status: 'active' },
  { id: 'm26', parentId: 'm2', name: '宠物监控', type: 'menu', icon: 'Coin', path: '/admin/bi/pet', perm: 'admin:bi:pet:list', sort: 3, visible: true, status: 'active' },
  { id: 'm27', parentId: 'm2', name: '宠物医院', type: 'menu', icon: 'FirstAidKit', path: '/admin/bi/hospital', perm: 'admin:bi:hospital:list', sort: 4, visible: true, status: 'active' },
  { id: 'm4', parentId: null, name: '设备管理', type: 'dir', icon: 'Monitor', path: '/admin/devices', perm: '', sort: 4, visible: true, status: 'active' },
  { id: 'm28', parentId: 'm4', name: '设备主档案', type: 'menu', icon: 'Files', path: '/admin/devices/archive', perm: 'admin:device:archive:list', sort: 1, visible: true, status: 'active' },
  { id: 'm29', parentId: 'm4', name: '固件包管理', type: 'menu', icon: 'Upload', path: '/admin/devices/firmware', perm: 'admin:device:firmware:list', sort: 2, visible: true, status: 'active' },
  { id: 'm30', parentId: 'm4', name: '激活设备管理', type: 'menu', icon: 'Cpu', path: '/admin/devices/active', perm: 'admin:device:active:list', sort: 3, visible: true, status: 'active' },
  { id: 'm5', parentId: null, name: '用户管理', type: 'dir', icon: 'User', path: '/admin/users', perm: '', sort: 5, visible: true, status: 'active' },
  { id: 'm6', parentId: null, name: '宠物管理', type: 'dir', icon: 'Coin', path: '/admin/pets', perm: '', sort: 6, visible: true, status: 'active' },
  { id: 'm21', parentId: 'm6', name: '宠物档案', type: 'menu', icon: 'Document', path: '/admin/pets/archive', perm: 'admin:pet:archive:list', sort: 1, visible: true, status: 'active' },
  { id: 'm22', parentId: 'm6', name: '健康管理', type: 'menu', icon: 'Monitor', path: '/admin/pets/health', perm: 'admin:pet:health:list', sort: 2, visible: true, status: 'active' },
  { id: 'm23', parentId: 'm6', name: '健康报告', type: 'menu', icon: 'Tickets', path: '/admin/pets/reports', perm: 'admin:pet:report:list', sort: 3, visible: true, status: 'active' },
  { id: 'm7', parentId: null, name: '医生管理', type: 'dir', icon: 'FirstAidKit', path: '/admin/vets', perm: '', sort: 7, visible: true, status: 'active' },
  { id: 'm8', parentId: null, name: '订单管理', type: 'dir', icon: 'List', path: '/admin/orders', perm: '', sort: 8, visible: true, status: 'active' },
  { id: 'm9', parentId: null, name: '订阅套餐', type: 'dir', icon: 'CreditCard', path: '/admin/subscriptions', perm: '', sort: 9, visible: true, status: 'active' },
  // 系统管理组
  { id: 'm10', parentId: null, name: '系统管理', type: 'dir', icon: 'Setting', path: '/admin/system', perm: '', sort: 10, visible: true, status: 'active' },
  { id: 'm11', parentId: 'm10', name: '系统用户', type: 'menu', icon: 'User', path: '/admin/system/users', perm: 'admin:system:user:list', sort: 1, visible: true, status: 'active' },
  { id: 'm12', parentId: 'm10', name: '角色管理', type: 'menu', icon: 'Avatar', path: '/admin/system/roles', perm: 'admin:system:role:list', sort: 2, visible: true, status: 'active' },
  { id: 'm13', parentId: 'm10', name: '菜单管理', type: 'menu', icon: 'Menu', path: '/admin/system/menus', perm: 'admin:system:menu:list', sort: 3, visible: true, status: 'active' },
  { id: 'm14', parentId: 'm10', name: '数据字典', type: 'menu', icon: 'Notebook', path: '/admin/system/dicts', perm: 'admin:system:dict:list', sort: 4, visible: true, status: 'active' },
  { id: 'm15', parentId: 'm10', name: '登录日志', type: 'menu', icon: 'Document', path: '/admin/system/logs', perm: 'admin:system:log:list', sort: 5, visible: true, status: 'active' },
  { id: 'm16', parentId: 'm10', name: '终端管理', type: 'menu', icon: 'Monitor', path: '/admin/system/terminals', perm: 'admin:system:terminal:list', sort: 6, visible: true, status: 'active' },
  { id: 'm3', parentId: 'm10', name: '国际化配置', type: 'menu', icon: 'Connection', path: '/admin/system/i18n', perm: 'admin:i18n:list', sort: 7, visible: true, status: 'active' },
  // 按钮权限
  { id: 'm17', parentId: 'm5', name: '用户新增', type: 'button', icon: '', path: '', perm: 'admin:user:add', sort: 1, visible: false, status: 'active' },
  { id: 'm18', parentId: 'm5', name: '用户删除', type: 'button', icon: '', path: '', perm: 'admin:user:delete', sort: 2, visible: false, status: 'active' },
  { id: 'm19', parentId: 'm11', name: '系统用户新增', type: 'button', icon: '', path: '', perm: 'admin:system:user:add', sort: 1, visible: false, status: 'active' },
  { id: 'm20', parentId: 'm11', name: '系统用户删除', type: 'button', icon: '', path: '', perm: 'admin:system:user:delete', sort: 2, visible: false, status: 'active' },
]
MENU_SEEDS.forEach((m) => sysMenus.push(m))

// 角色
function addRole(data: Omit<SysRole, 'createdAt'>): SysRole {
  const r: SysRole = { ...data, createdAt: sysNow - rand(30, 300) * sysDay }
  sysRoles.push(r)
  return r
}
addRole({
  id: 'r1',
  name: '平台管理员',
  code: 'admin',
  sort: 1,
  status: 'active',
  remark: '拥有全部菜单权限',
  menuIds: sysMenus.map((m) => m.id),
})
addRole({
  id: 'r2',
  name: '运营专员',
  code: 'operator',
  sort: 2,
  status: 'active',
  remark: '负责运营与内容管理',
  menuIds: ['m1', 'm2', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm14', 'm15', 'm17', 'm18', 'm19', 'm21', 'm22', 'm23', 'm28', 'm29', 'm30'],
})
addRole({
  id: 'r3',
  name: '审计员',
  code: 'auditor',
  sort: 3,
  status: 'disabled',
  remark: '只读审计访问',
  menuIds: ['m1', 'm2', 'm10', 'm15'],
})

// 系统用户
function addSysUser(data: Partial<SysUser> & Pick<SysUser, 'username' | 'name' | 'roleId'>): SysUser {
  const u: SysUser = {
    id: uid('su'),
    phone: '',
    email: '',
    status: 'active',
    lastLoginAt: null,
    createdAt: sysNow - rand(3, 90) * sysDay,
    ...data,
  }
  sysUsers.push(u)
  return u
}
addSysUser({ username: 'ops_wang', name: '王静', roleId: 'r1', phone: '13800001001', email: 'wangjing@shuxinpet.com', lastLoginAt: sysNow - 2 * 3600000 })
addSysUser({ username: 'ops_zhang', name: '张伟', roleId: 'r2', phone: '13800001002', email: 'zhangwei@shuxinpet.com', lastLoginAt: sysNow - 5 * 3600000 })
addSysUser({ username: 'audit_li', name: '李娜', roleId: 'r3', phone: '13800001003', email: 'lina@shuxinpet.com', status: 'disabled', lastLoginAt: null })
addSysUser({ username: 'ops_zhao', name: '赵磊', roleId: 'r2', phone: '13800001004', email: 'zhaolei@shuxinpet.com', lastLoginAt: sysNow - 26 * 3600000 })

// 数据字典
function addDictType(data: Omit<DictType, 'createdAt'>): DictType {
  const t: DictType = { ...data, createdAt: sysNow - rand(30, 200) * sysDay }
  dictTypes.push(t)
  return t
}
addDictType({ id: 'd1', name: '性别', type: 'gender', remark: '宠物性别' })
addDictType({ id: 'd2', name: '用户状态', type: 'user_status', remark: '账号启用状态' })
addDictType({ id: 'd3', name: '登录状态', type: 'login_status', remark: '登录日志结果' })
addDictType({ id: 'd4', name: '终端类型', type: 'terminal_type', remark: '客户端终端类型' })

function addDictItem(data: Omit<DictItem, 'id'>): DictItem {
  const it: DictItem = { id: uid('di'), ...data }
  dictItems.push(it)
  return it
}
addDictItem({ typeId: 'd1', label: '弟弟', value: 'male', sort: 1, status: 'active', extValue: '{"emoji":"♂","icon":"mars"}' })
addDictItem({ typeId: 'd1', label: '妹妹', value: 'female', sort: 2, status: 'active', extValue: '{"emoji":"♀","icon":"venus"}' })
addDictItem({ typeId: 'd2', label: '启用', value: 'active', sort: 1, status: 'active', extValue: '{"color":"success"}' })
addDictItem({ typeId: 'd2', label: '禁用', value: 'disabled', sort: 2, status: 'disabled', extValue: '{"color":"danger"}' })
addDictItem({ typeId: 'd3', label: '成功', value: 'success', sort: 1, status: 'active' })
addDictItem({ typeId: 'd3', label: '失败', value: 'failed', sort: 2, status: 'active' })
addDictItem({ typeId: 'd4', label: '移动端 APP', value: 'app', sort: 1, status: 'active', extValue: '{"os":"iOS/Android"}' })
addDictItem({ typeId: 'd4', label: 'H5', value: 'h5', sort: 2, status: 'active' })
addDictItem({ typeId: 'd4', label: '小程序', value: 'mini', sort: 3, status: 'active', extValue: '{"platform":"wechat"}' })
addDictItem({ typeId: 'd4', label: 'PC 端', value: 'pc', sort: 4, status: 'active', extValue: '{"os":"Windows/macOS"}' })

// 登录日志
const LOG_SEEDS: Array<Omit<LoginLog, 'id' | 'loginAt'>> = [
  { username: 'ops_wang', ip: '223.104.10.18', location: '中国·上海', browser: 'Chrome 126', os: 'Windows 11', status: 'success', message: '登录成功' },
  { username: 'ops_zhang', ip: '114.92.72.30', location: '中国·上海', browser: 'Safari 17', os: 'macOS 14', status: 'success', message: '登录成功' },
  { username: 'unknown', ip: '203.0.113.9', location: '中国·北京', browser: 'Chrome 125', os: 'Windows 10', status: 'failed', message: '密码错误' },
  { username: 'ops_wang', ip: '223.104.10.18', location: '中国·上海', browser: 'Chrome 126', os: 'Windows 11', status: 'success', message: '登录成功' },
  { username: 'audit_li', ip: '120.53.99.6', location: '中国·广东', browser: 'Edge 126', os: 'Windows 11', status: 'success', message: '登录成功' },
  { username: 'ops_zhang', ip: '114.92.72.30', location: '中国·上海', browser: 'Safari 17', os: 'macOS 14', status: 'success', message: '登录成功' },
  { username: 'unknown', ip: '198.51.100.44', location: '海外', browser: 'Edge 125', os: 'Windows 11', status: 'failed', message: '账号不存在' },
  { username: 'ops_zhao', ip: '39.144.0.66', location: '中国·浙江', browser: 'Chrome 126', os: 'Android 14', status: 'success', message: '登录成功' },
  { username: 'ops_wang', ip: '223.104.10.18', location: '中国·上海', browser: 'Chrome 126', os: 'Windows 11', status: 'success', message: '登录成功' },
  { username: 'ops_zhang', ip: '114.92.72.30', location: '中国·上海', browser: 'Safari 17', os: 'macOS 14', status: 'failed', message: '密码错误' },
  { username: 'audit_li', ip: '120.53.99.6', location: '中国·广东', browser: 'Edge 126', os: 'Windows 11', status: 'success', message: '登录成功' },
  { username: 'ops_zhao', ip: '39.144.0.66', location: '中国·浙江', browser: 'Chrome 126', os: 'Android 14', status: 'success', message: '登录成功' },
  { username: 'unknown', ip: '45.66.33.21', location: '海外', browser: 'Chrome 120', os: 'Windows 10', status: 'failed', message: '验证码错误' },
  { username: 'ops_wang', ip: '223.104.10.18', location: '中国·上海', browser: 'Chrome 126', os: 'Windows 11', status: 'success', message: '登录成功' },
]
LOG_SEEDS.forEach((s, i) => {
  loginLogs.push({ ...s, id: `ll${i + 1}`, loginAt: sysNow - (i + 1) * 3 * 3600000 })
})

// 终端
function addTerminal(data: Omit<Terminal, 'id' | 'updatedAt'>): Terminal {
  const t: Terminal = { id: uid('tm'), updatedAt: sysNow - rand(2, 60) * sysDay, ...data }
  terminals.push(t)
  return t
}
addTerminal({ name: '宠物主 App', code: 'pet-app', type: 'app', latestVersion: '2.4.0', downloadUrl: 'https://apps.apple.com/cn/app/pet-s1/id0000000001', status: 'active', remark: 'iOS / Android' })
addTerminal({ name: '医生端 H5', code: 'doctor-h5', type: 'h5', latestVersion: '1.8.2', downloadUrl: 'https://doctor.shuxinpet.com', status: 'active', remark: '' })
addTerminal({ name: '宠物主小程序', code: 'pet-mini', type: 'mini', latestVersion: '1.2.1', downloadUrl: 'wx:gh_2a1b3c4d5e', status: 'active', remark: '微信小程序' })
addTerminal({ name: '运营端 PC', code: 'admin-pc', type: 'pc', latestVersion: '1.0.5', downloadUrl: 'https://admin.shuxinpet.com', status: 'disabled', remark: '' })

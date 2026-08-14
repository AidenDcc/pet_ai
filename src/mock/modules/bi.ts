import { defineMock, MockError, requireRole } from '../helper'
import {
  devices,
  pets,
  consultations,
  reports,
  dailyAgg,
  findVetByUserId,
  findPetById,
  findUserById,
} from '../db'
import type {
  AdminBiDeviceData,
  AdminBiHospitalData,
  AdminBiMonitorData,
  AdminBiPetData,
  BiKpi,
  BiProvinceValue,
} from '@/types'

function shortDay(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a: number, b: number): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

/* ============================================================
 * 确定性数据生成（平台运营端 BI 用）
 * 同一 (salt, index) 恒定，保证同一会话内刷新数值不跳动；
 * mock db 仅整页刷新时重建，因此数值可复现。
 * ============================================================ */

/** 确定性伪随机 0..1 */
function seed(salt: string, i = 0): number {
  let h = 7
  const s = `${salt}:${i}`
  for (let k = 0; k < s.length; k++) h = (h * 131 + s.charCodeAt(k)) % 2147483647
  return (h % 1000) / 1000
}

/** 生成 days 天日序列：base × (1 + 正弦波 + 噪声 + 缓慢增长) */
function dailySeries(
  days: number,
  base: number,
  salt: string,
  opts: { wave?: number; noise?: number; grow?: number } = {},
): number[] {
  const { wave = 0.12, noise = 0.1, grow = 0.012 } = opts
  const phase = seed(salt, -1) * Math.PI * 2
  const out: number[] = []
  for (let i = 0; i < days; i++) {
    const w = Math.sin((i / Math.max(1, days - 1)) * Math.PI * 2 + phase) * wave
    const n = (seed(salt, i) - 0.5) * 2 * noise
    const g = (i - days * 0.55) * grow
    out.push(Math.max(1, Math.round(base * (1 + w + n + g))))
  }
  return out
}

/** 浮点日序列（保留 1 位小数，如平均响应分钟） */
function dailyFloatSeries(
  days: number,
  base: number,
  salt: string,
  opts: { wave?: number; noise?: number } = {},
): number[] {
  const { wave = 0.1, noise = 0.08 } = opts
  const phase = seed(salt, -1) * Math.PI * 2
  const out: number[] = []
  for (let i = 0; i < days; i++) {
    const w = Math.sin((i / Math.max(1, days - 1)) * Math.PI * 2 + phase) * wave
    const n = (seed(salt, i) - 0.5) * 2 * noise
    out.push(Math.max(0.5, Math.round(base * (1 + w + n) * 10) / 10))
  }
  return out
}

/** 近7日均值相对前7日均值的环比百分比（1 位小数） */
function deltaOf(series: number[]): number {
  if (series.length < 14) return 0
  const last7 = series.slice(-7).reduce((s, v) => s + v, 0)
  const prev7 = series.slice(-14, -7).reduce((s, v) => s + v, 0)
  if (!prev7) return 0
  return Math.round(((last7 - prev7) / prev7) * 1000) / 10
}

/** 由日序列快照生成 KPI（value 取最新一天，delta 用近7日均值环比） */
function kpiFromSeries(
  labelKey: string,
  base: number,
  salt: string,
  opts: { period?: 'week' | 'month'; unit?: string; wave?: number; noise?: number; grow?: number } = {},
): BiKpi {
  const series = dailySeries(30, base, salt, opts)
  return {
    labelKey,
    value: series[series.length - 1],
    unit: opts.unit,
    deltaPct: deltaOf(series),
    period: opts.period ?? 'week',
  }
}

/** 近 30 天日期序列（旧 → 新） */
function lastNDays(n: number): number[] {
  const now = Date.now()
  const arr: number[] = []
  for (let i = n - 1; i >= 0; i--) arr.push(now - i * 86400000)
  return arr
}

/** 34 个省级行政区（短名，ChinaMapChart 内按 feature.name 包含匹配） */
const PROVINCES = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北',
  '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南', '西藏',
  '陕西', '甘肃', '青海', '宁夏', '新疆', '台湾', '香港', '澳门',
]
/** 各省相对权重（人口/经济靠前省靠前） */
const PROVINCE_WEIGHTS = [
  46, 32, 66, 34, 30, 42, 26, 30,
  50, 92, 86, 58, 50, 42, 84, 78, 64,
  62, 96, 40, 18, 34, 74, 34, 32, 8,
  42, 26, 10, 12, 20, 14, 10, 6,
]

/** 按权重 + 确定性噪声把总量分配到 34 省 */
function provinceDistribution(total: number, salt: string): BiProvinceValue[] {
  const seeded = PROVINCE_WEIGHTS.map((w, i) => w * (0.75 + 0.5 * seed(salt, i)))
  const ssum = seeded.reduce((s, x) => s + x, 0)
  return PROVINCES.map((name, i) => ({
    name,
    value: Math.max(1, Math.round((seeded[i] / ssum) * total)),
  }))
}

const HOSPITAL_POOL = [
  '安心宠物医院', '萌宠之家诊疗中心', '爱宠动物医院', '暖阳宠物诊所',
  '宠爱一生宠物医院', '皇家宠物医院', '优宠专科医院', '仁爱动物医院',
  '康宠诊疗中心', '宠物之家动物医院', '瑞鹏宠物医院', '萌宠守护医院',
  '宠一生动物诊所', '百惠宠物医院', '青峰宠物诊疗中心', '和美动物医院',
]

const DOCTOR_POOL = [
  '陈思远', '李晓璐', '王建国', '赵倩', '林俊杰', '黄雅婷', '吴磊', '周雨',
  '孙志强', '郑晓雯', '冯刚', '许婷婷', '何健', '罗敏', '高翔', '梁雪',
]

/** 医院/医生点赞排行榜（确定性 TOP10，值递减） */
function rankedPool(pool: string[], top: number, salt: string): BiProvinceValue[] {
  const order = pool.map((name, i) => ({ name, v: seed(salt, i) })).sort((a, b) => b.v - a.v)
  const base = 300
  return order.slice(0, top).map((o, i) => ({
    name: o.name,
    value: Math.max(20, Math.round(base * (1 - i * 0.075) * (0.85 + 0.3 * o.v))),
  }))
}

const alertPool: { level: 'warn' | 'danger'; content: string }[] = [
  { level: 'warn', content: '夜间心率偏高，建议减少睡前兴奋活动并观察 3 天曲线' },
  { level: 'warn', content: '活动量较上周下降约 18%，建议增加每日遛弯时长' },
  { level: 'danger', content: '体温持续偏高，建议尽快就医排查' },
  { level: 'warn', content: '血氧饱和度轻度偏低，建议保持运动并复测' },
  { level: 'danger', content: '呼吸频率连续超标，需关注呼吸道健康' },
  { level: 'warn', content: '睡眠时长偏短，注意营造安静的睡眠环境' },
]

/** 在线宠物（绑定设备且在线）的最近每日汇总 */
function onlinePets() {
  return pets.filter((p) => {
    const d = devices.find((x) => x.boundPetId === p.id)
    return d && d.status === 'online'
  })
}

defineMock([
  /* ---------------- 运营端 BI：运营监控 ---------------- */
  {
    method: 'get',
    path: '/admin/bi/monitor',
    handler: (ctx) => {
      requireRole(ctx, 'admin')

      const days = lastNDays(30)
      // 用户趋势
      const dau = dailySeries(30, 2900, 'monitor-dau')
      const newUsers = dailySeries(30, 420, 'monitor-new-user')
      const userTrend: AdminBiMonitorData['userTrend'] = days.map((ts, i) => ({
        day: shortDay(ts),
        dau: dau[i],
        newUsers: newUsers[i],
      }))
      // 设备趋势：每日活跃 + 累计激活
      const activeDevices = dailySeries(30, 7600, 'monitor-active-device')
      const dailyActivated = dailySeries(30, 240, 'monitor-activated-day', { wave: 0.06, noise: 0.08 })
      let acc = 9400
      const activatedCum = dailyActivated.map((v) => (acc += v))
      const deviceTrend: AdminBiMonitorData['deviceTrend'] = days.map((ts, i) => ({
        day: shortDay(ts),
        active: activeDevices[i],
        activated: activatedCum[i],
      }))

      const activatedTotal = activatedCum[activatedCum.length - 1]

      const kpis: BiKpi[] = [
        kpiFromSeries('admin.biMonitor.kpiDau', 2900, 'monitor-dau'),
        kpiFromSeries('admin.biMonitor.kpiTotalUsers', 28600, 'monitor-total-user', { wave: 0.03, noise: 0.02, period: 'month' }),
        kpiFromSeries('admin.biMonitor.kpiTotalPets', 15200, 'monitor-total-pet', { wave: 0.03, noise: 0.02, period: 'month' }),
        { labelKey: 'admin.biMonitor.kpiActivatedDevices', value: activatedTotal, deltaPct: deltaOf(activatedCum), period: 'month' },
        kpiFromSeries('admin.biMonitor.kpiActiveDevices', 7600, 'monitor-active-device'),
        kpiFromSeries('admin.biMonitor.kpiVets', 460, 'monitor-vet', { wave: 0.04, noise: 0.03, period: 'month' }),
        kpiFromSeries('admin.biMonitor.kpiHospitals', 820, 'monitor-hospital', { wave: 0.04, noise: 0.03, period: 'month' }),
      ]

      // 健康告警（轮播）
      const now = Date.now()
      const alertPets = pets.slice(0, 12)
      const alerts: AdminBiMonitorData['alerts'] = alertPets
        .map((p, i) => ({
          id: `al_${p.id}`,
          petName: p.name,
          level: alertPool[i % alertPool.length].level,
          content: alertPool[i % alertPool.length].content,
          time: now - (6 - (i % 6)) * 3600000,
        }))
        .slice(0, 6)

      const retention: AdminBiMonitorData['retention'] = [
        { labelKey: 'admin.biMonitor.ret7', value: 43 },
        { labelKey: 'admin.biMonitor.ret15', value: 32 },
        { labelKey: 'admin.biMonitor.ret30', value: 24 },
        { labelKey: 'admin.biMonitor.ret90', value: 16 },
        { labelKey: 'admin.biMonitor.ret180', value: 9 },
      ]

      return {
        kpis,
        userTrend,
        deviceTrend,
        provinceDevices: provinceDistribution(activatedTotal, 'monitor-province'),
        retention,
        alerts,
        hospitalConsultRank: rankedPool(HOSPITAL_POOL, 8, 'monitor-consult-rank'),
      }
    },
  },

  /* ---------------- 运营端 BI：设备报表 ---------------- */
  {
    method: 'get',
    path: '/admin/bi/device',
    handler: (ctx) => {
      requireRole(ctx, 'admin')

      const days = lastNDays(30)
      const newDaily = dailySeries(30, 96, 'device-new-day', { wave: 0.14, noise: 0.16 })
      let total = 12500
      const totalCum = newDaily.map((v) => (total += v))
      const newTrend: AdminBiDeviceData['newTrend'] = days.map((ts, i) => ({
        day: shortDay(ts),
        newDevices: newDaily[i],
        totalDevices: totalCum[i],
      }))

      const onlineDaily = dailySeries(30, 9200, 'device-online-day', { wave: 0.1, noise: 0.06 })
      const avgDurationDaily = dailyFloatSeries(30, 326, 'device-duration', { wave: 0.08, noise: 0.05 })
      const onlineTrend: AdminBiDeviceData['onlineTrend'] = days.map((ts, i) => ({
        day: shortDay(ts),
        online: onlineDaily[i],
        avgDuration: avgDurationDaily[i],
      }))

      const totalDevices = totalCum[totalCum.length - 1]
      const online = onlineDaily[onlineDaily.length - 1]
      const kpis: BiKpi[] = [
        { labelKey: 'admin.biDevice.kpiTotal', value: totalDevices, deltaPct: deltaOf(totalCum), period: 'month' },
        { labelKey: 'admin.biDevice.kpiOnline', value: online, deltaPct: deltaOf(onlineDaily), period: 'week' },
        { labelKey: 'admin.biDevice.kpiOffline', value: totalDevices - online, deltaPct: -deltaOf(onlineDaily), period: 'week' },
        { labelKey: 'admin.biDevice.kpiMonthNew', value: newDaily.reduce((s, v) => s + v, 0), deltaPct: deltaOf(newDaily), period: 'month' },
        { labelKey: 'admin.biDevice.kpiAvgDuration', value: avgDurationDaily[avgDurationDaily.length - 1], unit: 'admin.bi.minutes', deltaPct: deltaOf(avgDurationDaily.map((v) => Math.round(v * 10))), period: 'week' },
      ]

      // 异常设备：从真实设备过滤 + 名称解析
      const abnormalDevices: AdminBiDeviceData['abnormalDevices'] = []
      devices.forEach((d, i) => {
        const petName = d.boundPetId ? findPetById(d.boundPetId)?.name ?? '未绑定' : '未绑定'
        if (d.status === 'unbound') {
          abnormalDevices.push({
            id: d.id, sn: d.sn, name: d.name, petName,
            typeKey: 'admin.biDevice.typeUnbound',
            detail: '设备尚未绑定宠物，无法采集数据',
            lastSyncAt: new Date(d.lastSyncAt).getTime(),
          })
          return
        }
        if (d.battery < 45) {
          abnormalDevices.push({
            id: d.id, sn: d.sn, name: d.name, petName,
            typeKey: 'admin.biDevice.typeLowBattery',
            detail: `当前电量仅 ${d.battery}%，请及时充电`,
            lastSyncAt: new Date(d.lastSyncAt).getTime(),
          })
          return
        }
        if (d.signal < -75) {
          abnormalDevices.push({
            id: d.id, sn: d.sn, name: d.name, petName,
            typeKey: 'admin.biDevice.typeWeakSignal',
            detail: `信号强度 ${d.signal} dBm，建议检查网络环境`,
            lastSyncAt: new Date(d.lastSyncAt).getTime(),
          })
          return
        }
        if (d.status === 'offline') {
          abnormalDevices.push({
            id: d.id, sn: d.sn, name: d.name, petName,
            typeKey: 'admin.biDevice.typeOffline',
            detail: '设备已离线，长时间未上报数据',
            lastSyncAt: new Date(d.lastSyncAt).getTime(),
          })
          return
        }
        void i
      })
      // 排序：最近未同步优先，控制展示数量
      abnormalDevices.sort((a, b) => a.lastSyncAt - b.lastSyncAt)

      return { kpis, newTrend, onlineTrend, abnormalDevices: abnormalDevices.slice(0, 12) }
    },
  },

  /* ---------------- 运营端 BI：宠物监控 ---------------- */
  {
    method: 'get',
    path: '/admin/bi/pet',
    handler: (ctx) => {
      requireRole(ctx, 'admin')

      const days = lastNDays(30)
      const totalPets = 15200
      const newPets = dailySeries(30, 18, 'pet-new-day', { wave: 0.14, noise: 0.16 })
      const abnormalDaily = dailySeries(30, 62, 'pet-abnormal-day', { wave: 0.16, noise: 0.2 })
      const boundPets = 10800

      const kpis: BiKpi[] = [
        { labelKey: 'admin.biPet.kpiNewPets', value: newPets.reduce((s, v) => s + v, 0), deltaPct: deltaOf(newPets), period: 'month' },
        { labelKey: 'admin.biPet.kpiTotalPets', value: totalPets, deltaPct: 2.6, period: 'month' },
        { labelKey: 'admin.biPet.kpiBoundPets', value: boundPets, deltaPct: 1.8, period: 'month' },
        { labelKey: 'admin.biPet.kpiAbnormalToday', value: abnormalDaily[abnormalDaily.length - 1], deltaPct: deltaOf(abnormalDaily), period: 'week' },
      ]

      // 猫/狗分布（按真实宠物比例放大）
      const dogCount = pets.filter((p) => p.species === 'dog').length || 1
      const catCount = pets.filter((p) => p.species === 'cat').length || 1
      const speciesDist: BiProvinceValue[] = [
        { name: '狗', value: dogCount * 360 },
        { name: '猫', value: catCount * 360 },
      ]

      const cities = ['上海', '北京', '广州', '深圳', '成都', '杭州', '武汉', '南京', '重庆', '西安', '苏州', '郑州', '长沙', '东莞']
      const cityRank: BiProvinceValue[] = cities
        .map((name, i) => ({ name, v: seed('pet-city', i) }))
        .sort((a, b) => b.v - a.v)
        .slice(0, 10)
        .map((o, i) => ({ name: o.name, value: Math.round(680 * (1 - i * 0.08)) }))

      const abnormalTop: BiProvinceValue[] = [
        { name: '夜间心率', value: 386 },
        { name: '体温', value: 214 },
        { name: '血氧饱和度', value: 176 },
        { name: '呼吸频率', value: 132 },
        { name: '活动量', value: 98 },
        { name: '睡眠时长', value: 61 },
      ]

      // 平均体征：在线宠物近 30 天每日均值
      const onPets = onlinePets()
      const vitals: AdminBiPetData['avgVitals'] = []
      const exercise: AdminBiPetData['exerciseTrend'] = []
      for (let i = 29; i >= 0; i--) {
        const agg = onPets
          .map((p) => {
            const list = dailyAgg[p.id]
            return list ? list[Math.min(list.length - 1, 89 - i)] : null
          })
          .filter((x): x is NonNullable<typeof x> => Boolean(x))
        if (!agg.length) {
          vitals.push({ day: shortDay(days[29 - i]), temperature: 0, heartRate: 0, spo2: 0, respiratoryRate: 0, calorie: 0 })
          exercise.push({ day: shortDay(days[29 - i]), steps: 0, activeMin: 0, sleep: 0 })
          continue
        }
        const avg = (k: (a: NonNullable<(typeof agg)[number]>) => number) => agg.reduce((s, a) => s + k(a), 0) / agg.length
        const steps = Math.round(avg((a) => a.steps))
        vitals.push({
          day: shortDay(days[29 - i]),
          temperature: Math.round(avg((a) => a.temperature.avg) * 10) / 10,
          heartRate: Math.round(avg((a) => a.heartRate.avg)),
          spo2: Math.round(avg((a) => a.spo2.avg) * 10) / 10,
          respiratoryRate: Math.round(avg((a) => a.respiratoryRate.avg) * 10) / 10,
          calorie: Math.round(steps * 0.045),
        })
        exercise.push({
          day: shortDay(days[29 - i]),
          steps,
          activeMin: Math.max(20, Math.round(steps / 85)),
          sleep: Math.round(avg((a) => a.sleepHours) * 10) / 10,
        })
      }

      // 异常宠物（确定性挑选，避免真实数据全部在正常区间）
      const abnormalPets: AdminBiPetData['abnormalPets'] = []
      const metricPool = [
        { metricKey: 'admin.biPet.metricTemp', detail: '体温 39.8°C，高于参考上限', level: 'danger' as const },
        { metricKey: 'admin.biPet.metricHr', detail: '夜间心率偏高，平均值 165 次/分', level: 'warn' as const },
        { metricKey: 'admin.biPet.metricSpo2', detail: '血氧饱和度 93%，轻度偏低', level: 'warn' as const },
        { metricKey: 'admin.biPet.metricRr', detail: '呼吸频率 42 次/分，持续超标', level: 'danger' as const },
        { metricKey: 'admin.biPet.metricActivity', detail: '活动量较上周下降 21%', level: 'warn' as const },
      ]
      pets
        .filter((_, i) => seed('pet-abnormal', i) > 0.55)
        .slice(0, 8)
        .forEach((p, i) => {
          const m = metricPool[i % metricPool.length]
          abnormalPets.push({
            id: p.id,
            petName: p.name,
            ownerName: findUserById(p.ownerId)?.name ?? '未知',
            species: p.species === 'dog' ? '狗' : '猫',
            metricKey: m.metricKey,
            detail: m.detail,
            updatedAt: days[29 - (i % 5)] + 2 * 3600000,
            level: m.level,
          })
        })

      return {
        kpis,
        speciesDist,
        cityRank,
        abnormalDaily: days.map((ts, i) => ({ day: shortDay(ts), value: abnormalDaily[i] })),
        abnormalTop,
        avgVitals: vitals,
        exerciseTrend: exercise,
        abnormalPets,
      }
    },
  },

  /* ---------------- 运营端 BI：宠物医院 ---------------- */
  {
    method: 'get',
    path: '/admin/bi/hospital',
    handler: (ctx) => {
      requireRole(ctx, 'admin')

      const days = lastNDays(30)
      const consults = dailySeries(30, 268, 'hospital-consults', { wave: 0.15, noise: 0.14 })
      const resolved = consults.map((v, i) => Math.round(v * (0.9 + 0.05 * seed('hospital-resolved', i))))
      const response = dailyFloatSeries(30, 12.6, 'hospital-response', { wave: 0.12, noise: 0.08 })
      const consultTrend: AdminBiHospitalData['consultTrend'] = days.map((ts, i) => ({
        day: shortDay(ts),
        consults: consults[i],
        resolved: resolved[i],
        responseMin: response[i],
      }))

      const hospitals = 820
      const kpis: BiKpi[] = [
        { labelKey: 'admin.biHospital.kpiHospitals', value: hospitals, deltaPct: 2.1, period: 'month' },
        kpiFromSeries('admin.biHospital.kpiOnlineDoctors', 460, 'hospital-doctor', { wave: 0.05, noise: 0.04, period: 'month' }),
        { labelKey: 'admin.biHospital.kpiTodayConsults', value: consults[consults.length - 1], deltaPct: deltaOf(consults), period: 'week' },
        { labelKey: 'admin.biHospital.kpiOverdue', value: 24, deltaPct: -8.3, period: 'week' },
        { labelKey: 'admin.biHospital.kpiAvgResponse', value: response[response.length - 1], unit: 'admin.bi.minutes', deltaPct: deltaOf(response.map((v) => Math.round(v * 10))), period: 'week' },
        { labelKey: 'admin.biHospital.kpiMonthNewHospitals', value: 36, deltaPct: 12.5, period: 'month' },
        { labelKey: 'admin.biHospital.kpiMonthNewDoctors', value: 58, deltaPct: 8.2, period: 'month' },
      ]

      const cooperationDist: BiProvinceValue[] = [
        { name: '设备共建', value: 322 },
        { name: '独家签约', value: 216 },
        { name: '普通入驻', value: 188 },
        { name: '转诊合作', value: 94 },
      ]

      return {
        kpis,
        cooperationDist,
        provinceHospitals: provinceDistribution(hospitals, 'hospital-province'),
        consultTrend,
        likeHospitals: rankedPool(HOSPITAL_POOL, 10, 'hospital-like'),
        likeDoctors: rankedPool(DOCTOR_POOL, 10, 'doctor-like'),
      }
    },
  },

  /* ---------------- 医生端 BI：诊所维度 ---------------- */
  {
    method: 'get',
    path: '/doctor/bi',
    handler: (ctx) => {
      const user = requireRole(ctx, 'doctor')
      const vet = findVetByUserId(user.id)
      if (!vet) throw new MockError('未找到医生档案', 404)

      const consults = consultations.filter((c) => c.doctorId === vet.id && c.status === 'active')
      const petIds = consults.map((c) => c.petId)
      const myPets = pets.filter((p) => petIds.includes(p.id))

      const pending = reports.filter((r) => r.doctorReview === 'pending').length
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const monthReports = reports.filter((r) => r.createdAt >= monthStart.getTime()).length

      // 问诊宠物健康均分
      const petScores = petIds.map((id) => {
        const rl = reports.filter((r) => r.petId === id)
        const pet = findPetById(id)
        return {
          name: pet?.name ?? id,
          score: rl.length ? Math.round(rl.reduce((s, r) => s + r.score, 0) / rl.length) : 0,
        }
      })

      // 患者品种分布（key 供前端按 i18n 翻译）
      const spMap: Record<string, number> = {}
      myPets.forEach((p) => (spMap[p.species] = (spMap[p.species] ?? 0) + 1))
      const speciesDist = Object.entries(spMap).map(([key, value]) => ({ name: key, value }))

      // 报告异常类型分布（本诊所问诊宠物的报告）
      const abnormalMap: Record<string, number> = {}
      reports
        .filter((r) => petIds.includes(r.petId))
        .forEach((r) => r.abnormal.forEach((a) => (abnormalMap[a.label] = (abnormalMap[a.label] ?? 0) + 1)))
      const abnormalDist = Object.entries(abnormalMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      // 近 7 日报告量（本诊所相关）
      const now = Date.now()
      const weeklyReports: { day: string; value: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const day = now - i * 86400000
        weeklyReports.push({
          day: shortDay(day),
          value: reports.filter((r) => petIds.includes(r.petId) && isSameDay(r.createdAt, day)).length,
        })
      }

      // 审核通过率（本诊所相关报告）
      const related = reports.filter((r) => petIds.includes(r.petId))
      const reviewRate = {
        approved: related.filter((r) => r.doctorReview === 'approved').length,
        rejected: related.filter((r) => r.doctorReview === 'rejected').length,
        pending: related.filter((r) => r.doctorReview === 'pending').length,
      }

      return {
        kpis: { patients: myPets.length, consults: consults.length, pending, monthReports },
        petScores,
        speciesDist,
        abnormalDist,
        weeklyReports,
        reviewRate,
      }
    },
  },
])

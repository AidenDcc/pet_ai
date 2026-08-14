import { defineMock, MockError, requireRole, uid } from '../helper'
import { reports, findPetById, findUserById, dailyAgg } from '../db'
import { buildTrend } from './report'
import type { AbnormalItem, PetInfo, ReportItem } from '@/types'

/**
 * 平台端健康报告 AI 生成
 * -----------------------------------------
 * 流程：选择宠物 + 时间段（最多 30 天）→ 聚合周期体征/运动/基线数据 →
 * 按《宠物健康数据分析规则体系（行业修订版 v2.1）》拼装提示词 →
 * 调用 GLM-4.6V-Flash 生成结构化报告。AI 不可达时由本地规则引擎兜底。
 */

const AI_API_URL = 'https://ai.idigitalheart.com:8088/v1/chat/completions'
const AI_API_KEY = import.meta.env.VITE_GLM_API_KEY ?? ''
const AI_MODEL = 'GLM-4.6V-Flash'
const AI_TIMEOUT = 300000
const DAY = 86400000

/* ============================================================
 * 基础工具
 * ============================================================ */

function median(nums: number[]): number {
  if (!nums.length) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** 以 ts 为种子的确定性随机（同一天两次生成结果一致） */
function seeded(seed: number): () => number {
  let t = (seed ^ 0x9e3779b9) >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function ageMonths(birth: string): number {
  const b = new Date(birth)
  const now = new Date()
  return (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
}

function lifeStageOf(pet: PetInfo): string {
  if (pet.isLactating) return 'lactating'
  if (pet.isPregnant) return 'pregnant'
  const months = ageMonths(pet.birthDate)
  if (months < 12) return 'puppy_kitten'
  const years = months / 12
  if ((pet.species === 'dog' && years > 7) || (pet.species === 'cat' && years > 10)) return 'senior'
  return 'adult'
}

function deriveTimeRange(startAt: number, endAt: number): 'day' | 'week' | 'month' {
  const days = (endAt - startAt) / DAY
  if (days <= 1.5) return 'day'
  if (days <= 10) return 'week'
  return 'month'
}

/* ============================================================
 * 数据聚合
 * ============================================================ */

interface VitalsAgg {
  temperature: number
  heartRate: number
  respiratoryRate: number
  spo2: number
  days: number
}

interface ExerciseAgg {
  totalActivity: number
  dailyActivity: number
  stepFreq: number
  stride: number
  speed: number
  durationMin: number
  days: number
}

/** 当日运动指标推导：物种基线 + 当日活动量，确定性生成 */
function dayExercise(pet: PetInfo, ts: number, steps: number): { stepFreq: number; stride: number; speed: number; durationMin: number } {
  const isCat = pet.species === 'cat'
  const baseFreq = isCat ? 45 : 80
  const baseStride = isCat ? 16 : 26
  const rnd = seeded(Math.floor(ts / DAY))
  const active = Math.min(1, steps / 12800)
  return {
    stepFreq: Math.round(baseFreq + active * 60 + (rnd() * 16 - 8)),
    stride: round1(baseStride + active * 12 + (rnd() * 4 - 2)),
    speed: round2(0.3 + active * 1.2 + (rnd() * 0.3 - 0.15)),
    durationMin: Math.round(20 + active * 70 + rnd() * 20),
  }
}

function aggVitals(petId: string, startAt: number, endAt: number): VitalsAgg {
  const days = (dailyAgg[petId] ?? []).filter((d) => d.ts >= startAt && d.ts <= endAt)
  const pick = <T>(f: (d: (typeof days)[number]) => T) => days.map(f)
  return {
    temperature: round1(median(pick((d) => d.temperature.avg))),
    heartRate: Math.round(median(pick((d) => d.heartRate.avg))),
    respiratoryRate: Math.round(median(pick((d) => d.respiratoryRate.avg))),
    spo2: round1(median(pick((d) => d.spo2.avg))),
    days: days.length,
  }
}

function aggExercise(pet: PetInfo, startAt: number, endAt: number): ExerciseAgg {
  const days = (dailyAgg[pet.id] ?? []).filter((d) => d.ts >= startAt && d.ts <= endAt)
  if (!days.length) return { totalActivity: 0, dailyActivity: 0, stepFreq: 0, stride: 0, speed: 0, durationMin: 0, days: 0 }
  const perDay = days.map((d) => ({ ...dayExercise(pet, d.ts, d.steps), steps: d.steps }))
  const totalActivity = days.reduce((s, d) => s + d.steps, 0)
  return {
    totalActivity,
    dailyActivity: Math.round(totalActivity / days.length),
    stepFreq: Math.round(median(perDay.map((p) => p.stepFreq))),
    stride: round1(median(perDay.map((p) => p.stride))),
    speed: round2(median(perDay.map((p) => p.speed))),
    durationMin: Math.round(median(perDay.map((p) => p.durationMin))),
    days: days.length,
  }
}

/** 周期极值与睡眠（metricsSummary 用） */
function aggExtremes(petId: string, startAt: number, endAt: number) {
  const days = (dailyAgg[petId] ?? []).filter((d) => d.ts >= startAt && d.ts <= endAt)
  if (!days.length) {
    return {
      tempMax: 0, tempMin: 0, hrMax: 0, hrMin: 0, respMax: 0, respMin: 0, spo2Min: 0, sleep: 0,
    }
  }
  return {
    tempMax: round1(Math.max(...days.map((d) => d.temperature.max))),
    tempMin: round1(Math.min(...days.map((d) => d.temperature.min))),
    hrMax: Math.max(...days.map((d) => d.heartRate.max)),
    hrMin: Math.min(...days.map((d) => d.heartRate.min)),
    respMax: Math.max(...days.map((d) => d.respiratoryRate.max)),
    respMin: Math.min(...days.map((d) => d.respiratoryRate.min)),
    spo2Min: round1(Math.min(...days.map((d) => d.spo2.min))),
    sleep: round1(median(days.map((d) => d.sleepHours))),
  }
}

/** 基线窗口天数：day=30 / week=90 / month=180 */
function baselineWindow(timeRange: 'day' | 'week' | 'month'): number {
  return timeRange === 'day' ? 30 : timeRange === 'week' ? 90 : 180
}

/** 卡路里：每日步数 × 0.05 kcal（与体征模块口径一致） */
function dailyCalorie(exercise: ExerciseAgg): number {
  return Math.round(exercise.dailyActivity * 0.05)
}

function derFactor(pet: PetInfo, lifeStage: string): number {
  const dog = pet.species === 'dog'
  const months = ageMonths(pet.birthDate)
  if (lifeStage === 'pregnant') return dog ? 2.5 : 2.2
  if (lifeStage === 'lactating') return dog ? 4.0 : 3.0
  if (months < 4) return dog ? 3.0 : 2.5
  if (months < 12) return 2.0
  const years = months / 12
  if ((dog && years > 7) || (!dog && years > 10)) return dog ? 1.3 : 1.1
  return pet.sterilized ? (dog ? 1.6 : 1.2) : (dog ? 1.8 : 1.4)
}

/* ============================================================
 * AI 提示词（规则文档 §8）
 * ============================================================ */

const SYSTEM_PROMPT = `你是一位资深宠物健康分析师，具备兽医临床诊断学专业知识。
你的任务是根据输入的宠物生理数据、运动数据和主人观察，按照《宠物健康数据分析规则体系（行业修订版）》生成结构化健康报告。

核心原则：
1. 严格依据规则进行计算和分级，不臆测、不夸大
2. 生理指标按体型/年龄分层判定，运动指标按个体基线对比
3. 支持多时间粒度（day/week/month），各粒度容错阈值不同
4. 主人主观观察作为临床线索，可触发评级上调
5. 存在一票升级规则中的任意一项，直接判定D级
6. 报告语言应专业、清晰、易懂，避免过度医学术语
7. 所有数值计算必须展示过程，确保可审计
8. 时间粒度为 week/month 时，必须强调"趋势性"结论，避免用单日逻辑`

const TIME_RANGE_LABEL: Record<string, string> = { day: 'day（单日）', week: 'week（近7天）', month: 'month（近30天）' }

function buildUserPrompt(input: Record<string, unknown>): string {
  const { timeRange, pet, vitals, exercise, baseline, prev, calorie } = input as {
    timeRange: 'day' | 'week' | 'month'
    pet: PetInfo
    vitals: VitalsAgg
    exercise: ExerciseAgg
    baseline: ExerciseAgg
    prev: { vitals: VitalsAgg; exercise: ExerciseAgg }
    calorie: { rer: number; der: number; actual: number }
  }
  const months = ageMonths(pet.birthDate)
  return `请根据以下宠物健康数据生成${TIME_RANGE_LABEL[timeRange]}健康报告：

【分析时间粒度】${timeRange}
（day=单日，week=近7天，month=近30天）

【宠物基础信息】
- 物种：${pet.species}
- 品种：${pet.breed}
- 体重：${pet.weight} kg
- 月龄：${months}
- 性别：${pet.gender}，是否绝育：${pet.sterilized}
- 生命阶段：${lifeStageOf(pet)}
- 目标体重：无

【${timeRange}生理指标（已聚合）】
- 体温：${vitals.temperature} ℃（有效数据点：${vitals.days}）
- 静息心率：${vitals.heartRate} 次/分（有效数据点：${vitals.days}）
- 血氧饱和度：${vitals.spo2} %（有效数据点：${vitals.days}）
- 静息呼吸频率：${vitals.respiratoryRate} 次/分（有效数据点：${vitals.days}）

【${timeRange}运动指标（已聚合）】
- 步频：${exercise.stepFreq} 步/分
- 平均步幅：${exercise.stride} cm
- 左/右步幅：暂无
- 步态异常标记：false
- 运动速度：${exercise.speed} m/s
- 运动时长：${exercise.durationMin} 分钟/日
- 有效运动数据天数：${exercise.days}

【历史基线数据】
- 基线步频：${baseline.stepFreq} 步/分
- 基线步幅：${baseline.stride} cm
- 基线速度：${baseline.speed} m/s
- 基线数据天数：${baseline.days} 天

【设备卡路里数据（日均）】
- 数据类型：active（活动消耗）
- 日均数值：${calorie.actual} kcal（RER=${Math.round(calorie.rer)}，DER=${Math.round(calorie.der)}）

【上一同期趋势数据】
- 上期体温：${prev.vitals.temperature}
- 上期心率：${prev.vitals.heartRate}
- 上期血氧：${prev.vitals.spo2}
- 上期呼吸：${prev.vitals.respiratoryRate}
- 上期步频：${prev.exercise.stepFreq}
- 上期步幅：${prev.exercise.stride}
- 上期速度：${prev.exercise.speed}
- 上期日均卡路里：${Math.round(prev.exercise.dailyActivity * 0.05)}

【主人主观观察（${timeRange}内最严重记录）】
- 精神状态：normal
- 食欲：normal
- 饮水：normal
- 排尿：normal
- 大便形态：normal
- 大便颜色：normal_brown
- 被毛皮肤：normal
- 呕吐：false
- 其他观察：（无）

【环境标记】
- 极端天气：false
- 时段内生病/服药：false
- 应激事件：无

请严格按照以下步骤处理：
STEP 1：计算RER和DER（RER = 70 × 体重^0.75；按 life_stage 匹配系数得 DER；处理 active 类型：日均总消耗 = actual + RER；按 time_range 阈值判定卡路里等级）
STEP 2：生理指标分级（体温通用标准；心率按体型+年龄修正；血氧通用标准；呼吸按体型/物种）
STEP 3：运动指标分级（与基线对比偏离百分比，按 time_range 阈值；注意步态与对称性）
STEP 4：趋势分析（与 prev_period 对比，判定 stable/worsening/improving）
STEP 5：主人观察整合（本例全部 normal，不触发上调）
STEP 6：综合评级（按权重计算加权总分，按 time_range 阈值输出 A/B/C/D；检查一票升级规则）
STEP 7：归因与建议（单指标归因、多指标关联归因、按评级与 time_range 输出建议模板、就医建议）

请只输出以下格式的JSON（不要输出任何其他文字或 markdown 代码块）：
{
  "time_range": "day/week/month",
  "overall_grade": "A/B/C/D",
  "overall_score": 0.0,
  "grade_description": "...",
  "next_review_days": 0,
  "data_credibility": "high/medium/low/insufficient",
  "indicators": {
    "temperature": {"level": "正常/关注/异常/危急", "value": 0, "reference_range": "...", "data_points": 0, "suggestion": "..."},
    "heart_rate": {"level": "...", "value": 0, "reference_range": "...", "suggestion": "..."},
    "spo2": {"level": "...", "value": 0, "reference_range": "...", "suggestion": "..."},
    "respiratory_rate": {"level": "...", "value": 0, "reference_range": "...", "suggestion": "..."},
    "calories": {"level": "...", "rer": 0, "der": 0, "actual": 0, "deviation_pct": 0, "suggestion": "..."},
    "step_frequency": {"level": "...", "value": 0, "baseline": 0, "deviation_pct": 0, "suggestion": "..."},
    "step_length": {"level": "...", "value": 0, "baseline": 0, "deviation_pct": 0, "symmetry": "...", "suggestion": "..."},
    "gait": {"level": "...", "description": "...", "suggestion": "..."},
    "movement_speed": {"level": "...", "value": 0, "baseline": 0, "deviation_pct": 0, "suggestion": "..."}
  },
  "abnormal_indicators": [],
  "root_cause_analysis": "...",
  "recommendations": [],
  "vet_referral": {"needed": false, "urgency": "routine/urgent/emergency", "suggested_exams": [], "warning": "..."},
  "report_summary": "...",
  "report_detail": "...",
  "calculation_notes": "...",
  "report_generated_at": "..."
}

注意事项：
- calculation_notes 必须包含 RER/DER 计算过程与各指标偏离百分比计算过程
- report_detail 使用 Markdown 格式，包含：摘要、各指标详情、趋势分析、综合结论、建议清单、就医提示（如需要）
- 所有建议必须具体可执行
- time_range 为 week/month 时，report_detail 中必须强调"本周/本月趋势"，避免使用"今日"表述
- 若基线天数不足，在运动指标部分明确说明"基线建立中，分级仅供参考"
- 若数据点不足，在对应指标处标记"数据可信度低"`
}

/* ============================================================
 * AI 客户端
 * ============================================================ */

async function callAi(system: string, user: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT)
  try {
    const resp = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    })
    if (!resp.ok) throw new Error(`AI 接口返回 ${resp.status}`)
    const json = await resp.json()
    const content = json?.choices?.[0]?.message?.content
    if (!content) throw new Error('AI 返回内容为空')
    return String(content)
  } finally {
    clearTimeout(timer)
  }
}

function extractJson(content: string): unknown {
  const trimmed = content.trim()
  // GLM 结构化输出框：<|begin_of_box|>{...}<|end_of_box|>
  const boxed = trimmed.match(/<\|begin_of_box\|>([\s\S]*?)<\|end_of_box\|>/)
  // markdown 代码块
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = (boxed ? boxed[1] : fenced ? fenced[1] : trimmed).trim()
  try {
    return JSON.parse(raw)
  } catch {
    // 兼容前后有说明文字的情况：截取最外层 JSON 对象
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start !== -1 && end > start) return JSON.parse(raw.slice(start, end + 1))
    throw new Error('AI 返回内容不是有效 JSON')
  }
}

/* ============================================================
 * AI 结果 → ReportItem
 * ============================================================ */

const INDICATOR_LABEL: Record<string, string> = {
  temperature: '体温',
  heart_rate: '心率',
  spo2: '血氧饱和度',
  respiratory_rate: '呼吸频率',
  calories: '卡路里',
  step_frequency: '步频',
  step_length: '步幅',
  gait: '步态',
  movement_speed: '运动速度',
}

const GRADE_SCORE: Record<string, number> = { A: 95, B: 86, C: 73, D: 52 }
const GRADE_DESC: Record<string, string> = {
  A: '生理机能稳定，运动状态良好，代谢均衡，持续当前养护即可',
  B: '整体健康良好，个别指标轻微波动，建议保持观察，无需干预',
  C: '存在明确亚健康信号，需针对性调整（饮食/运动/环境），建议复查',
  D: '存在明确病理风险，建议尽快就医检查',
}

function mapAiReport(pet: PetInfo, ai: Record<string, unknown>, context: {
  startAt: number
  endAt: number
  timeRange: 'day' | 'week' | 'month'
  vitals: VitalsAgg
  exercise: ExerciseAgg
  extremes: ReturnType<typeof aggExtremes>
  calorie: { rer: number; der: number; actual: number; deviationPct: number }
  source: 'ai' | 'offline'
}): ReportItem {
  const gradeRaw = String(ai.overall_grade ?? 'B').toUpperCase()
  const grade = (['A', 'B', 'C', 'D'].includes(gradeRaw) ? gradeRaw : 'B') as 'A' | 'B' | 'C' | 'D'
  const indicators = (ai.indicators ?? {}) as Record<string, { level?: string; suggestion?: string; value?: number }>
  const abnormal: AbnormalItem[] = []
  for (const [key, ind] of Object.entries(indicators)) {
    const level = String(ind.level ?? '')
    if (level === '异常' || level === '危急') {
      abnormal.push({
        key,
        label: INDICATOR_LABEL[key] ?? key,
        value: level,
        level: level === '危急' ? 'danger' : 'warn',
        suggestion: String(ind.suggestion ?? '详见报告结论。'),
      })
    }
  }
  const periodStart = new Date(context.startAt).toLocaleDateString('zh-CN')
  const periodEnd = new Date(context.endAt).toLocaleDateString('zh-CN')
  const now = Date.now()
  const e = context.exercise
  const ext = context.extremes
  const summary = String(ai.report_summary ?? `${pet.name} 该周期健康状态评估完毕。`)
  const reportDetail = String(
    ai.report_detail ??
      `# ${pet.name} 健康报告\n\n${summary}\n\n> 综合评级：${grade} 级\n> ${GRADE_DESC[grade]}`,
  )
  return {
    id: uid('r'),
    petId: pet.id,
    period: `${periodStart} 至 ${periodEnd}`,
    startAt: context.startAt,
    endAt: context.endAt,
    score: GRADE_SCORE[grade],
    summary,
    aiConclusion: summary,
    abnormal,
    metricsSummary: {
      heartRate: { avg: context.vitals.heartRate, max: ext.hrMax, min: ext.hrMin },
      respiratoryRate: { avg: context.vitals.respiratoryRate, max: ext.respMax, min: ext.respMin },
      spo2: { avg: context.vitals.spo2, min: ext.spo2Min },
      temperature: { avg: context.vitals.temperature, max: ext.tempMax, min: ext.tempMin },
      totalActivity: e.totalActivity,
      sleepDuration: ext.sleep,
    },
    exerciseSummary: {
      totalActivity: e.totalActivity,
      dailyActivity: e.dailyActivity,
      stepFreq: e.stepFreq,
      stride: e.stride,
      speed: e.speed,
      exerciseDurationMin: e.durationMin,
    },
    timeRange: context.timeRange,
    source: context.source,
    grade,
    reportDetail,
    doctorId: null,
    doctorReview: 'pending',
    doctorComment: null,
    createdAt: now,
  }
}

/* ============================================================
 * 本地规则引擎兜底（AI 不可达时按规则文档 §3/§4 计算）
 * ============================================================ */

type Level = '正常' | '关注' | '异常' | '危急'
const LEVEL_POINTS: Record<Level, number> = { 正常: 0, 关注: 1, 异常: 2, 危急: 4 }

interface Band {
  level: Level
  min: number
  max: number
}

function applyAge(pet: PetInfo, bands: Band[]): Band[] {
  const months = ageMonths(pet.birthDate)
  const years = months / 12
  const young = months < 6
  const senior = pet.species === 'cat' ? years > 10 : years > 8
  if (!young && !senior) return bands
  return bands.map((b) => ({
    ...b,
    min: senior ? b.min - 10 : b.min,
    max: young ? b.max + 20 : b.max,
  }))
}

function levelInBands(v: number, bands: Band[]): Level {
  for (const b of bands) if (v >= b.min && v <= b.max) return b.level
  return '异常'
}

const HEART_BANDS: Record<string, Band[]> = {
  cat: [
    { level: '危急', min: -Infinity, max: 79 },
    { level: '异常', min: 80, max: 99 },
    { level: '关注', min: 100, max: 119 },
    { level: '正常', min: 120, max: 180 },
    { level: '关注', min: 181, max: 200 },
    { level: '异常', min: 201, max: 220 },
    { level: '危急', min: 221, max: Infinity },
  ],
  smallDog: [
    { level: '危急', min: -Infinity, max: 69 },
    { level: '异常', min: 70, max: 79 },
    { level: '关注', min: 80, max: 89 },
    { level: '正常', min: 90, max: 140 },
    { level: '关注', min: 141, max: 160 },
    { level: '异常', min: 161, max: 180 },
    { level: '危急', min: 181, max: Infinity },
  ],
  mediumDog: [
    { level: '危急', min: -Infinity, max: 49 },
    { level: '异常', min: 50, max: 59 },
    { level: '关注', min: 60, max: 69 },
    { level: '正常', min: 70, max: 120 },
    { level: '关注', min: 121, max: 140 },
    { level: '异常', min: 141, max: 160 },
    { level: '危急', min: 161, max: Infinity },
  ],
  largeDog: [
    { level: '危急', min: -Infinity, max: 39 },
    { level: '异常', min: 40, max: 49 },
    { level: '关注', min: 50, max: 59 },
    { level: '正常', min: 60, max: 100 },
    { level: '关注', min: 101, max: 120 },
    { level: '异常', min: 121, max: 140 },
    { level: '危急', min: 141, max: Infinity },
  ],
}

const RESP_BANDS: Record<string, Band[]> = {
  smallDog: [
    { level: '危急', min: -Infinity, max: 9 },
    { level: '关注', min: 10, max: 14 },
    { level: '正常', min: 15, max: 30 },
    { level: '关注', min: 31, max: 40 },
    { level: '异常', min: 41, max: 50 },
    { level: '危急', min: 51, max: Infinity },
  ],
  mediumLargeDog: [
    { level: '危急', min: -Infinity, max: 9 },
    { level: '正常', min: 10, max: 25 },
    { level: '关注', min: 26, max: 35 },
    { level: '异常', min: 36, max: 45 },
    { level: '危急', min: 46, max: Infinity },
  ],
  cat: [
    { level: '危急', min: -Infinity, max: 9 },
    { level: '关注', min: 10, max: 15 },
    { level: '正常', min: 16, max: 30 },
    { level: '关注', min: 31, max: 40 },
    { level: '异常', min: 41, max: 50 },
    { level: '危急', min: 51, max: Infinity },
  ],
}

function gradeTemp(t: number): Level {
  if (t < 37.0 || t > 40.0) return '危急'
  if (t < 37.5 || t > 39.5) return '异常'
  if (t < 38.0 || t > 39.2) return '关注'
  return '正常'
}

function gradeSpo2(s: number): Level {
  if (s < 90) return '危急'
  if (s <= 91) return '异常'
  if (s <= 94) return '关注'
  return '正常'
}

function gradeHeart(pet: PetInfo, hr: number): Level {
  const key = pet.species === 'cat' ? 'cat' : pet.weight < 10 ? 'smallDog' : pet.weight <= 30 ? 'mediumDog' : 'largeDog'
  return levelInBands(hr, applyAge(pet, HEART_BANDS[key]))
}

function gradeResp(pet: PetInfo, rr: number): Level {
  const key = pet.species === 'cat' ? 'cat' : pet.weight < 10 ? 'smallDog' : 'mediumLargeDog'
  return levelInBands(rr, RESP_BANDS[key])
}

/** 卡路里分级：偏离 DER 幅度按 time_range 差异化容错 */
function gradeCalorie(deviationPct: number, timeRange: 'day' | 'week' | 'month'): Level {
  const abs = Math.abs(deviationPct)
  const normalMax = timeRange === 'day' ? 15 : timeRange === 'week' ? 12 : 10
  const concernMax = timeRange === 'day' ? 30 : timeRange === 'week' ? 25 : 20
  const abnormalMax = timeRange === 'day' ? 50 : timeRange === 'week' ? 40 : 35
  if (abs <= normalMax) return '正常'
  if (abs <= concernMax) return '关注'
  if (abs <= abnormalMax) return '异常'
  return '危急'
}

/** 运动相对基线分级：步频/步幅双向往返，速度仅看下降（normalMax 按指标区分） */
function gradeDeviation(deviationPct: number, timeRange: 'day' | 'week' | 'month', normalMax: number, downwardOnly = false): Level {
  const d = downwardOnly ? Math.max(0, -deviationPct) : Math.abs(deviationPct)
  const concernMax = timeRange === 'day' ? 30 : timeRange === 'week' ? 25 : 20
  const abnormalMax = timeRange === 'day' ? 45 : timeRange === 'week' ? 40 : 35
  if (d <= normalMax) return '正常'
  if (d <= concernMax) return '关注'
  if (d <= abnormalMax) return '异常'
  return '危急'
}

interface LocalAnalysis {
  levels: { temp: Level; heart: Level; spo2: Level; resp: Level; calorie: Level; stepFreq: Level; stride: Level; speed: Level }
  score: number
  grade: 'A' | 'B' | 'C' | 'D'
  deviations: Record<string, number>
  calorie: { rer: number; der: number; actual: number; deviationPct: number }
  abnormal: AbnormalItem[]
  recommendations: string[]
  rootCause: string
}

function analyzeLocal(
  pet: PetInfo,
  timeRange: 'day' | 'week' | 'month',
  vitals: VitalsAgg,
  exercise: ExerciseAgg,
  baseline: ExerciseAgg,
  prev: { vitals: VitalsAgg; exercise: ExerciseAgg },
): LocalAnalysis {
  const rer = 70 * Math.pow(pet.weight, 0.75)
  const der = rer * derFactor(pet, lifeStageOf(pet))
  const actual = dailyCalorie(exercise)
  const calorieDeviation = der ? ((actual + rer - der) / der) * 100 : 0

  const normStep = timeRange === 'day' ? 15 : timeRange === 'week' ? 12 : 10
  const normStride = timeRange === 'day' ? 10 : timeRange === 'week' ? 8 : 6
  const devStep = baseline.stepFreq ? ((exercise.stepFreq - baseline.stepFreq) / baseline.stepFreq) * 100 : 0
  const devStride = baseline.stride ? ((exercise.stride - baseline.stride) / baseline.stride) * 100 : 0
  const devSpeed = baseline.speed ? ((exercise.speed - baseline.speed) / baseline.speed) * 100 : 0

  const levels = {
    temp: gradeTemp(vitals.temperature),
    heart: gradeHeart(pet, vitals.heartRate),
    spo2: gradeSpo2(vitals.spo2),
    resp: gradeResp(pet, vitals.respiratoryRate),
    calorie: gradeCalorie(calorieDeviation, timeRange),
    stepFreq: gradeDeviation(devStep, timeRange, normStep),
    stride: gradeDeviation(devStride, timeRange, normStride),
    speed: gradeDeviation(devSpeed, timeRange, normStep, true),
  }

  // 趋势：当前 vs 上期，≥2 项恶化 1 级 → 恶化
  const pairs: [Level, Level][] = [
    [levels.temp, gradeTemp(prev.vitals.temperature)],
    [levels.heart, gradeHeart(pet, prev.vitals.heartRate)],
    [levels.spo2, gradeSpo2(prev.vitals.spo2)],
    [levels.resp, gradeResp(pet, prev.vitals.respiratoryRate)],
  ]
  let worsened = 0
  let improved = 0
  for (const [cur, pre] of pairs) {
    if (LEVEL_POINTS[cur] - LEVEL_POINTS[pre] >= 1) worsened++
    if (LEVEL_POINTS[cur] - LEVEL_POINTS[pre] <= -1) improved++
  }
  const trendPoints = worsened >= 2 ? 1 : improved >= 2 ? 0 : 0

  const vitalsAvg = (LEVEL_POINTS[levels.temp] + LEVEL_POINTS[levels.heart] + LEVEL_POINTS[levels.spo2] + LEVEL_POINTS[levels.resp]) / 4
  const exerciseAvg = (LEVEL_POINTS[levels.stepFreq] + LEVEL_POINTS[levels.stride] + LEVEL_POINTS[levels.speed]) / 3
  const score = round2(vitalsAvg * 0.5 + exerciseAvg * 0.25 + LEVEL_POINTS[levels.calorie] * 0.15 + trendPoints * 0.1)

  // 一票升级（本 mock 仅体征可能触发）
  let grade: 'A' | 'B' | 'C' | 'D'
  if (vitals.temperature < 37.0 || vitals.temperature > 40.0 || vitals.spo2 < 90) {
    grade = 'D'
  } else {
    const a = timeRange === 'day' ? 0.6 : timeRange === 'week' ? 0.5 : 0.4
    const b = timeRange === 'day' ? 1.8 : timeRange === 'week' ? 1.5 : 1.2
    const c = timeRange === 'day' ? 3.5 : timeRange === 'week' ? 3.0 : 2.5
    if (score <= a) grade = 'A'
    else if (score <= b) grade = 'B'
    else if (score <= c) grade = 'C'
    else grade = 'D'
  }

  const abnormal: AbnormalItem[] = []
  const defs: [string, string, Level, string][] = [
    ['temperature', '体温', levels.temp, vitals.temperature > 39.5 ? '建议排查感染/炎症，环境降温并观察 24h' : '注意保暖复测，排查低体温原因'],
    ['heart_rate', '心率', levels.heart, '静息复测、排除应激，必要时心电图/心超排查'],
    ['spo2', '血氧饱和度', levels.spo2, '改善通风、观察呼吸，必要时立即排查呼吸/循环系统'],
    ['respiratory_rate', '呼吸频率', levels.resp, '降温、静息复测，必要时胸片/听诊排查'],
    ['calories', '卡路里', levels.calorie, calorieDeviation < 0 ? '适当增加低冲击运动与营养摄入' : '调整运动计划、排查代谢性疾病'],
    ['step_frequency', '步频', levels.stepFreq, '调整运动强度、排查焦虑源，必要时神经学检查'],
    ['step_length', '步幅', levels.stride, '减少运动量观察 3 天，必要时影像学检查（X光/关节触诊）'],
    ['movement_speed', '运动速度', levels.speed, '渐进式运动恢复，必要时心肺功能评估'],
  ]
  for (const [key, label, level, suggestion] of defs) {
    if (level === '关注' || level === '异常' || level === '危急') {
      abnormal.push({ key, label, value: level, level: level === '危急' ? 'danger' : 'warn', suggestion })
    }
  }

  const recommendations: string[] = []
  const low = timeRange === 'day' ? '今日' : timeRange === 'week' ? '本周' : '本月'
  if (grade === 'A') recommendations.push(`${low}整体健康稳定，各项指标均在正常范围，继续保持当前生活节奏。`)
  if (grade === 'B') recommendations.push(`${low}个别指标轻微波动，属正常生理范围，建议观察 2-3 天，如持续偏离再考虑调整。`)
  if (grade === 'C') recommendations.push(`${low}存在亚健康信号，建议调整饮食与运动、观察异常指标，并预约兽医基础体检。`)
  if (grade === 'D') recommendations.push(`${low}存在明显病理风险，请尽快联系宠物医院就诊，并携带本周期完整数据。`)
  if (levels.calorie !== '正常') recommendations.push('关注每日运动量，保证能量摄入与消耗均衡。')
  if (levels.stepFreq !== '正常' || levels.stride !== '正常' || levels.speed !== '正常') {
    recommendations.push('运动指标较基线偏离，建议循序渐进地安排运动，避免突然加大强度。')
  }

  const abnormalLabels = abnormal.map((a) => a.label).join('、')
  const rootCause = abnormal.length
    ? `周期内主要异常集中在：${abnormalLabels}。${abnormal.length >= 3 ? '存在多系统关联信号，建议尽快全面检查。' : '建议针对上述指标加强监测并复查。'}`
    : '各指标均在正常参考范围内，整体状态良好。'

  return {
    levels,
    score,
    grade,
    deviations: {
      stepFreq: baseline.stepFreq ? round1(((exercise.stepFreq - baseline.stepFreq) / baseline.stepFreq) * 100) : 0,
      stride: baseline.stride ? round1(((exercise.stride - baseline.stride) / baseline.stride) * 100) : 0,
      speed: baseline.speed ? round1(((exercise.speed - baseline.speed) / baseline.speed) * 100) : 0,
      calorie: round1(calorieDeviation),
    },
    calorie: { rer, der, actual: actual + rer, deviationPct: round1(calorieDeviation) },
    abnormal,
    recommendations,
    rootCause,
  }
}

function buildOfflineDetail(
  pet: PetInfo,
  timeRange: 'day' | 'week' | 'month',
  vitals: VitalsAgg,
  exercise: ExerciseAgg,
  baseline: ExerciseAgg,
  analysis: LocalAnalysis,
): string {
  const periodLabel = timeRange === 'day' ? '单日' : timeRange === 'week' ? '近7天' : '近30天'
  const rows = [
    ['体温', `${vitals.temperature} ℃`, analysis.levels.temp, '38.0 ~ 39.2 ℃'],
    ['静息心率', `${vitals.heartRate} 次/分`, analysis.levels.heart, '按体型/年龄分层'],
    ['血氧饱和度', `${vitals.spo2} %`, analysis.levels.spo2, '≥ 95 %'],
    ['呼吸频率', `${vitals.respiratoryRate} 次/分`, analysis.levels.resp, '按体型/物种分层'],
    ['卡路里(日均)', `${Math.round(analysis.calorie.actual)} kcal`, analysis.levels.calorie, `DER≈${Math.round(analysis.calorie.der)} kcal`],
  ]
  const vitalMd = rows.map(([k, v, l, r]) => `| ${k} | ${v} | ${l} | ${r} |`).join('\n')
  const exRows = [
    `| 步频 | ${exercise.stepFreq} 步/分 | ${baseline.stepFreq} 步/分 | ${analysis.deviations.stepFreq}% | ${analysis.levels.stepFreq} |`,
    `| 步幅 | ${exercise.stride} cm | ${baseline.stride} cm | ${analysis.deviations.stride}% | ${analysis.levels.stride} |`,
    `| 运动速度 | ${exercise.speed} m/s | ${baseline.speed} m/s | ${analysis.deviations.speed}% | ${analysis.levels.speed} |`,
  ].join('\n')
  const recMd = analysis.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')
  return `# ${pet.name} 健康报告（${periodLabel}）

> 说明：AI 分析服务暂不可用，本报告由本地规则引擎按《宠物健康数据分析规则体系（行业修订版 v2.1）》生成，仅供参考，不替代兽医临床诊断。

## 一、宠物基本信息
- 物种：${pet.species === 'dog' ? '犬' : '猫'} · 品种：${pet.breed}
- 体重：${pet.weight} kg · 月龄：${ageMonths(pet.birthDate)}
- 性别：${pet.gender === 'male' ? '雄性' : '雌性'} · 绝育：${pet.sterilized ? '是' : '否'} · 生命阶段：${lifeStageOf(pet)}

## 二、周期体征数据（${periodLabel}中位数）
| 指标 | 周期中位数 | 等级 | 参考区间 |
|------|-----------|------|----------|
${vitalMd}

## 三、周期运动数据（${periodLabel} vs 基线）
| 指标 | 周期中位数 | 基线 | 偏离 | 等级 |
|------|-----------|------|------|------|
${exRows}
> 日均步数：${exercise.dailyActivity} · 日均运动时长：${exercise.durationMin} 分钟 · 周期总步数：${exercise.totalActivity}

## 四、报告结论
- **综合评级：${analysis.grade} 级**（加权评分 ${analysis.score}）
- ${GRADE_DESC[analysis.grade]}
- 归因分析：${analysis.rootCause}
- 建议清单：
${recMd}
- 建议复查间隔：${analysis.grade === 'D' ? '尽快' : analysis.grade === 'C' ? '1 周内' : analysis.grade === 'B' ? '2 周内' : '每月'}复查`
}

/* ============================================================
 * Mock 路由
 * ============================================================ */

defineMock([
  {
    method: 'post',
    path: '/admin/report/ai-generate',
    handler: async (ctx) => {
      requireRole(ctx, 'admin')
      const body = (ctx.body ?? {}) as { petId?: string; startAt?: number; endAt?: number; timeRange?: string }
      const petId = body.petId
      if (!petId) throw new MockError('请选择宠物')
      const pet = findPetById(petId)
      if (!pet) throw new MockError('宠物不存在', 404)
      const endAt = Number(body.endAt ?? Date.now())
      const startAt = Number(body.startAt ?? endAt - 6 * DAY)
      if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= startAt) {
        throw new MockError('时间段无效')
      }
      if (endAt - startAt > 30 * DAY) throw new MockError('时间段不能超过 30 天')
      const timeRange = (body.timeRange as 'day' | 'week' | 'month') || deriveTimeRange(startAt, endAt)

      // 聚合数据
      const vitals = aggVitals(pet.id, startAt, endAt)
      const exercise = aggExercise(pet, startAt, endAt)
      const extremes = aggExtremes(pet.id, startAt, endAt)
      const baseline = aggExercise(pet, startAt - baselineWindow(timeRange) * DAY, startAt)
      const prev = {
        vitals: aggVitals(pet.id, startAt - (endAt - startAt), startAt),
        exercise: aggExercise(pet, startAt - (endAt - startAt), startAt),
      }
      const rer = 70 * Math.pow(pet.weight, 0.75)
      const der = rer * derFactor(pet, lifeStageOf(pet))
      const calorieActual = dailyCalorie(exercise)
      const calorieDeviation = der ? ((calorieActual + rer - der) / der) * 100 : 0

      const input = {
        startAt,
        endAt,
        timeRange,
        pet,
        vitals,
        exercise,
        baseline,
        prev,
        calorie: { rer, der, actual: calorieActual, deviationPct: round1(calorieDeviation) },
      }

      let report: ReportItem
      let aiJson: Record<string, unknown> | null = null
      try {
        const content = await callAi(SYSTEM_PROMPT, buildUserPrompt(input))
        aiJson = extractJson(content) as Record<string, unknown>
        if (!aiJson || typeof aiJson !== 'object' || !('overall_grade' in aiJson)) throw new Error('AI 返回结构异常')
        report = mapAiReport(pet, aiJson, { ...input, extremes, source: 'ai' })
      } catch {
        // AI 不可达/解析失败 → 本地规则引擎兜底
        const analysis = analyzeLocal(pet, timeRange, vitals, exercise, baseline, prev)
        const fallbackJson: Record<string, unknown> = {
          overall_grade: analysis.grade,
          overall_score: analysis.score,
          grade_description: GRADE_DESC[analysis.grade],
          report_summary: `${pet.name}${timeRange === 'day' ? '今日' : timeRange === 'week' ? '本周' : '本月'}健康评估：综合评级 ${analysis.grade} 级，${analysis.rootCause}`,
          report_detail: buildOfflineDetail(pet, timeRange, vitals, exercise, baseline, analysis),
          abnormal_indicators: analysis.abnormal.map((a) => a.label),
          root_cause_analysis: analysis.rootCause,
          recommendations: analysis.recommendations,
        }
        report = mapAiReport(pet, fallbackJson, { ...input, extremes, source: 'offline' })
      }

      reports.push(report)
      const owner = findUserById(pet.ownerId)
      const joined = {
        ...report,
        petName: pet.name,
        petAvatar: pet.avatar,
        species: pet.species,
        doctorName: null,
        ownerId: pet.ownerId,
        ownerName: owner?.name ?? '',
        ownerAvatar: owner?.avatar ?? '',
        trend: buildTrend(report),
      }
      return joined
    },
  },
])

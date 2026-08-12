<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import dayjs from 'dayjs'
import { getPetApi, type PetJoined } from '@/api/modules/pet'
import { getDeviceListApi, type DeviceJoined } from '@/api/modules/device'
import { getHealthSummaryApi, getHealthSeriesApi, type HealthSummary } from '@/api/modules/health'
import VitalDetailChart from '@/components/VitalDetailChart.vue'
import { SPECIES_ICON, SPECIES_LABEL, DEVICE_STATUS } from '@/utils/consts'
import { petAvatarSrc } from '@/utils/petAvatar'
import type { HealthMetricType } from '@/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

type Level = 'normal' | 'warn' | 'danger'

/** 健康等级配色：绿=正常 / 橙=预警 / 红=高危 */
const LEVEL_COLORS: Record<Level, string> = {
  normal: '#34c759',
  warn: '#ff9500',
  danger: '#ff3b30',
}

/** 呼吸频率阈值（按犬/猫区分；超出 绿/橙 区间即红） */
const RESP_THRESHOLDS: Record<'dog' | 'cat', { green: [number, number]; warnLow: number; warnHigh: number }> = {
  dog: { green: [15, 30], warnLow: 10, warnHigh: 45 },
  cat: { green: [20, 36], warnLow: 14, warnHigh: 50 },
}

interface MetricConfig {
  key: HealthMetricType
  labelKey: string
  unit: string
  color: string
  hasLegend: boolean
  decimals?: number
  level: (v: number, species: 'dog' | 'cat') => Level
}

const METRICS: MetricConfig[] = [
  {
    key: 'temperature',
    labelKey: 'user.health.temperature',
    unit: '℃',
    color: '#ff9f43',
    hasLegend: true,
    decimals: 1,
    // 体温阈值对齐《宠物健康数据分析规则体系》临床标准（按犬/猫区分，3 色由 4 级合并：1-2 级=正常，3 级=预警，4 级=高危）
    level: (v, species) => {
      if (species === 'cat') {
        if (v < 37.2 || v >= 40.1) return 'danger'
        if ((v >= 37.2 && v <= 37.7) || (v >= 39.5 && v <= 40.0)) return 'warn'
        return 'normal'
      }
      if (v < 37.0 || v >= 40.0) return 'danger'
      if ((v >= 37.0 && v <= 37.8) || (v >= 39.3 && v <= 39.9)) return 'warn'
      return 'normal'
    },
  },
  {
    key: 'spo2',
    labelKey: 'user.health.spo2',
    unit: '%',
    color: '#00b4a6',
    hasLegend: true,
    level: (v) => (v >= 90 ? 'normal' : v >= 70 ? 'warn' : 'danger'),
  },
  {
    key: 'heartRate',
    labelKey: 'user.health.heartRate',
    unit: '次/分',
    color: '#ff6b6b',
    hasLegend: false,
    level: () => 'normal',
  },
  {
    key: 'respiratoryRate',
    labelKey: 'user.health.respiratory',
    unit: '次/分',
    color: '#5b8ff9',
    hasLegend: true,
    level: (v, species) => {
      const r = RESP_THRESHOLDS[species] ?? RESP_THRESHOLDS.dog
      if (v >= r.green[0] && v <= r.green[1]) return 'normal'
      if (v >= r.warnLow && v <= r.warnHigh) return 'warn'
      return 'danger'
    },
  },
]

/** 统计周期：单日 / 本周 / 本月 / 本季度 */
const PERIODS = [
  { value: 'day', labelKey: 'user.health.periodDay', days: 1 },
  { value: 'week', labelKey: 'user.health.periodWeek', days: 7 },
  { value: 'month', labelKey: 'user.health.periodMonth', days: 30 },
  { value: 'quarter', labelKey: 'user.health.periodQuarter', days: 90 },
] as const
type PeriodValue = (typeof PERIODS)[number]['value']

/* ===== 周期四指标健康分析（依据《宠物健康数据分析规则体系·基础生理指标分析规则》） ===== */

type AnalysisLevel = 1 | 2 | 3 | 4

/** 四项基础生理指标（周期报告分析对象） */
const ANALYSIS_METRICS: HealthMetricType[] = ['temperature', 'heartRate', 'spo2', 'respiratoryRate']

interface AnalysisItem {
  key: HealthMetricType
  nameKey: string
  unit: string
  decimals?: number
  avg: number
  min: number
  max: number
  level: AnalysisLevel
}

const METRIC_COLOR: Record<string, string> = Object.fromEntries(METRICS.map((m) => [m.key, m.color]))

function metricConfig(key: HealthMetricType) {
  return METRICS.find((m) => m.key === key)!
}

function mean(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / nums.length
}

/**
 * 按《基础生理指标分析规则》对周期均值评级（1-4 级）。
 * 犬心率按成年犬标准；呼吸频率低侧（<1级下限）按生理性轻微偏慢处理。
 */
function gradeAnalysis(key: HealthMetricType, v: number, species: 'dog' | 'cat'): AnalysisLevel {
  switch (key) {
    case 'temperature': {
      if (species === 'cat') {
        if (v < 37.2 || v >= 40.1) return 4
        if ((v >= 37.2 && v <= 37.7) || (v >= 39.5 && v <= 40.0)) return 3
        if ((v >= 37.8 && v <= 38.0) || (v >= 39.3 && v <= 39.4)) return 2
        return 1
      }
      if (v < 37.0 || v >= 40.0) return 4
      if ((v >= 37.0 && v <= 37.8) || (v >= 39.3 && v <= 39.9)) return 3
      if ((v >= 37.9 && v <= 38.2) || (v >= 39.0 && v <= 39.2)) return 2
      return 1
    }
    case 'spo2': {
      if (v < 90) return 4
      if (v >= 90 && v <= 92) return 3
      if (v >= 93 && v <= 95) return 2
      return 1
    }
    case 'heartRate': {
      if (species === 'cat') {
        if (v < 80 || v > 220) return 4
        if ((v >= 80 && v <= 99) || (v >= 201 && v <= 220)) return 3
        if ((v >= 100 && v <= 119) || (v >= 181 && v <= 200)) return 2
        return 1
      }
      // 成年犬：1级 70-120；2级为上下浮动 5 次/分内（65-69 / 121-125）；3级 60-64 / 126-140；4级 <60 或 >140
      if (v < 60 || v > 140) return 4
      if ((v >= 60 && v <= 64) || (v >= 126 && v <= 140)) return 3
      if ((v >= 65 && v <= 69) || (v >= 121 && v <= 125)) return 2
      return 1
    }
    default: {
      // respiratoryRate
      if (species === 'cat') {
        if (v >= 50) return 4
        if (v >= 40 && v <= 49) return 3
        if (v >= 31 && v <= 39) return 2
        if (v >= 20 && v <= 30) return 1
        return 2
      }
      if (v >= 45) return 4
      if (v >= 36 && v <= 44) return 3
      if (v >= 31 && v <= 35) return 2
      if (v >= 16 && v <= 30) return 1
      return 2
    }
  }
}

const petId = computed(() => route.params.petId as string)
const metricKey = computed(() => route.params.metricType as string)

const pet = ref<PetJoined | null>(null)
const devices = ref<DeviceJoined[]>([])
const summary = ref<HealthSummary | null>(null)
const points = ref<{ ts: number; value: number }[]>([])
/** 四项指标的周期原始序列（分析评级基于它，并依赖宠物品类响应式重算） */
const analysisSeries = ref<{ key: HealthMetricType; points: { ts: number; value: number }[] }[]>([])
const loading = ref(false)
const period = ref<PeriodValue>('day')
const selectedDate = ref(new Date())
const showPeriodSheet = ref(false)
const showDatePicker = ref(false)

const activeMetric = computed(() => METRICS.find((m) => m.key === metricKey.value) ?? METRICS[0])
const currentPeriod = computed(() => PERIODS.find((p) => p.value === period.value) ?? PERIODS[0])
const device = computed(() => devices.value.find((d) => d.boundPetId === petId.value) ?? null)

/** 单日仅支持今日（演示数据仅含今日逐小时）；选其他日期展示空态 */
const isToday = computed(() => dayjs(selectedDate.value).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD'))

function fmt(v: number | undefined): string {
  if (v === undefined || Number.isNaN(v)) return '--'
  const dec = activeMetric.value.decimals
  return dec ? v.toFixed(dec) : String(Math.round(v))
}

function latestOf(): number | undefined {
  const s = summary.value
  if (!s) return undefined
  switch (activeMetric.value.key) {
    case 'temperature': return s.temperature.latest
    case 'heartRate': return s.heartRate.latest
    case 'spo2': return s.spo2.latest
    default: return s.respiratoryRate.latest
  }
}

async function loadBase() {
  try {
    const [p, devList] = await Promise.all([getPetApi(petId.value), getDeviceListApi()])
    pet.value = p
    devices.value = devList
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  }
}

async function loadData() {
  if (period.value === 'day' && !isToday.value) {
    points.value = []
    summary.value = null
    analysisSeries.value = []
    return
  }
  loading.value = true
  try {
    const days = currentPeriod.value.days
    // 并行拉取四项基础指标周期序列（当前指标点位复用为下方走势图）
    const [s, ...series] = await Promise.all([
      getHealthSummaryApi(petId.value),
      ...ANALYSIS_METRICS.map((m) => getHealthSeriesApi(petId.value, m, days)),
    ])
    summary.value = s
    const activeIdx = ANALYSIS_METRICS.indexOf(activeMetric.value.key)
    points.value = series[activeIdx >= 0 ? activeIdx : 0]?.points ?? []
    analysisSeries.value = ANALYSIS_METRICS.map((m, i) => ({ key: m, points: series[i].points }))
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
    points.value = []
    summary.value = null
    analysisSeries.value = []
  } finally {
    loading.value = false
  }
}

/** 当日波动区间（min-max + 单位） */
const rangeText = computed(() => {
  if (!points.value.length) return '--'
  const vals = points.value.map((p) => p.value)
  return `${fmt(Math.min(...vals))}-${fmt(Math.max(...vals))}${activeMetric.value.unit}`
})

/** 右上角最新实时值 */
const latestText = computed(() => {
  const v = latestOf()
  return v === undefined ? '--' : `${fmt(v)}${activeMetric.value.unit}`
})

const collectedTime = computed(() => (summary.value ? dayjs(summary.value.updatedAt).format('HH:mm') : '--'))

const restingHr = computed(() => summary.value?.restingHeartRate ?? 0)

/** 逐点图表颜色：心率单色，其余按健康等级上色 */
const chartColors = computed(() => {
  const species = pet.value?.species ?? 'dog'
  return activeMetric.value.hasLegend
    ? points.value.map((p) => LEVEL_COLORS[activeMetric.value.level(p.value, species)])
    : points.value.map(() => activeMetric.value.color)
})

/** 三色图例下自动总结 */
const levelCounts = computed(() => {
  const c: Record<Level, number> = { normal: 0, warn: 0, danger: 0 }
  const species = pet.value?.species ?? 'dog'
  points.value.forEach((p) => {
    c[activeMetric.value.level(p.value, species)]++
  })
  return c
})

const summaryText = computed(() => {
  if (!points.value.length) return ''
  const { normal, warn, danger } = levelCounts.value
  const total = normal + warn + danger
  const name = t(activeMetric.value.labelKey)
  if (warn === 0 && danger === 0) return t('user.health.summaryAllNormal', { name })
  const warnish = warn + danger
  if (warnish > total / 2) return t('user.health.summaryWarn', { name })
  return t('user.health.summaryMixed', { name, n: warnish })
})

/* ===== 周期四指标分析报告文案 ===== */

/** 四项指标周期评级（依赖宠物品类，品类加载完成后自动重算） */
const analysis = computed<AnalysisItem[]>(() => {
  const species = pet.value?.species ?? 'dog'
  return analysisSeries.value
    .map(({ key, points }) => {
      const vals = points.map((p) => p.value)
      if (!vals.length) return null
      const cfg = metricConfig(key)
      const avg = mean(vals)
      return {
        key,
        nameKey: cfg.labelKey,
        unit: cfg.unit,
        decimals: cfg.decimals,
        avg,
        min: Math.min(...vals),
        max: Math.max(...vals),
        level: gradeAnalysis(key, avg, species),
      }
    })
    .filter(Boolean) as AnalysisItem[]
})

const OVERALL_LABEL_KEY: Record<'normal' | 'warn' | 'danger', string> = {
  normal: 'user.health.analysisOverallNormal',
  warn: 'user.health.analysisOverallWarn',
  danger: 'user.health.analysisOverallDanger',
}
const OVERALL_TEXT_KEY: Record<'normal' | 'warn' | 'danger', string> = {
  normal: 'user.health.analysisOverallText1',
  warn: 'user.health.analysisOverallText2',
  danger: 'user.health.analysisOverallText3',
}

/** 综合评级：任意 4 级或 ≥3 项 3 级 → 就医；存在 3 级 → 亚健康调理；其余 → 状态良好 */
const overallLevel = computed<'normal' | 'warn' | 'danger'>(() => {
  const items = analysis.value
  if (!items.length) return 'normal'
  const l3 = items.filter((i) => i.level === 3).length
  if (items.some((i) => i.level === 4) || l3 >= 3) return 'danger'
  if (l3 >= 1) return 'warn'
  return 'normal'
})

const overallText = computed(() => t(OVERALL_TEXT_KEY[overallLevel.value]))

/** 单指标周期均值文案（按等级模板） */
function analysisText(item: AnalysisItem): string {
  const avg = item.decimals ? item.avg.toFixed(item.decimals) : String(Math.round(item.avg))
  return t(`user.health.analysisText${item.level}`, { name: t(item.nameKey), avg, unit: item.unit })
}

/** 单指标调理建议（依据规则体系·报告归因与建议） */
function suggestText(item: AnalysisItem): string {
  if (item.level === 1) return t('user.health.analysisSuggestNormal')
  if (item.level === 2) return t('user.health.analysisSuggestWarn')
  switch (item.key) {
    case 'temperature':
      return item.avg < 37.8
        ? t('user.health.analysisSuggestTempLow')
        : t('user.health.analysisSuggestTempHigh')
    case 'heartRate':
      return t('user.health.analysisSuggestHr')
    case 'spo2':
      return t('user.health.analysisSuggestSpo2')
    default:
      return t('user.health.analysisSuggestRr')
  }
}

function fmtVal(v: number, dec?: number): string {
  return dec ? v.toFixed(dec) : String(Math.round(v))
}

const deviceName = computed(() =>
  pet.value ? t('user.sync.collarOf', { name: pet.value.name }) : '',
)

const dateDisplay = computed(() => dayjs(selectedDate.value).format('MM-DD'))

const periodActions = computed(() =>
  PERIODS.map((p) => ({ name: t(p.labelKey), value: p.value })),
)

function onMetricTab(key: string) {
  if (key === activeMetric.value.key) return
  router.replace(`/user/health/vitals/${petId.value}/${key}`)
}

function onPeriodSelect(action: { value: string } | undefined) {
  if (action) period.value = action.value as PeriodValue
  showPeriodSheet.value = false
}

function onDateConfirm({ selectedValues }: { selectedValues: string[] }) {
  selectedDate.value = new Date(selectedValues[0])
  showDatePicker.value = false
}

watch(petId, () => {
  pet.value = null
  devices.value = []
  summary.value = null
  points.value = []
  analysisSeries.value = []
  loadBase()
}, { immediate: true })

watch([petId, metricKey, period, selectedDate], () => {
  loadData()
}, { immediate: true })
</script>

<template>
  <div class="vital-detail">
    <!-- 顶部头部：宠物信息 + 设备 + 日期筛选 -->
    <header class="vital-header">
      <div v-if="pet" class="pet-block">
        <img class="pet-avatar" :src="petAvatarSrc(pet.name) || pet.avatar" :alt="pet.name" />
        <div class="pet-info">
          <div class="pet-name">{{ SPECIES_ICON[pet.species] }} {{ pet.name }}</div>
          <div class="pet-meta">{{ t(SPECIES_LABEL[pet.species]) }} · {{ pet.breed }}</div>
        </div>
      </div>

      <div class="header-right">
        <!-- 设备名称 + 在线/离线状态 -->
        <div v-if="device" class="device-block">
          <span class="dev-name">{{ deviceName }}</span>
          <span class="dev-status" :class="`is-${device.status}`">
            <i class="dev-dot" />
            {{ t(DEVICE_STATUS[device.status].labelKey) }}
          </span>
        </div>
        <span v-else class="device-block device-block--none">{{ t('user.health.deviceUnbound') }}</span>
      </div>
    </header>

    <!-- 日期筛选（周期 + 单日日期），位于 header 与 tab 之间，靠左 -->
    <div class="date-bar">
      <button type="button" class="period-btn" @click="showPeriodSheet = true">
        {{ t(currentPeriod.labelKey) }}
        <van-icon name="arrow-down" />
      </button>
      <!-- 单日：日期选择 -->
      <button v-if="period === 'day'" type="button" class="date-chip" @click="showDatePicker = true">
        <van-icon name="calendar-o" />
        {{ dateDisplay }}
      </button>
    </div>

    <!-- 中部 4 Tab -->
    <nav class="vital-tabs">
      <button
        v-for="m in METRICS"
        :key="m.key"
        type="button"
        class="vital-tab"
        :class="{ active: m.key === activeMetric.key }"
        @click="onMetricTab(m.key)"
      >
        {{ t(m.labelKey) }}
      </button>
    </nav>

    <!-- 单指标详情模块 -->
    <section class="metric-detail">
      <!-- 当日波动区间（左）+ 最新实时值（右） -->
      <div class="detail-head">
        <div class="detail-range">
          <div class="range-value">{{ rangeText }}</div>
          <div class="range-label">{{ t(period === 'day' ? 'user.health.dayRange' : 'user.health.periodRange') }}</div>
        </div>
        <div class="detail-latest">
          <div class="latest-value">{{ latestText }}</div>
          <div class="latest-time">{{ t('user.health.collectedAt', { time: collectedTime }) }}</div>
          <div v-if="activeMetric.key === 'heartRate'" class="resting-hr">
            {{ t('user.health.restingHr', { n: restingHr }) }}
          </div>
        </div>
      </div>

      <!-- 走势图 -->
      <div class="chart-wrap">
        <van-skeleton v-if="loading" :loading="loading" :row="4" />
        <VitalDetailChart
          v-else-if="points.length"
          :points="points"
          :unit="activeMetric.unit"
          :colors="chartColors"
          :color="activeMetric.color"
          height="230px"
        />
        <van-empty v-else :description="t('user.health.noVitalData')" />
      </div>

      <!-- 三色图例（心率无图例） -->
      <div v-if="activeMetric.hasLegend && points.length" class="chart-legend">
        <span class="legend-item"><i class="legend-dot dot--normal" />{{ t('user.health.legendNormal') }}</span>
        <span class="legend-item"><i class="legend-dot dot--warn" />{{ t('user.health.legendWarn') }}</span>
        <span class="legend-item"><i class="legend-dot dot--danger" />{{ t('user.health.legendDanger') }}</span>
      </div>

      <!-- 自动总结 -->
      <p v-if="summaryText" class="summary-text">{{ summaryText }}</p>
    </section>

    <!-- 周期四指标健康分析报告 -->
    <section v-if="analysis.length" class="analysis-report">
      <header class="analysis-head">
        <div class="analysis-title">
          <h3>{{ t('user.health.analysisReport') }}</h3>
          <p>
            {{ t('user.health.analysisSubtitle', {
              period: t(currentPeriod.labelKey),
              species: pet ? t(SPECIES_LABEL[pet.species]) : '',
            }) }}
          </p>
        </div>
        <span class="analysis-overall" :class="`is-${overallLevel}`">
          {{ t(OVERALL_LABEL_KEY[overallLevel]) }}
        </span>
      </header>

      <ul class="analysis-list">
        <li v-for="item in analysis" :key="item.key" class="analysis-item">
          <div class="item-head">
            <span class="item-name">
              <i class="item-dot" :style="{ background: METRIC_COLOR[item.key] }" />
              {{ t(item.nameKey) }}
            </span>
            <span class="item-badge" :class="`badge-l${item.level}`">
              {{ t(`user.health.analysisLevel${item.level}`) }}
            </span>
          </div>

          <div class="item-nums">
            <b class="item-avg">{{ fmtVal(item.avg, item.decimals) }}<em>{{ item.unit }}</em></b>
            <span class="item-range">
              {{ t('user.health.analysisRange') }} {{ fmtVal(item.min, item.decimals) }} - {{ fmtVal(item.max, item.decimals) }}{{ item.unit }}
            </span>
          </div>

          <p class="item-text">{{ analysisText(item) }}</p>
          <p class="item-advice">
            <span class="advice-tag">{{ t('user.health.analysisAdvice') }}</span>
            {{ suggestText(item) }}
          </p>
        </li>
      </ul>

      <div class="analysis-conclusion" :class="`is-${overallLevel}`">
        <h4>{{ t('user.health.analysisConclusion') }}</h4>
        <p>{{ overallText }}</p>
      </div>
    </section>

    <!-- 周期选择 -->
    <van-action-sheet
      v-model:show="showPeriodSheet"
      :actions="periodActions"
      :cancel-text="t('common.cancel')"
      close-on-click-action
      @select="onPeriodSelect"
    />

    <!-- 单日日期选择 -->
    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        :model-value="[String(selectedDate.getFullYear()), String(selectedDate.getMonth() + 1).padStart(2, '0'), String(selectedDate.getDate()).padStart(2, '0')]"
        :min-date="new Date(Date.now() - 89 * 86400000)"
        :max-date="new Date()"
        :title="t('user.health.selectDate')"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
    </van-popup>
  </div>
</template>

<style scoped lang="scss">
.vital-detail {
  min-height: 100%;
  background: #fff;
  padding: 4px 16px 36px;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
}

/* ===== 顶部头部 ===== */
.vital-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0 16px;
  border-bottom: 1px solid #f0f3f8;

  .pet-block {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;

    .pet-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 1.5px solid #f0f3f8;
      object-fit: cover;
      flex-shrink: 0;
      background: #f5f7fa;
    }

    .pet-info {
      min-width: 0;
      .pet-name {
        font-size: 17px;
        font-weight: 700;
        color: #1f2d3d;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pet-meta {
        margin-top: 2px;
        font-size: 12px;
        color: #9aa6b8;
      }
    }
  }

  .header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;

    .device-block {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #5e6d82;

      .dev-name {
        max-width: 96px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .dev-status {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-weight: 600;

        .dev-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        &.is-online { color: #34c759; }
        &.is-offline { color: #b0b6bf; }
        &.is-low-power { color: #ff9500; }
        &.is-unbound { color: #ff3b30; }
      }

      &--none {
        color: #b0b6bf;
      }
    }
  }
}

/* ===== 日期筛选栏（header 与 tab 之间，靠左） ===== */
.date-bar {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  margin-top: 12px;

  .period-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #5e6d82;
    background: #fff;
    border: 1px solid #e4e9f0;
    border-radius: 999px;
    cursor: pointer;

    .van-icon {
      font-size: 10px;
      color: #9aa6b8;
    }
  }

  .date-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #5e6d82;
    background: #f5f7fa;
    border: 1px solid #e4e9f0;
    border-radius: 999px;
    cursor: pointer;

    .van-icon {
      font-size: 12px;
      color: #9aa6b8;
    }
  }
}

/* ===== 中部 Tab ===== */
.vital-tabs {
  display: flex;
  gap: 8px;
  margin-top: 14px;

  .vital-tab {
    flex: 1;
    padding: 9px 0;
    font-size: 14px;
    font-weight: 600;
    color: #9aa6b8;
    background: #f5f7fa;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      color: #fff;
      background: #1f2d3d;
      box-shadow: 0 2px 8px rgba(31, 45, 61, 0.16);
    }
  }
}

/* ===== 单指标详情 ===== */
.metric-detail {
  margin-top: 16px;
  background: #fff;
  border: 1px solid #f0f3f8;
  border-radius: 16px;
  padding: 18px 10px 14px;

  .detail-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;

    .detail-range {
      .range-value {
        font-size: 22px;
        font-weight: 800;
        color: #1f2d3d;
        letter-spacing: -0.3px;
      }
      .range-label {
        margin-top: 4px;
        font-size: 11px;
        color: #9aa6b8;
      }
    }

    .detail-latest {
      text-align: right;

      .latest-value {
        font-size: 22px;
        font-weight: 800;
        color: #1f2d3d;
        letter-spacing: -0.3px;
      }
      .latest-time {
        margin-top: 4px;
        font-size: 11px;
        color: #9aa6b8;
      }
      .resting-hr {
        margin-top: 2px;
        font-size: 11px;
        color: #9aa6b8;
      }
    }
  }

  .chart-wrap {
    margin-top: 14px;
  }

  .chart-legend {
    display: flex;
    justify-content: center;
    gap: 18px;
    margin-top: 12px;

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: #9aa6b8;

      .legend-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .dot--normal { background: #34c759; }
      .dot--warn { background: #ff9500; }
      .dot--danger { background: #ff3b30; }
    }
  }

  .summary-text {
    margin-top: 14px;
    padding: 10px 12px;
    font-size: 12px;
    line-height: 1.6;
    color: #9aa6b8;
    background: #fafbfc;
    border-radius: 10px;
  }
}

/* ===== 周期四指标健康分析报告 ===== */
.analysis-report {
  margin-top: 16px;
  background: #fff;
  border: 1px solid #f0f3f8;
  border-radius: 16px;
  padding: 18px 16px 16px;

  .analysis-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;

    .analysis-title {
      min-width: 0;

      h3 {
        font-size: 16px;
        font-weight: 700;
        color: #1f2d3d;
      }
      p {
        margin-top: 4px;
        font-size: 11px;
        color: #9aa6b8;
      }
    }

    .analysis-overall {
      flex-shrink: 0;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 999px;

      &.is-normal { color: #1a9e4c; background: #e8f9ee; }
      &.is-warn { color: #d17a00; background: #fff4e4; }
      &.is-danger { color: #d43d33; background: #ffeceb; }
    }
  }

  .analysis-list {
    margin-top: 14px;

    .analysis-item {
      padding: 12px 0;
      border-bottom: 1px solid #f5f7fa;

      &:last-child {
        border-bottom: none;
        padding-bottom: 2px;
      }

      .item-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;

        .item-name {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 600;
          color: #1f2d3d;

          .item-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
          }
        }

        .item-badge {
          flex-shrink: 0;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 600;
          border-radius: 999px;
          color: #5e6d82;
          background: #f5f7fa;

          &.badge-l1 { color: #1a9e4c; background: #e8f9ee; }
          &.badge-l2 { color: #009688; background: #e0f7f4; }
          &.badge-l3 { color: #d17a00; background: #fff4e4; }
          &.badge-l4 { color: #d43d33; background: #ffeceb; }
        }
      }

      .item-nums {
        display: flex;
        align-items: baseline;
        gap: 10px;
        margin-top: 8px;

        .item-avg {
          font-size: 22px;
          font-weight: 800;
          color: #1f2d3d;
          letter-spacing: -0.3px;

          em {
            margin-left: 2px;
            font-style: normal;
            font-size: 12px;
            font-weight: 600;
            color: #9aa6b8;
          }
        }

        .item-range {
          font-size: 11px;
          color: #9aa6b8;
        }
      }

      .item-text {
        margin-top: 8px;
        font-size: 12px;
        line-height: 1.6;
        color: #5e6d82;
      }

      .item-advice {
        margin-top: 6px;
        font-size: 12px;
        line-height: 1.6;
        color: #9aa6b8;

        .advice-tag {
          margin-right: 6px;
          padding: 1px 6px;
          font-size: 10px;
          color: #5b8ff9;
          background: #eef4ff;
          border-radius: 4px;
        }
      }
    }
  }

  .analysis-conclusion {
    margin-top: 14px;
    padding: 12px;
    border-radius: 12px;
    background: #fafbfc;

    &.is-normal { background: #f4fbf7; }
    &.is-warn { background: #fff8ec; }
    &.is-danger { background: #fff4f3; }

    h4 {
      font-size: 13px;
      font-weight: 700;
      color: #1f2d3d;
    }
    p {
      margin-top: 4px;
      font-size: 12px;
      line-height: 1.6;
      color: #5e6d82;
    }
  }
}
</style>

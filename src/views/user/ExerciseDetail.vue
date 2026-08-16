<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import dayjs from 'dayjs'
import { getPetApi, type PetJoined } from '@/api/modules/pet'
import { getDeviceListApi, type DeviceJoined } from '@/api/modules/device'
import { getExerciseSummaryApi, getExerciseSeriesApi, type ExerciseState } from '@/api/modules/exercise'
import VitalDetailChart from '@/components/VitalDetailChart.vue'
import { SPECIES_ICON, SPECIES_LABEL, DEVICE_STATUS } from '@/utils/consts'
import { petAvatarSrc } from '@/utils/petAvatar'
import type { ExercisePoint } from '@/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

type ExerciseMetricKey = 'stepFreq' | 'stride' | 'speed' | 'gait'

interface MetricConfig {
  key: ExerciseMetricKey
  labelKey: string
  unitKey: string
  color: string
  decimals?: number
}

/** 运动指标（步频 / 步幅 / 速度 / 步态），样式对齐体征健康详情页 */
const METRICS: MetricConfig[] = [
  { key: 'stepFreq', labelKey: 'user.health.stepFreq', unitKey: 'user.health.stepFreqUnit', color: '#ff9f43' },
  { key: 'stride', labelKey: 'user.health.stride', unitKey: 'user.health.strideUnit', color: '#5b8ff9' },
  { key: 'speed', labelKey: 'user.health.speed', unitKey: 'user.health.speedUnit', color: '#00b4a6', decimals: 2 },
  { key: 'gait', labelKey: 'user.health.gait', unitKey: '', color: '#ff6b6b' },
]

const NUMERIC_METRICS = METRICS.filter((m) => m.key !== 'gait')

/** 统计周期：单日 / 本周 / 本月 / 本季度 */
const PERIODS = [
  { value: 'day', labelKey: 'user.health.periodDay', days: 1 },
  { value: 'week', labelKey: 'user.health.periodWeek', days: 7 },
  { value: 'month', labelKey: 'user.health.periodMonth', days: 30 },
  { value: 'quarter', labelKey: 'user.health.periodQuarter', days: 90 },
] as const
type PeriodValue = (typeof PERIODS)[number]['value']

/* ===== 步态分布 ===== */
const GAITS: ExercisePoint['gait'][] = ['walk', 'trot', 'run', 'rest']
const GAIT_COLOR: Record<ExercisePoint['gait'], string> = {
  walk: '#00b4a6',
  trot: '#5b8ff9',
  run: '#ff9f43',
  rest: '#c0c4cc',
}

const petId = computed(() => route.params.petId as string)
const metricKey = computed(() => route.params.metricType as string)

const pet = ref<PetJoined | null>(null)
const devices = ref<DeviceJoined[]>([])
const summary = ref<ExerciseState | null>(null)
const points = ref<ExercisePoint[]>([])
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

const unit = computed(() => (activeMetric.value.unitKey ? t(activeMetric.value.unitKey) : ''))

function fmt(v: number | undefined): string {
  if (v === undefined || Number.isNaN(v)) return '--'
  const dec = activeMetric.value.decimals
  return dec ? v.toFixed(dec) : String(Math.round(v))
}

/** 当前指标的趋势点（步态为分类值，不参与折线/柱状图） */
const seriesPoints = computed(() => {
  const key = activeMetric.value.key
  if (key === 'gait') return [] as { ts: number; value: number }[]
  return points.value.map((p) => ({ ts: p.ts, value: p[key] }))
})

function latestValue(): number | undefined {
  const s = summary.value
  if (!s) return undefined
  switch (activeMetric.value.key) {
    case 'stepFreq': return s.stepFreq
    case 'stride': return s.stride
    case 'speed': return s.speed
    default: return undefined
  }
}

/** 当日/周期波动区间（min-max + 单位） */
const rangeText = computed(() => {
  if (!seriesPoints.value.length) return '--'
  const vals = seriesPoints.value.map((p) => p.value)
  return `${fmt(Math.min(...vals))}-${fmt(Math.max(...vals))}${unit.value}`
})

/** 右上角最新实时值 */
const latestText = computed(() => {
  const v = latestValue()
  return v === undefined ? '--' : `${fmt(v)}${unit.value}`
})

const collectedTime = computed(() => (summary.value ? dayjs(summary.value.updatedAt).format('HH:mm') : '--'))

/** 步态分布（当前周期内各步态占比） */
const gaitDistribution = computed(() => {
  if (!points.value.length) return [] as { gait: ExercisePoint['gait']; count: number; percent: number }[]
  const total = points.value.length
  return GAITS.map((g) => {
    const count = points.value.filter((p) => p.gait === g).length
    return { gait: g, count, percent: Math.round((count / total) * 100) }
  })
})

const currentGait = computed(() => summary.value?.gait ?? null)

/** 活跃占比：非静止（行走/小跑/奔跑）时间占比 */
const activeRatio = computed(() => {
  if (!points.value.length) return 0
  const active = points.value.filter((p) => p.gait !== 'rest').length
  return Math.round((active / points.value.length) * 100)
})

/* ===== 周期运动分析报告 ===== */

interface AnalysisItem {
  key: Exclude<ExerciseMetricKey, 'gait'>
  labelKey: string
  unitKey: string
  decimals?: number
  avg: number
  min: number
  max: number
}

const analysis = computed<AnalysisItem[]>(() => {
  if (!points.value.length) return []
  return NUMERIC_METRICS.map((m) => {
    const key = m.key as Exclude<ExerciseMetricKey, 'gait'>
    const vals = points.value.map((p) => p[key])
    const avg = vals.reduce((s, n) => s + n, 0) / vals.length
    return {
      key,
      labelKey: m.labelKey,
      unitKey: m.unitKey,
      decimals: m.decimals,
      avg,
      min: Math.min(...vals),
      max: Math.max(...vals),
    }
  })
})

type ExerciseLevel = 'adequate' | 'moderate' | 'insufficient'

const exerciseLevel = computed<ExerciseLevel>(() => {
  if (activeRatio.value >= 60) return 'adequate'
  if (activeRatio.value >= 30) return 'moderate'
  return 'insufficient'
})

const EXERCISE_LEVEL_LABEL_KEY: Record<ExerciseLevel, string> = {
  adequate: 'user.health.exerciseConclusionAdequate',
  moderate: 'user.health.exerciseConclusionModerate',
  insufficient: 'user.health.exerciseConclusionInsufficient',
}
const EXERCISE_LEVEL_TEXT_KEY: Record<ExerciseLevel, string> = {
  adequate: 'user.health.exerciseConclusionAdequateText',
  moderate: 'user.health.exerciseConclusionModerateText',
  insufficient: 'user.health.exerciseConclusionInsufficientText',
}

function metricColor(key: string): string {
  return METRICS.find((m) => m.key === key)?.color ?? '#ff6b00'
}

function fmtVal(v: number, dec?: number): string {
  return dec ? v.toFixed(dec) : String(Math.round(v))
}

function getGaitLabel(gait: string): string {
  const key = `user.health.gaitTypes.${gait}` as any
  return t(key) || gait
}

const deviceName = computed(() =>
  pet.value ? t('user.sync.collarOf', { name: pet.value.name }) : '',
)

const dateDisplay = computed(() => dayjs(selectedDate.value).format('MM-DD'))

const periodActions = computed(() =>
  PERIODS.map((p) => ({ name: t(p.labelKey), value: p.value })),
)

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
    return
  }
  loading.value = true
  try {
    const days = currentPeriod.value.days
    const [s, series] = await Promise.all([
      getExerciseSummaryApi(petId.value),
      getExerciseSeriesApi(petId.value, days),
    ])
    summary.value = s
    points.value = series.points ?? []
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
    points.value = []
    summary.value = null
  } finally {
    loading.value = false
  }
}

function onMetricTab(key: string) {
  if (key === activeMetric.value.key) return
  router.replace(`/user/health/exercise/${petId.value}/${key}`)
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
  loadBase()
}, { immediate: true })

watch([petId, metricKey, period, selectedDate], () => {
  loadData()
}, { immediate: true })
</script>

<template>
  <div class="vital-detail exercise-detail">
    <!-- 顶部头部：宠物信息 + 设备 -->
    <header class="vital-header">
      <div v-if="pet" class="pet-block">
        <img class="pet-avatar" :src="petAvatarSrc(pet.name) || pet.avatar" :alt="pet.name" />
        <div class="pet-info">
          <div class="pet-name">{{ SPECIES_ICON[pet.species] }} {{ pet.name }}</div>
          <div class="pet-meta">{{ t(SPECIES_LABEL[pet.species]) }} · {{ pet.breed }}</div>
        </div>
      </div>

      <div class="header-right">
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

    <!-- 日期筛选（周期 + 单日日期） -->
    <div class="date-bar">
      <button type="button" class="period-btn" @click="showPeriodSheet = true">
        {{ t(currentPeriod.labelKey) }}
        <van-icon name="arrow-down" />
      </button>
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
      <!-- 步态：当前步态（左）+ 活跃占比（右）；其余指标：波动区间 + 最新值 -->
      <div class="detail-head">
        <div class="detail-range">
          <div v-if="activeMetric.key === 'gait'" class="range-value">
            {{ currentGait ? getGaitLabel(currentGait) : '--' }}
          </div>
          <div v-else class="range-value">{{ rangeText }}</div>
          <div class="range-label">
            {{ t(activeMetric.key === 'gait' ? 'user.health.currentGait' : (period === 'day' ? 'user.health.dayRange' : 'user.health.periodRange')) }}
          </div>
        </div>
        <div class="detail-latest">
          <div v-if="activeMetric.key === 'gait'" class="latest-value">{{ activeRatio }}%</div>
          <div v-else class="latest-value">{{ latestText }}</div>
          <div class="latest-time">{{ t('user.health.collectedAt', { time: collectedTime }) }}</div>
          <div v-if="activeMetric.key === 'gait'" class="resting-hr">{{ t('user.health.activeRatio') }}</div>
        </div>
      </div>

      <!-- 走势图 / 步态分布 -->
      <div class="chart-wrap">
        <van-skeleton v-if="loading" :loading="loading" :row="4" />
        <VitalDetailChart
          v-else-if="activeMetric.key !== 'gait' && seriesPoints.length"
          :points="seriesPoints"
          :unit="unit"
          :color="activeMetric.color"
          height="230px"
        />
        <div v-else-if="activeMetric.key === 'gait' && gaitDistribution.length" class="gait-bars">
          <div v-for="g in gaitDistribution" :key="g.gait" class="gait-bar-row">
            <span class="gait-name">{{ getGaitLabel(g.gait) }}</span>
            <div class="gait-track">
              <div class="gait-fill" :style="{ width: g.percent + '%', background: GAIT_COLOR[g.gait] }" />
            </div>
            <span class="gait-pct">{{ g.percent }}%</span>
          </div>
        </div>
        <van-empty v-else :description="t('user.health.noExerciseData')" />
      </div>
    </section>

    <!-- 周期运动分析报告 -->
    <section v-if="analysis.length" class="analysis-report">
      <header class="analysis-head">
        <div class="analysis-title">
          <h3>{{ t('user.health.exerciseAnalysisReport') }}</h3>
          <p>
            {{ t('user.health.exerciseAnalysisSubtitle', {
              period: t(currentPeriod.labelKey),
              species: pet ? t(SPECIES_LABEL[pet.species]) : '',
            }) }}
          </p>
        </div>
        <span class="analysis-overall" :class="`is-${exerciseLevel}`">
          {{ t(EXERCISE_LEVEL_LABEL_KEY[exerciseLevel]) }}
        </span>
      </header>

      <ul class="analysis-list">
        <li v-for="item in analysis" :key="item.key" class="analysis-item">
          <div class="item-head">
            <span class="item-name">
              <i class="item-dot" :style="{ background: metricColor(item.key) }" />
              {{ t(item.labelKey) }}
            </span>
          </div>

          <div class="item-nums">
            <b class="item-avg">{{ fmtVal(item.avg, item.decimals) }}<em>{{ t(item.unitKey) }}</em></b>
            <span class="item-range">
              {{ t('user.health.analysisRange') }} {{ fmtVal(item.min, item.decimals) }} - {{ fmtVal(item.max, item.decimals) }}{{ t(item.unitKey) }}
            </span>
          </div>
        </li>

        <!-- 活跃占比（周期内非静止时间占比） -->
        <li class="analysis-item">
          <div class="item-head">
            <span class="item-name">
              <i class="item-dot" style="background: #34c759" />
              {{ t('user.health.activeRatio') }}
            </span>
          </div>
          <div class="active-row">
            <div class="active-track"><div class="active-fill" :style="{ width: activeRatio + '%' }" /></div>
            <span class="active-pct">{{ activeRatio }}%</span>
          </div>
        </li>
      </ul>

      <div class="analysis-conclusion" :class="`is-${exerciseLevel}`">
        <h4>{{ t('user.health.analysisConclusion') }}</h4>
        <p>{{ t(EXERCISE_LEVEL_TEXT_KEY[exerciseLevel]) }}</p>
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
.exercise-detail {
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

/* ===== 日期筛选栏 ===== */
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

  /* 步态分布条 */
  .gait-bars {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 4px 6px 2px;

    .gait-bar-row {
      display: flex;
      align-items: center;
      gap: 10px;

      .gait-name {
        flex-shrink: 0;
        width: 34px;
        font-size: 12px;
        color: #5e6d82;
      }

      .gait-track {
        flex: 1;
        height: 10px;
        border-radius: 5px;
        background: #f0f3f8;
        overflow: hidden;

        .gait-fill {
          height: 100%;
          border-radius: 5px;
          transition: width 0.4s;
        }
      }

      .gait-pct {
        flex-shrink: 0;
        width: 40px;
        text-align: right;
        font-size: 12px;
        font-weight: 600;
        color: #1f2d3d;
      }
    }
  }
}

/* ===== 周期运动分析报告 ===== */
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

      &.is-adequate { color: #1a9e4c; background: #e8f9ee; }
      &.is-moderate { color: #d17a00; background: #fff4e4; }
      &.is-insufficient { color: #d43d33; background: #ffeceb; }
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

      .active-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 8px;

        .active-track {
          flex: 1;
          height: 8px;
          border-radius: 4px;
          background: #f0f3f8;
          overflow: hidden;

          .active-fill {
            height: 100%;
            border-radius: 4px;
            background: linear-gradient(90deg, #34c759, #ff9f43);
            transition: width 0.4s;
          }
        }

        .active-pct {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 700;
          color: #1f2d3d;
        }
      }
    }
  }

  .analysis-conclusion {
    margin-top: 14px;
    padding: 12px;
    border-radius: 12px;
    background: #fafbfc;

    &.is-adequate { background: #f4fbf7; }
    &.is-moderate { background: #fff8ec; }
    &.is-insufficient { background: #fff4f3; }

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

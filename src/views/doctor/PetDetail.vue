<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getPetDetailApi, type PetDetail } from '@/api/modules/pet'
import { getDoctorConsultationsApi, type ConsultationJoined } from '@/api/modules/consultation'
import { getHealthSeriesApi, getHealthTelemetryApi, getHealthRangesApi, type SeriesPoint } from '@/api/modules/health'
import { getAllReportsApi, type ReportJoined } from '@/api/modules/report'
import VitalChart from '@/components/VitalChart.vue'
import { SPECIES_ICON, GENDER_LABEL } from '@/utils/consts'
import { ageOf, formatDate, formatDateTime } from '@/utils/format'
import { petAvatarSrc } from '@/utils/petAvatar'
import type { HealthMetric, HealthMetricType, NormalRange } from '@/types'

const route = useRoute()
const petId = route.params.id as string
const { t } = useI18n()

const METRICS: { key: HealthMetricType; labelKey: string; unitKey: string; color: string }[] = [
  { key: 'temperature', labelKey: 'user.health.temperature', unitKey: 'user.health.degreeC', color: '#ff9f43' },
  { key: 'heartRate', labelKey: 'user.health.heartRate', unitKey: 'user.health.bpm', color: '#ff6b6b' },
  { key: 'spo2', labelKey: 'user.health.spo2', unitKey: 'user.health.percent', color: '#00b4a6' },
  { key: 'respiratoryRate', labelKey: 'user.health.respiratory', unitKey: 'user.health.bpm', color: '#5b8ff9' },
]

const pet = ref<PetDetail | null>(null)
const consult = ref<ConsultationJoined | null>(null)
const reports = ref<ReportJoined[]>([])
const ranges = ref<Record<string, NormalRange>>({})
const latest = ref<HealthMetric | null>(null)
const range = ref<'1d' | '7d'>('1d')
const seriesMap = ref<Partial<Record<HealthMetricType, { points: SeriesPoint[]; unit: string; range: NormalRange | null }>>>({})
const loading = ref(false)

const vitals = computed(() => {
  if (!latest.value) return []
  const source = latest.value as unknown as Record<string, number>
  return METRICS.map((m) => {
    const r = ranges.value[m.key]
    const v = source[m.key]
    const abnormal = r ? v < r.min || v > r.max : false
    return { key: m.key, label: t(m.labelKey), value: m.key === 'temperature' ? v.toFixed(1) : String(v), unit: t(m.unitKey), color: m.color, abnormal }
  })
})

const abnormalNames = computed(() => vitals.value.filter((v) => v.abnormal).map((v) => v.label))

async function loadSeries() {
  if (!pet.value) return
  const days = range.value === '7d' ? 7 : 1
  const entries = await Promise.all(
    METRICS.map(async (m) => {
      const res = await getHealthSeriesApi(petId, m.key, days)
      return [m.key, { points: res.points, unit: res.unit, range: res.range }] as const
    }),
  )
  seriesMap.value = Object.fromEntries(entries) as typeof seriesMap.value
}

async function loadAll() {
  if (loading.value) return
  loading.value = true
  try {
    const [d, consults, all, rs] = await Promise.all([
      getPetDetailApi(petId),
      getDoctorConsultationsApi(),
      getAllReportsApi(),
      getHealthRangesApi(),
    ])
    pet.value = d
    consult.value = consults.find((c) => c.petId === petId) ?? null
    reports.value = all.filter((r) => r.petId === petId).sort((a, b) => b.startAt - a.startAt)
    ranges.value = rs
    if (d.device) {
      try {
        const tele = await getHealthTelemetryApi(d.device.id)
        latest.value = tele.points[tele.points.length - 1] ?? null
      } catch {
        latest.value = null
      }
    }
    await loadSeries()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

function onRangeChange() {
  loadSeries().catch(() => undefined)
}

function reviewTag(s: string | null) {
  if (s === 'approved') return { key: 'status.approved', type: 'success' as const }
  if (s === 'rejected') return { key: 'status.rejected', type: 'danger' as const }
  return { key: 'status.pendingReview', type: 'warning' as const }
}

onMounted(loadAll)
</script>

<template>
  <div class="pet-detail">
    <van-skeleton :loading="loading" title :row="8" />

    <template v-if="pet">
      <!-- 宠物 + 主人头卡 -->
      <div class="head-card sp-card">
        <div class="head-top">
          <van-image round width="60" height="60" :src="petAvatarSrc(pet.name) || pet.avatar" />
          <div class="head-main">
            <div class="head-name">{{ SPECIES_ICON[pet.species] }} {{ pet.name }}</div>
            <div class="head-sub">
              {{ pet.breed }} · {{ t(GENDER_LABEL[pet.gender]) }} · {{ t('common.yearsOld', { n: ageOf(pet.birthDate) }) }} · {{ pet.weight }} kg
            </div>
            <div class="head-chip">
              {{ t('doctor.petDetail.owner') }}：{{ pet.owner?.name ?? '-' }} · {{ t('doctor.petDetail.phone') }} {{ pet.owner?.phone ?? '-' }}
            </div>
          </div>
        </div>
        <div v-if="consult?.note" class="note-box">
          <span class="note-label">{{ t('doctor.petDetail.consultationNote') }}</span>
          {{ consult.note }}
        </div>
        <div v-if="consult" class="pushed-line">
          {{ t('doctor.petDetail.pushedAt') }}：{{ formatDateTime(consult.pushedAt) }}
        </div>
      </div>

      <!-- 最新生命体征 -->
      <div class="sp-card section">
        <div class="section-title">
          {{ t('doctor.petDetail.vitals') }}
          <span v-if="abnormalNames.length" class="abnormal-hint">{{ t('doctor.petDetail.abnormal') }}：{{ abnormalNames.join('、') }}</span>
        </div>
        <div class="vital-grid">
          <div v-for="v in vitals" :key="v.key" class="vital-item" :class="{ abnormal: v.abnormal }">
            <div class="vital-value" :style="{ color: v.abnormal ? '#ff3b30' : v.color }">
              {{ v.value }}<span class="unit">{{ v.unit }}</span>
            </div>
            <div class="vital-label">{{ v.label }}</div>
          </div>
        </div>
      </div>

      <!-- 四指标曲线 -->
      <div class="sp-card section">
        <div class="section-head">
          <span class="section-title">{{ t('doctor.petDetail.telemetry') }}</span>
          <van-radio-group v-model="range" direction="horizontal" class="range-toggle" @change="onRangeChange">
            <van-radio name="1d" icon-size="14px">{{ t('common.day1') }}</van-radio>
            <van-radio name="7d" icon-size="14px">{{ t('common.week7') }}</van-radio>
          </van-radio-group>
        </div>
        <div v-for="m in METRICS" :key="m.key" class="chart-block">
          <div class="chart-name" :style="{ color: m.color }">{{ t(m.labelKey) }}</div>
          <VitalChart
            :points="seriesMap[m.key]?.points ?? []"
            :unit="seriesMap[m.key]?.unit ?? ''"
            :range="seriesMap[m.key]?.range ?? null"
            :color="m.color"
            :name="t(m.labelKey)"
            height="200px"
          />
        </div>
      </div>

      <!-- 健康报告 -->
      <div class="sp-card section">
        <div class="section-title">{{ t('doctor.petDetail.reports') }}</div>
        <div v-if="reports.length" class="report-list">
          <div v-for="r in reports" :key="r.id" class="report-row">
            <div class="report-main">
              <div class="report-period">{{ r.period }}</div>
              <div class="report-sub">{{ formatDate(r.startAt) }} ~ {{ formatDate(r.endAt) }} · {{ t('user.reports.score') }} {{ r.score }}</div>
            </div>
            <van-tag round :type="reviewTag(r.doctorReview).type">
              {{ t(reviewTag(r.doctorReview).key) }}
            </van-tag>
          </div>
        </div>
        <van-empty v-else :description="t('doctor.petDetail.noReports')" :image-size="80" />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.pet-detail {
  padding: 16px 14px;
  padding-top: 0;
}
.head-card {
  padding: 16px;
  .head-top {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .head-main {
    flex: 1;
    min-width: 0;
  }
  .head-name {
    font-size: 18px;
    font-weight: 700;
  }
  .head-sub {
    margin-top: 4px;
    font-size: 12px;
    color: var(--sp-text-secondary);
  }
  .head-chip {
    margin-top: 4px;
    font-size: 12px;
    color: var(--sp-primary);
  }
  .note-box {
    margin-top: 12px;
    font-size: 13px;
    background: var(--sp-bg);
    border-radius: 8px;
    padding: 8px 10px;
    .note-label {
      color: var(--sp-primary);
      font-weight: 600;
      margin-right: 4px;
    }
  }
  .pushed-line {
    margin-top: 8px;
    font-size: 11px;
    color: var(--sp-text-placeholder);
  }
}
.section {
  padding: 16px;
  margin-top: 12px;
  .section-title {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .abnormal-hint {
      font-size: 12px;
      font-weight: 400;
      color: var(--sp-danger);
    }
  }
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    .range-toggle {
      display: flex;
      gap: 10px;
      :deep(.van-radio__label) {
        font-size: 13px;
      }
    }
  }
}
.vital-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  .vital-item {
    text-align: center;
    padding: 14px 0;
    background: var(--sp-bg);
    border-radius: 12px;
    &.abnormal {
      outline: 1px solid rgba(255, 59, 48, 0.4);
    }
    .vital-value {
      font-size: 24px;
      font-weight: 700;
      .unit {
        font-size: 12px;
        margin-left: 2px;
      }
    }
    .vital-label {
      margin-top: 4px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
  }
}
.chart-block {
  margin-bottom: 8px;
  .chart-name {
    font-size: 13px;
    font-weight: 600;
    margin: 4px 0 2px;
  }
}
.report-list {
  .report-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px dashed var(--sp-border);
    &:last-child {
      border-bottom: none;
    }
    .report-main {
      .report-period {
        font-size: 14px;
        font-weight: 600;
      }
      .report-sub {
        margin-top: 3px;
        font-size: 12px;
        color: var(--sp-text-placeholder);
      }
    }
  }
}
</style>

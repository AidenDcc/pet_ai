<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import { getHealthSummaryApi, getHealthSeriesApi, type HealthSummary } from '@/api/modules/health'
import VitalChart from '@/components/VitalChart.vue'
import type { HealthMetricType } from '@/types'

const { t } = useI18n()

const METRICS: { key: HealthMetricType; labelKey: string; unitKey: string; color: string }[] = [
  { key: 'temperature', labelKey: 'user.health.temperature', unitKey: 'user.health.degreeC', color: '#ff9f43' },
  { key: 'heartRate', labelKey: 'user.health.heartRate', unitKey: 'user.health.bpm', color: '#ff6b6b' },
  { key: 'spo2', labelKey: 'user.health.spo2', unitKey: 'user.health.percent', color: '#00b4a6' },
  { key: 'respiratoryRate', labelKey: 'user.health.respiratory', unitKey: 'user.health.bpm', color: '#5b8ff9' },
]

const pets = ref<PetJoined[]>([])
const activePet = ref<PetJoined | null>(null)
const activeIndex = ref(0)
const summary = ref<HealthSummary | null>(null)
const metricKey = ref<HealthMetricType>('heartRate')
const range = ref<'1d' | '7d'>('1d')
const chartPoints = ref<{ ts: number; value: number }[]>([])
const chartUnit = ref('')
const chartRange = ref<{ min: number; max: number; unit: string } | null>(null)
const loading = ref(false)

const activeMetric = METRICS.find((m) => m.key === metricKey.value) ?? METRICS[0]

async function loadPets() {
  try {
    pets.value = await getMyPetsApi()
    if (pets.value.length) {
      activePet.value = pets.value[0]
      await loadAll()
    }
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  }
}

async function loadAll() {
  if (!activePet.value) return
  loading.value = true
  try {
    const [sum, series] = await Promise.all([
      getHealthSummaryApi(activePet.value.id),
      getHealthSeriesApi(activePet.value.id, metricKey.value, range.value === '7d' ? 7 : 1),
    ])
    summary.value = sum
    chartPoints.value = series.points
    chartUnit.value = series.unit
    chartRange.value = series.range
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

function onPetChange(index: number) {
  activePet.value = pets.value[index] ?? null
  summary.value = null
  if (activePet.value) loadAll().catch(() => undefined)
}

watch([metricKey, range], () => {
  if (activePet.value) loadAll().catch(() => undefined)
})

loadPets()
</script>

<template>
  <div class="health">
    <!-- 宠物切换 -->
    <van-tabs v-if="pets.length > 1" v-model:active="activeIndex" color="#ff6b00" class="pet-tabs" @change="onPetChange">
      <van-tab v-for="p in pets" :key="p.id" :title="p.name" />
    </van-tabs>

    <van-skeleton :loading="loading && !summary" :row="4" class="mt-8" />

    <template v-if="summary && activePet">
      <!-- 实时指标卡片 -->
      <div class="metric-cards">
        <div class="metric-card sp-card">
          <div class="metric-value" style="color: #ff9f43">{{ summary.temperature.latest }}°</div>
          <div class="metric-label">{{ t('user.health.temperature') }} {{ t('user.health.degreeC') }}</div>
          <div class="metric-sub">{{ t('user.health.avgValue') }} {{ summary.temperature.avg }}°</div>
        </div>
        <div class="metric-card sp-card">
          <div class="metric-value" style="color: #ff6b6b">{{ summary.heartRate.latest }}</div>
          <div class="metric-label">{{ t('user.health.heartRate') }} {{ t('user.health.bpm') }}</div>
          <div class="metric-sub">{{ t('user.health.todayAvg') }} {{ summary.heartRate.avg }}</div>
        </div>
        <div class="metric-card sp-card">
          <div class="metric-value" style="color: #00b4a6">{{ summary.spo2.latest }}</div>
          <div class="metric-label">{{ t('user.health.spo2') }} {{ t('user.health.percent') }}</div>
          <div class="metric-sub">{{ t('user.health.avgValue') }} {{ summary.spo2.avg }}</div>
        </div>
        <div class="metric-card sp-card">
          <div class="metric-value" style="color: #5b8ff9">{{ summary.respiratoryRate.latest }}</div>
          <div class="metric-label">{{ t('user.health.respiratory') }} {{ t('user.health.bpm') }}</div>
          <div class="metric-sub">{{ t('user.health.avgValue') }} {{ summary.respiratoryRate.avg }}</div>
        </div>
      </div>

      <!-- 指标选择与范围 -->
      <div class="chart-card sp-card mt-16">
        <div class="chart-head">
          <van-radio-group v-model="range" direction="horizontal" class="range-toggle">
            <van-radio name="1d" icon-size="14px">{{ t('common.today') }}</van-radio>
            <van-radio name="7d" icon-size="14px">{{ t('common.week7') }}</van-radio>
          </van-radio-group>
        </div>
        <div class="metric-chips">
          <div
            v-for="m in METRICS"
            :key="m.key"
            class="metric-chip"
            :class="{ active: metricKey === m.key }"
            :style="metricKey === m.key ? { background: m.color, color: '#fff' } : {}"
            @click="metricKey = m.key"
          >
            {{ t(m.labelKey) }}
          </div>
        </div>
        <div class="chart-title">
          {{ t(activeMetric.labelKey) }}{{ t('user.health.trend') }}
          <span class="chart-sub">24h · {{ t(activeMetric.unitKey) }}</span>
        </div>
        <VitalChart
          :points="chartPoints"
          :unit="chartUnit"
          :color="activeMetric.color"
          :range="chartRange"
          :name="t(activeMetric.labelKey)"
          height="230px"
        />
      </div>
    </template>

    <van-empty v-else-if="!loading && !pets.length" :description="t('user.health.noDevice')" />
  </div>
</template>

<style scoped lang="scss">
.health {
  padding: 16px 14px;
  padding-top: 0;
}
.pet-tabs {
  margin-bottom: 12px;
  :deep(.van-tabs__wrap) {
    background: #fff;
    border-radius: 12px;
  }
}
.metric-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  .metric-card {
    padding: 14px;
    .metric-value {
      font-size: 22px;
      font-weight: 800;
    }
    .metric-label {
      margin-top: 4px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
    .metric-sub {
      margin-top: 4px;
      font-size: 11px;
      color: var(--sp-text-placeholder);
    }
  }
}
.chart-card {
  padding: 14px;
}
.chart-head {
  margin-bottom: 10px;
  :deep(.van-radio-group) {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    .van-radio__label {
      font-size: 13px;
    }
  }
}
.metric-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  .metric-chip {
    flex-shrink: 0;
    padding: 6px 14px;
    border-radius: 16px;
    font-size: 13px;
    background: #f0f3f8;
    color: var(--sp-text-secondary);
    cursor: pointer;
  }
}
.chart-title {
  margin: 10px 0 6px;
  font-size: 15px;
  font-weight: 700;
  .chart-sub {
    font-size: 11px;
    font-weight: 400;
    color: var(--sp-text-placeholder);
  }
}
</style>

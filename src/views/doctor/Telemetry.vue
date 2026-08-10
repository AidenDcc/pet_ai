<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { getDoctorPatientsApi, type PatientRow } from '@/api/modules/pet'
import { getDeviceListApi, type DeviceJoined } from '@/api/modules/device'
import { getHealthTelemetryApi } from '@/api/modules/health'
import VitalChart from '@/components/VitalChart.vue'
import { DEVICE_STATUS, toVantTagType } from '@/utils/consts'
import { formatDateTime } from '@/utils/format'
import { petAvatarSrc } from '@/utils/petAvatar'
import type { HealthMetric, HealthMetricType } from '@/types'

const { t } = useI18n()

const patients = ref<PatientRow[]>([])
const devices = ref<DeviceJoined[]>([])
const selected = ref('')
const points = ref<HealthMetric[]>([])
const updatedAt = ref(Date.now())
const metricKey = ref<HealthMetricType>('heartRate')
const loading = ref(false)
const pickerVisible = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const METRICS: { key: HealthMetricType; labelKey: string; color: string }[] = [
  { key: 'heartRate', labelKey: 'doctor.telemetry.heartRate', color: '#ff6b6b' },
  { key: 'spo2', labelKey: 'doctor.telemetry.spo2', color: '#00b4a6' },
  { key: 'temperature', labelKey: 'doctor.telemetry.temperature', color: '#ff9f43' },
  { key: 'activity', labelKey: 'doctor.telemetry.activity', color: '#7d6bff' },
]

const activeMetric = computed(() => {
  const found = METRICS.find((m) => m.key === metricKey.value) ?? METRICS[0]
  return { ...found, label: t(found.labelKey) }
})
const selectedPatient = computed(() => patients.value.find((p) => p.id === selected.value))

const latest = computed(() => {
  const last = points.value[points.value.length - 1]
  if (!last) return null
  return last
})

const chartData = computed(() =>
  points.value.map((p) => {
    let value = 0
    const k = metricKey.value
    if (k === 'activity') value = p.activity
    else if (k === 'temperature') value = p.temperature
    else if (k === 'heartRate') value = p.heartRate
    else if (k === 'respiratoryRate') value = p.respiratoryRate
    else if (k === 'spo2') value = p.spo2
    return { ts: p.ts, value }
  }),
)

async function loadPatients() {
  loading.value = true
  try {
    const [page, devList] = await Promise.all([getDoctorPatientsApi({ page: 1, pageSize: 100 }), getDeviceListApi()])
    patients.value = page.list
    devices.value = devList
    const online = page.list.find((p) => p.device?.status === 'online')
    selected.value = online?.id ?? page.list[0]?.id ?? ''
    if (selected.value) await loadTelemetry()
  } finally {
    loading.value = false
  }
}

async function loadTelemetry() {
  const patient = patients.value.find((p) => p.id === selected.value)
  const device = devices.value.find((d) => d.id === patient?.device?.id)
  if (!device) return
  const res = await getHealthTelemetryApi(device.id)
  points.value = res.points
  updatedAt.value = Date.now()
}

function tick() {
  // 客户端模拟实时采样：基于最后一点做轻微随机游走
  if (!points.value.length) return
  const last = points.value[points.value.length - 1]
  const next: HealthMetric = {
    ts: Date.now(),
    heartRate: clamp(last.heartRate + Math.round(Math.random() * 8 - 4), 40, 220),
    respiratoryRate: clamp(last.respiratoryRate + Math.round(Math.random() * 4 - 2), 10, 60),
    spo2: clamp(Number((last.spo2 + (Math.random() * 0.4 - 0.2)).toFixed(1)), 90, 100),
    temperature: clamp(Number((last.temperature + (Math.random() * 0.2 - 0.1)).toFixed(1)), 36, 41),
    activity: last.activity + Math.round(Math.random() * 60),
    sleepStage: 'awake',
  }
  points.value = [...points.value.slice(1), next]
  updatedAt.value = Date.now()
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function pickPatient(id: string) {
  pickerVisible.value = false
  if (id !== selected.value) {
    selected.value = id
    loadTelemetry().catch(() => undefined)
  }
}

onMounted(() => {
  loadPatients().catch(() => undefined)
  timer = setInterval(tick, 5000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="telemetry">
    <van-skeleton :loading="loading" :row="6" class="mt-8" />

    <template v-if="!loading && selectedPatient">
      <!-- 患者选择 -->
      <div class="selector sp-card" @click="pickerVisible = true">
        <van-image round width="32" height="32" :src="petAvatarSrc(selectedPatient.name) || selectedPatient.avatar" />
        <div class="selector-info">
          <div class="selector-name">{{ selectedPatient.name }} · {{ selectedPatient.breed }}</div>
          <div class="selector-desc">{{ t('doctor.telemetry.realtimeNote') }}</div>
        </div>
        <van-tag round :type="toVantTagType(DEVICE_STATUS[selectedPatient.device?.status ?? 'offline'].tag)">
          {{ t(DEVICE_STATUS[selectedPatient.device?.status ?? 'offline'].labelKey) }}
        </van-tag>
        <van-icon name="arrow" color="#c0c4cc" />
      </div>

      <!-- 实时指标 2×2 -->
      <div class="metric-cards">
        <div v-for="m in METRICS" :key="m.key" class="metric-card sp-card">
          <div class="metric-head">
            <span>{{ t(m.labelKey) }}</span>
            <span class="live-dot" />
          </div>
          <div class="metric-value" :style="{ color: m.color }">
            {{
              m.key === 'heartRate'
                ? latest?.heartRate
                : m.key === 'spo2'
                  ? latest?.spo2
                  : m.key === 'temperature'
                    ? `${latest?.temperature}°`
                    : latest?.activity ?? '--'
            }}
          </div>
          <div class="metric-unit">
            {{
              m.key === 'heartRate'
                ? t('doctor.telemetry.bpm')
                : m.key === 'spo2'
                  ? t('doctor.telemetry.percent')
                  : m.key === 'temperature'
                    ? t('doctor.telemetry.degreeC')
                    : t('doctor.telemetry.steps')
            }}
          </div>
        </div>
      </div>

      <!-- 实时曲线 -->
      <div class="chart-card sp-card mt-16">
        <div class="chart-head">
          <span class="fw-600">{{ activeMetric.label }}{{ t('doctor.telemetry.realtime') }}</span>
          <span class="updated">{{ t('doctor.telemetry.updated') }}: {{ formatDateTime(updatedAt) }}</span>
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
        <VitalChart
          :points="chartData"
          :unit="activeMetric.key === 'temperature' ? t('doctor.telemetry.degreeC') : activeMetric.key === 'activity' ? t('doctor.telemetry.steps') : activeMetric.key === 'spo2' ? t('doctor.telemetry.percent') : t('doctor.telemetry.bpm')"
          :color="activeMetric.color"
          :name="activeMetric.label"
          height="230px"
        />
      </div>
    </template>

    <van-empty v-else-if="!loading && !patients.length" :description="t('doctor.telemetry.noPatient')" />

    <!-- 患者选择弹层 -->
    <van-popup v-model:show="pickerVisible" position="bottom" round safe-area-inset-bottom class="picker-popup">
      <div class="picker-title">{{ t('doctor.telemetry.selectPatient') }}</div>
      <div class="picker-list">
        <div
          v-for="p in patients"
          :key="p.id"
          class="picker-item"
          :class="{ active: selected === p.id }"
          @click="pickPatient(p.id)"
        >
          <div class="picker-name">
            {{ p.name }} · {{ p.breed }}
            <van-tag round :type="toVantTagType(DEVICE_STATUS[p.device?.status ?? 'offline'].tag)">
              {{ t(DEVICE_STATUS[p.device?.status ?? 'offline'].labelKey) }}
            </van-tag>
          </div>
          <van-icon v-if="selected === p.id" name="success" color="#00b4a6" />
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped lang="scss">
.telemetry {
  padding: 16px 14px;
  padding-top: 0;
}
.selector {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  .selector-info {
    flex: 1;
    min-width: 0;
  }
  .selector-name {
    font-size: 15px;
    font-weight: 600;
  }
  .selector-desc {
    margin-top: 2px;
    font-size: 11px;
    color: var(--sp-text-placeholder);
  }
}
.metric-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 12px;
  .metric-card {
    padding: 14px;
    .metric-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      color: var(--sp-text-secondary);
    }
    .metric-value {
      font-size: 26px;
      font-weight: 800;
      margin: 8px 0 2px;
    }
    .metric-unit {
      font-size: 12px;
      color: var(--sp-text-placeholder);
    }
  }
}
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34c759;
  box-shadow: 0 0 0 4px rgba(52, 199, 89, 0.2);
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
.chart-card {
  padding: 14px;
  .chart-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  .updated {
    font-size: 11px;
    color: var(--sp-text-placeholder);
  }
}
.metric-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 10px 0 6px;
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

.picker-popup {
  max-height: 70%;
  overflow-y: auto;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
  .picker-title {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .picker-list {
    max-height: 55vh;
    overflow-y: auto;
  }
  .picker-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 4px;
    border-bottom: 1px solid var(--sp-border);
    &.active {
      background: rgba(0, 180, 166, 0.05);
    }
    .picker-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
  }
}
</style>

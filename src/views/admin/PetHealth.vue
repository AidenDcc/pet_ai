<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { getAdminPetsApi, type PetJoined } from '@/api/modules/pet'
import {
  getHealthTelemetryApi,
  getHealthSeriesApi,
  getHealthRangesApi,
  type SeriesPoint,
} from '@/api/modules/health'
import { getExerciseSummaryApi, getExerciseSeriesApi, type ExerciseState } from '@/api/modules/exercise'
import { getDeviceTrackApi } from '@/api/modules/device'
import VitalChart from '@/components/VitalChart.vue'
import Amap from '@/components/Amap.vue'
import { SPECIES_ICON, SPECIES_LABEL, GENDER_LABEL, DEVICE_STATUS } from '@/utils/consts'
import { ageOf } from '@/utils/format'
import type { HealthMetric, HealthMetricType, NormalRange, ExercisePoint } from '@/types'

const { t } = useI18n()

/** 体征指标（最新值 + 趋势曲线） */
const METRICS: { key: HealthMetricType; labelKey: string; unitKey: string; color: string }[] = [
  { key: 'temperature', labelKey: 'user.health.temperature', unitKey: 'user.health.degreeC', color: '#ff9f43' },
  { key: 'heartRate', labelKey: 'user.health.heartRate', unitKey: 'user.health.bpm', color: '#ff6b6b' },
  { key: 'spo2', labelKey: 'user.health.spo2', unitKey: 'user.health.percent', color: '#00b4a6' },
  { key: 'respiratoryRate', labelKey: 'user.health.respiratory', unitKey: 'user.health.bpm', color: '#5b8ff9' },
]

/** 运动状态卡片 */
const EXERCISE_STATE: { key: 'stepFreq' | 'stride' | 'gait' | 'speed'; labelKey: string; unitKey: string; icon: string }[] = [
  { key: 'stepFreq', labelKey: 'user.health.stepFreq', unitKey: 'user.health.stepFreqUnit', icon: '👟' },
  { key: 'stride', labelKey: 'user.health.stride', unitKey: 'user.health.strideUnit', icon: '📏' },
  { key: 'gait', labelKey: 'user.health.gait', unitKey: '', icon: '🚶' },
  { key: 'speed', labelKey: 'user.health.speed', unitKey: 'user.health.speedUnit', icon: '⚡' },
]

/** 运动趋势子指标 */
const EXERCISE_SUB: { key: 'stepFreq' | 'stride' | 'speed'; labelKey: string; unitKey: string; color: string }[] = [
  { key: 'stepFreq', labelKey: 'user.health.stepFreq', unitKey: 'user.health.stepFreqUnit', color: '#ff9f43' },
  { key: 'stride', labelKey: 'user.health.stride', unitKey: 'user.health.strideUnit', color: '#5b8ff9' },
  { key: 'speed', labelKey: 'user.health.speed', unitKey: 'user.health.speedUnit', color: '#ff6b6b' },
]

const pets = ref<PetJoined[]>([])
const selectedPetId = ref('')
const loading = ref(false)
const tab = ref('vitals')

// 体征
const latest = ref<HealthMetric | null>(null)
const ranges = ref<Record<string, NormalRange>>({})
const seriesMap = ref<Partial<Record<HealthMetricType, { points: SeriesPoint[]; unit: string; range: NormalRange | null }>>>({})
const vitalRange = ref<'1d' | '7d'>('1d')

// 运动
const exerciseState = ref<ExerciseState | null>(null)
const exercisePoints = ref<ExercisePoint[]>([])
const exerciseSubKey = ref<'stepFreq' | 'stride' | 'speed'>('stepFreq')
const exerciseRange = ref<'1d' | '7d'>('1d')

// 轨迹
const track = ref<{ points: { lat: number; lng: number; ts: number }[]; center: { lat: number; lng: number }; address: string } | null>(null)

const selectedPet = computed(() => pets.value.find((p) => p.id === selectedPetId.value) ?? null)
const device = computed(() => selectedPet.value?.device ?? null)

const vitals = computed(() => {
  if (!latest.value) return []
  const src = latest.value as unknown as Record<string, number>
  return METRICS.map((m) => {
    const r = ranges.value[m.key]
    const v = src[m.key]
    const abnormal = r ? v < r.min || v > r.max : false
    return {
      key: m.key,
      label: t(m.labelKey),
      value: m.key === 'temperature' ? v.toFixed(1) : String(v),
      unit: t(m.unitKey),
      color: m.color,
      abnormal,
    }
  })
})

const exerciseChartPoints = computed(() =>
  exercisePoints.value.map((p) => ({ ts: p.ts, value: p[exerciseSubKey.value] as number })),
)
const exerciseSub = computed(() => EXERCISE_SUB.find((s) => s.key === exerciseSubKey.value) ?? EXERCISE_SUB[0])

function exerciseDays(): number {
  return exerciseRange.value === '7d' ? 7 : 1
}

function gaitLabel(gait: string): string {
  const key = `user.health.gaitTypes.${gait}`
  return (t(key) as string) || gait
}

async function loadVitalSeries() {
  const pet = selectedPet.value
  if (!pet) return
  const days = vitalRange.value === '7d' ? 7 : 1
  const entries = await Promise.all(
    METRICS.map(async (m) => {
      const res = await getHealthSeriesApi(pet.id, m.key, days)
      return [m.key, { points: res.points, unit: res.unit, range: res.range }] as const
    }),
  )
  seriesMap.value = Object.fromEntries(entries) as typeof seriesMap.value
}

async function loadExerciseSeries() {
  const pet = selectedPet.value
  if (!pet) return
  try {
    const res = await getExerciseSeriesApi(pet.id, exerciseDays())
    exercisePoints.value = res.points
  } catch {
    exercisePoints.value = []
  }
}

async function loadPetData() {
  const pet = selectedPet.value
  if (!pet) return
  loading.value = true
  latest.value = null
  seriesMap.value = {}
  ranges.value = {}
  exerciseState.value = null
  exercisePoints.value = []
  track.value = null
  try {
    await Promise.all([
      loadVitalSeries(),
      loadExerciseSeries(),
      getHealthRangesApi().then((r) => { ranges.value = r }).catch(() => {}),
      getExerciseSummaryApi(pet.id).then((e) => { exerciseState.value = e }).catch(() => {}),
      device.value
        ? getHealthTelemetryApi(device.value.id).then((res) => { latest.value = res.points[res.points.length - 1] ?? null }).catch(() => { latest.value = null })
        : Promise.resolve(),
      device.value
        ? getDeviceTrackApi(device.value.id).then((tr) => { track.value = tr }).catch(() => { track.value = null })
        : Promise.resolve(),
    ])
  } catch (e) {
    ElMessage.error((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function loadPets() {
  loading.value = true
  try {
    const res = await getAdminPetsApi({ page: 1, pageSize: 100 })
    pets.value = res.list
    if (pets.value.length) {
      selectedPetId.value = pets.value[0].id
      await loadPetData()
    }
  } catch (e) {
    ElMessage.error((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

function onPetChange() {
  loadPetData().catch(() => undefined)
}

function onVitalRangeChange() {
  loadVitalSeries().catch(() => undefined)
}

function onExerciseRangeChange() {
  loadExerciseSeries().catch(() => undefined)
}

loadPets()
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.petHealth') }}</div>
      <div class="page-desc">{{ t('admin.petHealth.desc') }}</div>
    </div>

    <el-card shadow="never">
      <!-- 宠物选择 + 宠物信息 -->
      <div class="filter-bar">
        <el-select
          v-model="selectedPetId"
          filterable
          :placeholder="t('admin.petHealth.selectPet')"
          style="width: 300px"
          @change="onPetChange"
        >
          <el-option v-for="p in pets" :key="p.id" :value="p.id" :label="p.name">
            <div class="pet-option">
              <el-avatar :size="22" :src="p.avatar" />
              <span>{{ SPECIES_ICON[p.species] }} {{ p.name }}</span>
              <span class="pet-option-sub">{{ p.breed }}</span>
            </div>
          </el-option>
        </el-select>
      </div>

      <div v-if="selectedPet" v-loading="loading" class="pet-head">
        <el-avatar :size="52" :src="selectedPet.avatar" />
        <div class="pet-head-main">
          <div class="pet-head-name">{{ SPECIES_ICON[selectedPet.species] }} {{ selectedPet.name }}</div>
          <div class="pet-head-meta">
            {{ t(SPECIES_LABEL[selectedPet.species]) }} · {{ selectedPet.breed }} ·
            {{ t(GENDER_LABEL[selectedPet.gender]) }} ·
            {{ t('common.yearsOld', { n: ageOf(selectedPet.birthDate) }) }} ·
            {{ selectedPet.weight }} {{ t('user.profile.weightUnit') }}
          </div>
        </div>
        <el-tag v-if="device" size="small" :type="DEVICE_STATUS[device.status].tag">
          {{ t(DEVICE_STATUS[device.status].labelKey) }}
        </el-tag>
        <el-tag v-else size="small" type="info">{{ t('admin.petHealth.noDevice') }}</el-tag>
      </div>

      <el-tabs v-model="tab" class="health-tabs">
        <!-- 体征监测 -->
        <el-tab-pane :label="t('admin.petHealth.tabs.vitals')" name="vitals">
          <div v-if="selectedPet">
            <div class="section-title">{{ t('admin.petHealth.latestVitals') }}</div>
            <el-empty v-if="!vitals.length" :description="t('admin.petHealth.noData')" :image-size="60" />
            <div v-if="vitals.length" class="vital-grid">
              <div v-for="v in vitals" :key="v.key" class="vital-card" :class="{ 'is-abnormal': v.abnormal }">
                <div class="vital-value" :style="{ color: v.abnormal ? '#ff3b30' : v.color }">
                  {{ v.value }}<span class="vital-unit">{{ v.unit }}</span>
                </div>
                <div class="vital-label">{{ v.label }}</div>
                <el-tag v-if="v.abnormal" size="small" type="danger" class="vital-tag">{{ t('status.abnormal') }}</el-tag>
              </div>
            </div>

            <div class="section-head">
              <span class="section-title">{{ t('admin.petHealth.vitalSeries') }}</span>
              <el-radio-group v-model="vitalRange" size="small" @change="onVitalRangeChange">
                <el-radio-button value="1d">{{ t('common.day1') }}</el-radio-button>
                <el-radio-button value="7d">{{ t('common.week7') }}</el-radio-button>
              </el-radio-group>
            </div>
            <el-empty v-if="!Object.keys(seriesMap).length" :description="t('admin.petHealth.noData')" :image-size="60" />
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
        </el-tab-pane>

        <!-- 运动数据 -->
        <el-tab-pane :label="t('admin.petHealth.tabs.exercise')" name="exercise">
          <div v-if="selectedPet">
            <div class="section-title">{{ t('admin.petHealth.exerciseState') }}</div>
            <div class="exercise-grid">
              <div v-for="st in EXERCISE_STATE" :key="st.key" class="exercise-card">
                <div class="exercise-icon">{{ st.icon }}</div>
                <div class="exercise-value">
                  <template v-if="exerciseState">
                    {{ st.key === 'gait' ? gaitLabel(exerciseState.gait)
                       : st.key === 'stepFreq' ? exerciseState.stepFreq
                       : st.key === 'stride' ? exerciseState.stride
                       : exerciseState.speed }}
                  </template>
                  <template v-else>--</template>
                </div>
                <div class="exercise-label">{{ t(st.labelKey) }}</div>
                <div v-if="st.unitKey" class="exercise-unit">{{ t(st.unitKey) }}</div>
              </div>
            </div>

            <div class="section-head">
              <span class="section-title">{{ t('admin.petHealth.exerciseSeries') }}</span>
              <el-radio-group v-model="exerciseRange" size="small" @change="onExerciseRangeChange">
                <el-radio-button value="1d">{{ t('common.day1') }}</el-radio-button>
                <el-radio-button value="7d">{{ t('common.week7') }}</el-radio-button>
              </el-radio-group>
            </div>
            <div class="sub-chips">
              <div
                v-for="sub in EXERCISE_SUB"
                :key="sub.key"
                class="sub-chip"
                :class="{ active: exerciseSubKey === sub.key }"
                :style="exerciseSubKey === sub.key ? { background: sub.color, color: '#fff' } : {}"
                @click="exerciseSubKey = sub.key"
              >
                {{ t(sub.labelKey) }}
              </div>
            </div>
            <el-empty v-if="!exercisePoints.length" :description="t('admin.petHealth.noData')" :image-size="60" />
            <VitalChart
              v-if="exercisePoints.length"
              :points="exerciseChartPoints"
              :unit="exerciseSub.unitKey ? t(exerciseSub.unitKey) : ''"
              :color="exerciseSub.color"
              :name="t(exerciseSub.labelKey)"
              height="240px"
            />
          </div>
        </el-tab-pane>

        <!-- 历史轨迹 -->
        <el-tab-pane :label="t('admin.petHealth.tabs.track')" name="track">
          <el-empty v-if="!device" :description="t('admin.petHealth.noDevice')" :image-size="60" />
          <template v-else-if="track">
            <div class="track-map">
              <Amap :points="track.points" :center="track.center" :show-fence="false" />
            </div>
            <div class="track-address">
              <span class="pos-dot" />
              <span>{{ track.address }}</span>
            </div>
          </template>
          <el-empty v-else :description="t('admin.petHealth.noData')" :image-size="60" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.pet-option {
  display: flex;
  align-items: center;
  gap: 8px;
  .pet-option-sub {
    color: var(--sp-text-placeholder);
    font-size: 12px;
    margin-left: auto;
  }
}

.pet-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f7f9fc;
  border-radius: 10px;
  margin-bottom: 8px;

  .pet-head-main {
    flex: 1;
    min-width: 0;
  }
  .pet-head-name {
    font-size: 17px;
    font-weight: 700;
  }
  .pet-head-meta {
    margin-top: 4px;
    font-size: 12px;
    color: var(--sp-text-secondary);
  }
}

.health-tabs {
  margin-top: 8px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  margin: 8px 0 12px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0 6px;
}

.vital-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  .vital-card {
    position: relative;
    text-align: center;
    padding: 16px 8px;
    background: #f7f9fc;
    border-radius: 12px;

    &.is-abnormal {
      outline: 1px solid rgba(255, 59, 48, 0.4);
    }

    .vital-value {
      font-size: 24px;
      font-weight: 700;
      .vital-unit {
        font-size: 12px;
        margin-left: 2px;
      }
    }
    .vital-label {
      margin-top: 6px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
    .vital-tag {
      position: absolute;
      top: 8px;
      right: 8px;
    }
  }
}

.exercise-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  .exercise-card {
    text-align: center;
    padding: 14px 8px;
    background: #f7f9fc;
    border-radius: 12px;

    .exercise-icon {
      font-size: 20px;
    }
    .exercise-value {
      font-size: 18px;
      font-weight: 700;
      margin-top: 4px;
    }
    .exercise-label {
      margin-top: 4px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
    .exercise-unit {
      font-size: 11px;
      color: var(--sp-text-placeholder);
    }
  }
}

.sub-chips {
  display: flex;
  gap: 8px;
  margin: 10px 0;

  .sub-chip {
    padding: 6px 14px;
    border-radius: 16px;
    font-size: 13px;
    background: #f0f3f8;
    color: var(--sp-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }
}

.chart-block {
  margin-bottom: 8px;
  .chart-name {
    font-size: 13px;
    font-weight: 600;
    margin: 6px 0 2px;
  }
}

.track-map {
  margin-top: 4px;
  :deep(.amap-wrap) {
    height: 420px;
  }
}

.track-address {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--sp-text-secondary);

  .pos-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4cd964;
  }
}
</style>

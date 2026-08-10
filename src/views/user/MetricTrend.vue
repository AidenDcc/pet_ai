<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import dayjs from 'dayjs'
import { getHealthSeriesApi } from '@/api/modules/health'
import { getExerciseSeriesApi } from '@/api/modules/exercise'
import { getPetApi, type PetJoined } from '@/api/modules/pet'
import VitalChart from '@/components/VitalChart.vue'
import { SPECIES_ICON, SPECIES_LABEL } from '@/utils/consts'
import type { HealthMetricType, ExercisePoint } from '@/types'

const route = useRoute()
const { t } = useI18n()

const petId = computed(() => route.params.petId as string)
const metricType = computed(() => route.params.metricType as string)

const isExercise = computed(() => metricType.value === 'exercise')

const METRIC_CONFIG: Record<string, { labelKey: string; unitKey: string; color: string }> = {
  temperature: { labelKey: 'user.health.temperature', unitKey: 'user.health.degreeC', color: '#ff9f43' },
  heartRate: { labelKey: 'user.health.heartRate', unitKey: 'user.health.bpm', color: '#ff6b6b' },
  spo2: { labelKey: 'user.health.spo2', unitKey: 'user.health.percent', color: '#00b4a6' },
  respiratoryRate: { labelKey: 'user.health.respiratory', unitKey: 'user.health.bpm', color: '#5b8ff9' },
  exercise: { labelKey: 'user.health.exercise', unitKey: '', color: '#ff6b00' },
}

const EXERCISE_SUB = [
  { key: 'stepFreq', labelKey: 'user.health.stepFreq', unitKey: 'user.health.stepFreqUnit', color: '#ff9f43' },
  { key: 'stride', labelKey: 'user.health.stride', unitKey: 'user.health.strideUnit', color: '#5b8ff9' },
  { key: 'speed', labelKey: 'user.health.speed', unitKey: 'user.health.speedUnit', color: '#ff6b6b' },
]

const activeMetric = computed(() => METRIC_CONFIG[metricType.value] ?? METRIC_CONFIG.heartRate)

// 时间模式：day / week / month
const mode = ref<'day' | 'week' | 'month'>('day')
const selectedDate = ref(new Date())
const showDatePicker = ref(false)

const chartPoints = ref<{ ts: number; value: number }[]>([])
const chartUnit = ref('')
const exerciseSubKey = ref<'stepFreq' | 'stride' | 'speed'>('stepFreq')
const exercisePoints = ref<ExercisePoint[]>([])
const loading = ref(false)

/** 当前宠物信息（昵称/头像等） */
const pet = ref<PetJoined | null>(null)

async function loadPet() {
  try {
    pet.value = await getPetApi(petId.value)
  } catch {
    pet.value = null
  }
}

const dateDisplay = computed(() => {
  if (mode.value === 'day') return dayjs(selectedDate.value).format('YYYY-MM-DD')
  if (mode.value === 'week') return t('common.week7')
  return t('common.week7')
})

const daysParam = computed(() => {
  if (mode.value === 'day') return 1
  if (mode.value === 'week') return 7
  return 30
})

async function loadData() {
  loading.value = true
  try {
    if (isExercise.value) {
      const res = await getExerciseSeriesApi(petId.value, daysParam.value)
      exercisePoints.value = res.points
      // Convert exercise points to chart format based on sub key
      const subKey = exerciseSubKey.value
      chartPoints.value = res.points.map((p) => ({ ts: p.ts, value: p[subKey] as number }))
      const sub = EXERCISE_SUB.find((s) => s.key === subKey)
      chartUnit.value = sub ? t(sub.unitKey) : ''
    } else {
      const res = await getHealthSeriesApi(petId.value, metricType.value as HealthMetricType, daysParam.value)
      chartPoints.value = res.points
      chartUnit.value = res.unit
    }
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
    chartPoints.value = []
    exercisePoints.value = []
  } finally {
    loading.value = false
  }
}

function onModeChange(newMode: string | number) {
  mode.value = newMode as 'day' | 'week' | 'month'
  if (newMode === 'day') {
    selectedDate.value = new Date()
  }
}

function onDateConfirm({ selectedValues }: { selectedValues: string[] }) {
  selectedDate.value = new Date(selectedValues[0])
  showDatePicker.value = false
}

function onExerciseSubChange(key: string) {
  exerciseSubKey.value = key as 'stepFreq' | 'stride' | 'speed'
  if (exercisePoints.value.length) {
    chartPoints.value = exercisePoints.value.map((p) => ({ ts: p.ts, value: p[exerciseSubKey.value] as number }))
    const sub = EXERCISE_SUB.find((s) => s.key === exerciseSubKey.value)
    chartUnit.value = sub ? t(sub.unitKey) : ''
  }
}

watch([metricType, mode, selectedDate, exerciseSubKey], () => {
  loadData()
}, { immediate: true })

watch(petId, loadPet, { immediate: true })
</script>

<template>
  <div class="metric-trend">
    <!-- 宠物信息（昵称/头像等） -->
    <div v-if="pet" class="pet-header sp-card">
      <van-image round class="pet-header-avatar" :src="pet.avatar" fit="cover" />
      <div class="pet-header-info">
        <div class="pet-header-name">{{ SPECIES_ICON[pet.species] }} {{ pet.name }}</div>
        <div class="pet-header-meta">{{ t(SPECIES_LABEL[pet.species]) }} · {{ pet.breed }}</div>
      </div>
    </div>

    <!-- 指标标题 -->
    <div class="trend-header">
      <span class="trend-title" :style="{ color: activeMetric.color }">
        {{ t(activeMetric.labelKey) }}{{ t('user.health.trend') }}
      </span>
    </div>

    <!-- 日/周/月 切换 -->
    <van-tabs v-model:active="mode" color="#ff6b00" class="mode-tabs" @change="onModeChange">
      <van-tab name="day" :title="t('user.health.dayView')" />
      <van-tab name="week" :title="t('user.health.weekView')" />
      <van-tab name="month" :title="t('user.health.monthView')" />
    </van-tabs>

    <!-- 日期选择（仅日模式） -->
    <div v-if="mode === 'day'" class="date-row">
      <van-button size="small" plain type="primary" icon="calendar-o" @click="showDatePicker = true">
        {{ dateDisplay }}
      </van-button>
    </div>

    <!-- 运动子指标切换 -->
    <div v-if="isExercise" class="exercise-sub-tabs">
      <div
        v-for="sub in EXERCISE_SUB"
        :key="sub.key"
        class="sub-chip"
        :class="{ active: exerciseSubKey === sub.key }"
        :style="exerciseSubKey === sub.key ? { background: sub.color, color: '#fff' } : {}"
        @click="onExerciseSubChange(sub.key)"
      >
        {{ t(sub.labelKey) }}
      </div>
      <!-- 步态总结 -->
      <div v-if="exercisePoints.length" class="gait-summary">
        <span class="gait-label">{{ t('user.health.gait') }}：</span>
        <span class="gait-value">
          {{ exercisePoints.filter(p => p.gait === 'walk').length > exercisePoints.length / 2 ? t('user.health.gaitTypes.walk') :
             exercisePoints.filter(p => p.gait === 'run').length > exercisePoints.length / 3 ? t('user.health.gaitTypes.run') :
             exercisePoints.filter(p => p.gait === 'trot').length > exercisePoints.length / 3 ? t('user.health.gaitTypes.trot') :
             t('user.health.gaitTypes.rest') }}
        </span>
      </div>
    </div>

    <!-- 趋势图表 -->
    <div class="chart-card sp-card">
      <van-skeleton :loading="loading" :row="4" />
      <VitalChart
        v-if="chartPoints.length"
        :points="chartPoints"
        :unit="chartUnit"
        :color="activeMetric.color"
        :name="t(activeMetric.labelKey)"
        height="320px"
      />
      <van-empty v-else-if="!loading" :description="t('user.health.noTrendData')" />
    </div>

    <!-- 日期选择弹窗 -->
    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        :model-value="[String(selectedDate.getFullYear()), String(selectedDate.getMonth() + 1).padStart(2, '0'), String(selectedDate.getDate()).padStart(2, '0')]"
        :min-date="new Date(Date.now() - 365 * 86400000)"
        :max-date="new Date()"
        title="选择日期"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
    </van-popup>
  </div>
</template>

<style scoped lang="scss">
.metric-trend {
  padding: 0 14px 90px;
}

/* 宠物信息卡片 */
.pet-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  margin-top: 12px;

  .pet-header-avatar {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
  }

  .pet-header-info {
    min-width: 0;
  }

  .pet-header-name {
    font-size: 17px;
    font-weight: 700;
    color: #333;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .pet-header-meta {
    font-size: 12px;
    color: var(--sp-text-secondary);
    margin-top: 2px;
  }
}

.trend-header {
  padding: 16px 0 8px;
  .trend-title {
    font-size: 18px;
    font-weight: 800;
  }
}

.mode-tabs {
  :deep(.van-tabs__wrap) {
    border-radius: 12px;
    background: #fff;
  }
}

.date-row {
  margin-top: 12px;
  display: flex;
  justify-content: flex-start;
}

.exercise-sub-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
  .sub-chip {
    padding: 6px 14px;
    border-radius: 16px;
    font-size: 13px;
    background: #f0f3f8;
    color: var(--sp-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }
  .gait-summary {
    margin-left: auto;
    font-size: 12px;
    color: var(--sp-text-secondary);
    .gait-value {
      font-weight: 600;
      color: var(--sp-primary);
    }
  }
}

.chart-card {
  margin-top: 14px;
  padding: 14px;
}
</style>

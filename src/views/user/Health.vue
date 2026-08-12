<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import { getDeviceListApi, getDeviceTrackApi, type DeviceJoined } from '@/api/modules/device'
import { getHealthSummaryApi, type HealthSummary } from '@/api/modules/health'
import { getFencesApi, type PetFence } from '@/api/modules/fence'
import { getExerciseSummaryApi, type ExerciseState } from '@/api/modules/exercise'
import Amap from '@/components/Amap.vue'
import { SPECIES_ICON, DEVICE_STATUS } from '@/utils/consts'
import { petAvatarSrc } from '@/utils/petAvatar'

const router = useRouter()
const { t } = useI18n()

const METRICS: { key: string; labelKey: string; unitKey: string; color: string; getValue: (s: HealthSummary) => number | string }[] = [
  { key: 'temperature', labelKey: 'user.health.temperature', unitKey: 'user.health.degreeC', color: '#ff9f43', getValue: (s) => s.temperature.latest + '°' },
  { key: 'heartRate', labelKey: 'user.health.heartRate', unitKey: 'user.health.bpm', color: '#ff6b6b', getValue: (s) => s.heartRate.latest },
  { key: 'spo2', labelKey: 'user.health.spo2', unitKey: 'user.health.percent', color: '#00b4a6', getValue: (s) => s.spo2.latest + '%' },
  { key: 'respiratoryRate', labelKey: 'user.health.respiratory', unitKey: 'user.health.bpm', color: '#5b8ff9', getValue: (s) => s.respiratoryRate.latest },
]

const EXERCISE_METRICS = [
  { key: 'stepFreq', labelKey: 'user.health.stepFreq', unitKey: 'user.health.stepFreqUnit', icon: '👟' },
  { key: 'stride', labelKey: 'user.health.stride', unitKey: 'user.health.strideUnit', icon: '📏' },
  { key: 'gait', labelKey: 'user.health.gait', unitKey: '', icon: '🚶' },
  { key: 'speed', labelKey: 'user.health.speed', unitKey: 'user.health.speedUnit', icon: '⚡' },
]

const pets = ref<PetJoined[]>([])
const activeIndex = ref(0)
const devices = ref<DeviceJoined[]>([])
const summary = ref<HealthSummary | null>(null)
const track = ref<{ points: { lat: number; lng: number; ts: number }[]; center: { lat: number; lng: number }; address: string } | null>(null)
const fences = ref<PetFence[]>([])
const exercise = ref<ExerciseState | null>(null)
const loading = ref(false)

const activePet = computed(() => pets.value[activeIndex.value] ?? null)
const activeDevice = computed(() => devices.value.find((d) => d.boundPetId === activePet.value?.id) ?? null)

async function loadAll() {
  loading.value = true
  try {
    const [petList, devList] = await Promise.all([
      getMyPetsApi(),
      getDeviceListApi(),
    ])
    pets.value = petList
    devices.value = devList

    if (pets.value.length) {
      await loadPetData()
    }
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function loadPetData() {
  const pet = activePet.value
  if (!pet) return

  const device = activeDevice.value
  const tasks: Promise<unknown>[] = [
    getHealthSummaryApi(pet.id).then((s) => { summary.value = s }).catch(() => { summary.value = null }),
    getFencesApi(pet.id).then((f) => { fences.value = f }).catch(() => { fences.value = [] }),
    getExerciseSummaryApi(pet.id).then((e) => { exercise.value = e }).catch(() => { exercise.value = null }),
  ]

  if (device) {
    tasks.push(
      getDeviceTrackApi(device.id).then((t) => { track.value = t }).catch(() => { track.value = null }),
    )
  } else {
    track.value = null
  }

  await Promise.all(tasks)
}

function onPetSelect(index: number) {
  activeIndex.value = index
  summary.value = null
  track.value = null
  fences.value = []
  exercise.value = null
  loadPetData()
}

function goVitals(metricType: string) {
  const pet = activePet.value
  if (!pet) return
  router.push(`/user/health/vitals/${pet.id}/${metricType}`)
}

function goExerciseTrend() {
  const pet = activePet.value
  if (!pet) return
  router.push('/user/health/exercise')
}

function goFenceManage() {
  const pet = activePet.value
  if (!pet) return
  router.push(`/user/health/fence/${pet.id}`)
}

function getGaitLabel(gait: string): string {
  const key = `user.health.gaitTypes.${gait}` as any
  return t(key) || gait
}

/** 电量配色：>50 绿、>20 橙、≤20 红 */
function batteryColor(b: number) {
  if (b > 50) return '#4cd964'
  if (b > 20) return '#ff9500'
  return '#ff3b30'
}

loadAll()
</script>

<template>
  <div class="monitor-page">
    <!-- 全屏地图 -->
    <Amap
      v-if="track"
      :points="track.points"
      :center="activeDevice?.geofence?.center ?? track.center"
      :radius="activeDevice?.geofence?.radius ?? 500"
      :show-fence="false"
      :fences="fences"
      fullscreen
    />
    <!-- 无轨迹时仍展示地图（仅围栏） -->
    <Amap
      v-else
      :points="[]"
      :center="null"
      :show-fence="false"
      :fences="fences"
      fullscreen
    />

    <!-- 宠物切换标签（距顶部 100px） -->
    <div v-if="pets.length" class="pet-tabs-bar">
      <div
        v-for="(pet, index) in pets"
        :key="pet.id"
        class="pet-tab"
        :class="{ 'pet-tab--active': index === activeIndex }"
        @click="onPetSelect(index)"
      >
        <img class="pet-tab-avatar" :src="petAvatarSrc(pet.name) || pet.avatar" :alt="pet.name" />
        <span v-if="index === activeIndex" class="pet-tab-name">{{ pet.name }}</span>
      </div>
    </div>

    <!-- 底部信息面板（1/3 屏） -->
    <div v-if="activePet" class="info-panel">
      <!-- 拉手 -->
      <div class="panel-handle">
        <div class="handle-bar" />
      </div>

      <!-- 宠物头部信息 -->
      <div class="panel-pet-header">
        <img class="panel-avatar" :src="petAvatarSrc(activePet.name) || activePet.avatar" :alt="activePet.name" />
        <div class="panel-pet-info">
          <div class="panel-pet-name-row">
            <div class="panel-pet-name">
              {{ SPECIES_ICON[activePet.species] }} {{ activePet.name }}
            </div>
            <!-- 设备信息：昵称右侧，靠右距面板边缘 20px -->
            <div v-if="activeDevice" class="panel-device">
              <span class="dev-name">{{ t('user.sync.collarOf', { name: activePet.name }) }}</span>
              <span class="dev-status" :class="`is-${activeDevice.status}`">
                <i class="dev-dot" />
                {{ t(DEVICE_STATUS[activeDevice.status].labelKey) }}
              </span>
              <span class="dev-battery" :style="{ color: batteryColor(activeDevice.battery) }">
                {{ activeDevice.battery }}%
              </span>
            </div>
            <span v-else class="panel-device panel-device--none">{{ t('user.health.deviceUnbound') }}</span>
          </div>
          <div class="panel-pet-pos">
            <span class="pos-dot" />
            {{ track ? track.address : t('user.health.positionLoading') }}
          </div>
        </div>
      </div>

      <div class="panel-body">
        <!-- 健康指标 -->
        <div class="section-title">{{ t('user.home.healthOverview') }}</div>
        <div class="metric-grid">
          <div
            v-for="m in METRICS"
            :key="m.key"
            class="metric-item"
            :style="{ '--metric-color': m.color }"
            @click="goVitals(m.key)"
          >
            <div class="metric-item-value" :style="{ color: m.color }">
              {{ summary ? m.getValue(summary) : '--' }}
            </div>
            <div class="metric-item-label">{{ t(m.labelKey) }}</div>
            <div class="metric-item-unit">{{ t(m.unitKey) }}</div>
          </div>
        </div>

        <!-- 运动指标 -->
        <div class="section-title section-title--mt">{{ t('user.health.exercise') }}</div>
        <div class="exercise-row">
          <div
            v-for="em in EXERCISE_METRICS"
            :key="em.key"
            class="exercise-item"
            @click="goExerciseTrend()"
          >
            <span class="exercise-icon">{{ em.icon }}</span>
            <div class="exercise-info">
              <div class="exercise-value">
                <template v-if="exercise">
                  <template v-if="em.key === 'gait'">{{ getGaitLabel(exercise.gait) }}</template>
                  <template v-else-if="em.key === 'stepFreq'">{{ exercise.stepFreq }}</template>
                  <template v-else-if="em.key === 'stride'">{{ exercise.stride }}</template>
                  <template v-else-if="em.key === 'speed'">{{ exercise.speed }}</template>
                </template>
                <template v-else>--</template>
              </div>
              <div class="exercise-label">{{ t(em.labelKey) }}</div>
              <div v-if="em.unitKey" class="exercise-unit">{{ t(em.unitKey) }}</div>
            </div>
          </div>
        </div>

        <!-- 围栏管理入口 -->
        <div class="fence-entry" @click="goFenceManage">
          <div class="fence-entry-left">
            <span class="fence-entry-icon">📍</span>
            <span class="fence-entry-text">{{ t('user.health.manageFence') }}</span>
          </div>
          <div class="fence-entry-right">
            <span v-if="fences.length" class="fence-badge">{{ t('user.health.fenceCount', { n: fences.length }) }}</span>
            <van-icon name="arrow" size="14" color="#999" />
          </div>
        </div>
      </div>
    </div>

    <!-- 加载/空状态 -->
    <div v-if="!loading && !pets.length" class="monitor-empty">
      <van-empty :description="t('user.health.noDevice')" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.monitor-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}

/* ===== 宠物切换标签（距顶部 100px） ===== */
.pet-tabs-bar {
  position: absolute;
  top: 100px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 12px;
  z-index: 100; /* 顶部导航，始终盖在高德地图（含其 Logo/版权）之上 */
  padding: 0 16px;
  pointer-events: none;

  .pet-tab {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px 6px 6px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
    cursor: pointer;
    transition: all 0.25s;

    .pet-tab-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid #fff;
      object-fit: cover;
      flex-shrink: 0;
      background: #eef1f5;
    }

    .pet-tab-name {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      white-space: nowrap;
    }

    &--active {
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 0 4px 20px rgba(255, 107, 0, 0.25);
      .pet-tab-avatar {
        border-color: var(--sp-primary, #ff6b00);
      }
    }
  }
}

/* ===== 底部信息面板 ===== */
.info-panel {
  position: absolute;
  bottom: 50px; /* above tabbar */
  left: 0;
  right: 0;
  max-height: 36%;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 100; /* 底部面板，盖在高德版权信息之上 */
}

.panel-handle {
  display: flex;
  justify-content: center;
  padding: 8px 0 2px;
  .handle-bar {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: #d4dae2;
  }
}

.panel-pet-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 16px 10px;
  border-bottom: 1px solid #f0f3f8;

  .panel-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid var(--sp-primary-light);
    object-fit: cover;
    flex-shrink: 0;
    background: #eef1f5;
  }

  .panel-pet-info {
    flex: 1;
    min-width: 0;
  }

  .panel-pet-name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-right: 4px; /* 面板右内边距 16px + 4px = 距右边缘 20px */
    min-width: 0;
  }

  .panel-pet-name {
    font-size: 16px;
    font-weight: 700;
    color: #333;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 设备信息：设备名 + 状态 + 电量 */
  .panel-device {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    font-size: 10px;

    .dev-name {
      max-width: 88px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #666;
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

      &.is-online { color: #4cd964; }
      &.is-offline { color: #b0b6bf; }
      &.is-low-power { color: #ff9500; }
      &.is-unbound { color: #ff3b30; }
    }

    .dev-battery {
      font-size: 11px;
      font-weight: 700;
    }

    &--none {
      color: #b0b6bf;
      flex-shrink: 0;
    }
  }

  .panel-pet-pos {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--sp-text-placeholder);
    margin-top: 2px;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    .pos-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4cd964;
      flex-shrink: 0;
    }
  }
}

.panel-body {
  padding: 10px 16px 16px;
  overflow-y: auto;
  flex: 1;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;

  &--mt {
    margin-top: 12px;
  }
}

/* 健康指标 2x2 网格 */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;

  .metric-item {
    text-align: center;
    padding: 8px 4px;
    border-radius: 12px;
    background: #f7f9fc;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;

    &:active {
      transform: scale(0.96);
      background: #eef2f8;
    }

    .metric-item-value {
      font-size: 18px;
      font-weight: 800;
      line-height: 1.2;
    }
    .metric-item-label {
      font-size: 10px;
      color: var(--sp-text-secondary);
      margin-top: 2px;
    }
    .metric-item-unit {
      font-size: 9px;
      color: var(--sp-text-placeholder);
    }

    /* 点击提示箭头 */
    &::after {
      content: '';
      position: absolute;
      right: 4px;
      top: 4px;
      width: 0;
      height: 0;
      border-left: 3px solid var(--metric-color, #ff6b00);
      border-bottom: 3px solid transparent;
      border-top: 3px solid transparent;
      opacity: 0.4;
    }
  }
}

/* 运动指标行 */
.exercise-row {
  display: flex;
  gap: 8px;

  .exercise-item {
    flex: 1;
    padding: 8px 6px;
    border-radius: 12px;
    background: #f7f9fc;
    text-align: center;
    cursor: pointer;
    transition: transform 0.2s;

    &:active {
      transform: scale(0.96);
    }

    .exercise-icon {
      font-size: 16px;
      display: block;
      margin-bottom: 2px;
    }
    .exercise-value {
      font-size: 14px;
      font-weight: 700;
      color: #333;
    }
    .exercise-label {
      font-size: 10px;
      color: var(--sp-text-secondary);
    }
    .exercise-unit {
      font-size: 9px;
      color: var(--sp-text-placeholder);
    }
  }
}

/* 围栏管理入口 */
.fence-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #fff7f0, #fff);
  border: 1px solid #fde8d5;
  border-radius: 12px;
  cursor: pointer;

  .fence-entry-left {
    display: flex;
    align-items: center;
    gap: 8px;
    .fence-entry-icon {
      font-size: 18px;
    }
    .fence-entry-text {
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
  }

  .fence-entry-right {
    display: flex;
    align-items: center;
    gap: 6px;
    .fence-badge {
      font-size: 11px;
      color: var(--sp-primary);
      background: #fff0e5;
      padding: 2px 8px;
      border-radius: 10px;
    }
  }
}

.monitor-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sp-bg);
}
</style>

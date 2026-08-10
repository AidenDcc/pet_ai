<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import {
  getDeviceListApi,
  getUploadLogsApi,
  uploadDeviceDataApi,
  getDeviceTelemetryApi,
  type DeviceJoined,
  type UploadRecordJoined,
} from '@/api/modules/device'
import { DEVICE_STATUS, toVantTagType } from '@/utils/consts'
import { formatTime, relativeTime } from '@/utils/format'
import type { HealthMetric } from '@/types'

const router = useRouter()
const { t } = useI18n()

const devices = ref<DeviceJoined[]>([])
const activeIdx = ref(0)
const logs = ref<UploadRecordJoined[]>([])
const latest = ref<HealthMetric | null>(null)
const loading = ref(false)
const syncing = ref(false)
const autoOn = ref(false)
let timer: number | null = null

const activeDevice = computed(() => devices.value[activeIdx.value] ?? null)

async function loadDevices() {
  try {
    devices.value = await getDeviceListApi()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  }
}

async function loadTelemetry() {
  const d = activeDevice.value
  if (!d || !d.boundPetId) {
    latest.value = null
    return
  }
  try {
    const res = await getDeviceTelemetryApi(d.id)
    latest.value = res.points[res.points.length - 1] ?? null
  } catch {
    latest.value = null
  }
}

async function loadLogs() {
  const d = activeDevice.value
  if (!d) {
    logs.value = []
    return
  }
  try {
    logs.value = await getUploadLogsApi(d.id)
  } catch {
    logs.value = []
  }
}

async function load() {
  loading.value = true
  try {
    await loadDevices()
    await loadTelemetry()
    await loadLogs()
  } finally {
    loading.value = false
  }
}

function onDeviceChange(idx: number) {
  activeIdx.value = idx
  loadTelemetry()
  loadLogs()
}

async function doSync() {
  const d = activeDevice.value
  if (!d || syncing.value) return
  syncing.value = true
  try {
    await uploadDeviceDataApi(d.id)
    showToast(t('user.sync.syncSuccess'))
    await loadDevices()
    await loadTelemetry()
    await loadLogs()
  } catch (e) {
    showToast((e as Error).message || t('user.sync.uploadFailed'))
  } finally {
    syncing.value = false
  }
}

function onAutoChange(v: boolean) {
  autoOn.value = v
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (v) timer = window.setInterval(() => doSync(), 15000)
}

onMounted(() => load())
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function batteryColor(b: number) {
  if (b > 50) return '#ff6b00'
  if (b > 20) return '#ff9500'
  return '#ff3b30'
}
</script>

<template>
  <div class="sync-page">
    <van-skeleton :loading="loading" title :row="5" />

    <template v-if="!loading">
      <!-- 多设备切换 -->
      <van-tabs v-if="devices.length > 1" v-model:active="activeIdx" color="#ff6b00" class="device-tabs" @change="onDeviceChange">
        <van-tab v-for="d in devices" :key="d.id" :title="d.petName ? t('user.sync.collarOf', { name: d.petName }) : d.name" />
      </van-tabs>

      <!-- 设备状态卡 -->
      <div v-if="activeDevice" class="sp-card device-card">
        <div class="card-head">
          <div class="card-title">{{ t('user.sync.deviceStatus') }}</div>
          <van-tag
            v-if="activeDevice.boundPetId"
            round
            :type="toVantTagType(DEVICE_STATUS[activeDevice.status].tag)"
          >
            {{ t(DEVICE_STATUS[activeDevice.status].labelKey) }}
          </van-tag>
          <van-tag v-else round type="warning" @click="router.push('/user/devices/bind')">
            {{ t('user.devices.goBind') }}
          </van-tag>
        </div>
        <div class="device-row">
          <div class="device-meta">
            <div class="device-name">{{ activeDevice.petName ? t('user.sync.collarOf', { name: activeDevice.petName }) : activeDevice.name }}</div>
            <div class="device-sn">SN: {{ activeDevice.sn }} · {{ t('user.sync.firmware') }} {{ activeDevice.firmware }}</div>
            <div class="battery-line">
              <span>{{ t('user.sync.battery', { n: activeDevice.battery }) }}</span>
              <van-progress :percentage="activeDevice.battery" :color="batteryColor(activeDevice.battery)" :stroke-width="6" track-color="#eef1f5" />
            </div>
            <div class="last-sync">{{ t('user.sync.lastSync') }}：{{ relativeTime(activeDevice.lastSyncAt) }}</div>
          </div>
          <van-button
            type="primary"
            round
            :loading="syncing"
            :loading-text="t('user.sync.syncing')"
            icon="sync"
            class="sync-btn"
            @click="doSync"
          >
            {{ t('user.sync.syncNow') }}
          </van-button>
        </div>
      </div>

      <!-- 最新体征 -->
      <div v-if="latest" class="sp-card section mt-12">
        <div class="section-title">{{ t('user.sync.latestVitals') }}</div>
        <div class="vital-grid">
          <div class="vital-item">
            <div class="vital-value">{{ latest.temperature.toFixed(1) }}<span class="unit">{{ t('user.health.degreeC') }}</span></div>
            <div class="vital-label">{{ t('user.health.temperature') }}</div>
          </div>
          <div class="vital-item">
            <div class="vital-value">{{ latest.heartRate }}<span class="unit">{{ t('user.health.bpm') }}</span></div>
            <div class="vital-label">{{ t('user.health.heartRate') }}</div>
          </div>
          <div class="vital-item">
            <div class="vital-value">{{ latest.spo2 }}<span class="unit">{{ t('user.health.percent') }}</span></div>
            <div class="vital-label">{{ t('user.health.spo2') }}</div>
          </div>
          <div class="vital-item">
            <div class="vital-value">{{ latest.respiratoryRate }}<span class="unit">{{ t('user.health.bpm') }}</span></div>
            <div class="vital-label">{{ t('user.health.respiratory') }}</div>
          </div>
        </div>
      </div>

      <!-- 自动上报 -->
      <van-cell-group :border="false" inset class="mt-12 auto-cell">
        <van-cell :title="t('user.sync.autoUpload')" :label="t('user.sync.autoUploadHint')">
          <template #right-icon>
            <van-switch v-model="autoOn" size="22px" @update:model-value="onAutoChange" />
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 上报记录 -->
      <div class="sp-card section mt-12">
        <div class="section-title">{{ t('user.sync.uploadLog') }}</div>
        <div v-if="logs.length" class="log-list">
          <div v-for="r in logs" :key="r.id" class="log-item">
            <div class="log-head">
              <span class="log-time">{{ formatTime(r.ts) }}</span>
              <span class="log-tags">
                <van-tag round plain :type="r.source === 'manual' ? 'primary' : 'default'">{{ t(r.source === 'manual' ? 'status.manual' : 'status.auto') }}</van-tag>
                <van-tag round :type="r.status === 'success' ? 'success' : 'danger'">{{ t(r.status === 'success' ? 'status.success' : 'status.failed') }}</van-tag>
              </span>
            </div>
            <div class="log-metrics">
              {{ t('user.health.temperature') }} {{ r.metrics.temperature.toFixed(1) }}℃ ·
              {{ t('user.health.heartRate') }} {{ r.metrics.heartRate }} ·
              {{ t('user.health.spo2') }} {{ r.metrics.spo2 }}% ·
              {{ t('user.health.respiratory') }} {{ r.metrics.respiratoryRate }}
            </div>
          </div>
        </div>
        <van-empty v-else :description="t('user.sync.noLogs')" :image-size="80" />
      </div>
    </template>

    <van-empty v-if="!loading && !devices.length" :description="t('user.devices.empty')">
      <van-button round type="primary" size="small" @click="router.push('/user/devices/bind')">
        {{ t('user.devices.goBind') }}
      </van-button>
    </van-empty>
  </div>
</template>

<style scoped lang="scss">
.sync-page {
  padding: 16px 14px;
  padding-top: 0;
}
.device-tabs {
  margin-bottom: 12px;
  background: transparent;
  :deep(.van-tabs__wrap) {
    background: #fff;
    border-radius: 12px;
  }
}
.device-card {
  padding: 16px;
  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    .card-title {
      font-size: 15px;
      font-weight: 700;
    }
  }
}
.device-row {
  display: flex;
  align-items: center;
  gap: 14px;
  .device-meta {
    flex: 1;
    min-width: 0;
    .device-name {
      font-size: 16px;
      font-weight: 600;
    }
    .device-sn {
      margin-top: 3px;
      font-size: 12px;
      color: var(--sp-text-placeholder);
    }
    .battery-line {
      margin-top: 10px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
    .last-sync {
      margin-top: 6px;
      font-size: 12px;
      color: var(--sp-text-placeholder);
    }
  }
  .sync-btn {
    flex-shrink: 0;
  }
}
.section {
  padding: 16px;
  .section-title {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 12px;
  }
}
.vital-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  .vital-item {
    text-align: center;
    padding: 14px 0;
    background: var(--sp-bg);
    border-radius: 12px;
    .vital-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--sp-primary-dark);
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
.auto-cell {
  --van-cell-label-font-size: 12px;
}
.log-list {
  .log-item {
    padding: 10px 0;
    border-bottom: 1px dashed var(--sp-border);
    &:last-child {
      border-bottom: none;
    }
    .log-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      .log-time {
        font-size: 12px;
        color: var(--sp-text-secondary);
      }
      .log-tags {
        display: flex;
        gap: 6px;
      }
    }
    .log-metrics {
      margin-top: 6px;
      font-size: 12px;
      color: var(--sp-text);
    }
  }
}
.mt-12 {
  margin-top: 12px;
}
</style>

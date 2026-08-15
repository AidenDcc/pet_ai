<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import {
  getDeviceListApi,
  commandDeviceApi,
  type DeviceJoined,
} from '@/api/modules/device'
import { DEVICE_STATUS, toVantTagType, COMMAND_FEEDBACK } from '@/utils/consts'
import { relativeTime } from '@/utils/format'
import { deviceImageSrc } from '@/utils/deviceImage'

const { t } = useI18n()

const router = useRouter()
const devices = ref<DeviceJoined[]>([])
const loading = ref(false)
const actionVisible = ref(false)
const actionDevice = ref<DeviceJoined | null>(null)
const COMMANDS = computed(() => [
  { name: `🔔 ${t('user.devices.cmdFind')}`, value: 'find' },
  { name: `💡 ${t('user.devices.cmdLight')}`, value: 'light' },
  { name: `🛰️ ${t('user.devices.cmdRefresh')}`, value: 'refresh' },
])

async function load() {
  loading.value = true
  try {
    devices.value = await getDeviceListApi()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

onMounted(load)

function batteryType(b: number) {
  if (b > 50) return '#ff6b00'
  if (b > 20) return '#ff9500'
  return '#ff3b30'
}

function goDetail(device: DeviceJoined) {
  router.push(`/user/devices/${device.id}`)
}

function goFirmware(device: DeviceJoined) {
  router.push(`/user/devices/${device.id}/firmware`)
}

function isLatestFirmware(device: DeviceJoined) {
  return !device.latestFirmware || device.firmware === device.latestFirmware
}

async function sendCommand(action: { value: string }) {
  if (!actionDevice.value) return
  actionVisible.value = false
  try {
    await commandDeviceApi({ deviceId: actionDevice.value.id, command: action.value })
    showToast(t(COMMAND_FEEDBACK[action.value] ?? 'user.devices.cmdSent'))
  } catch (e) {
    showToast((e as Error).message || t('user.devices.cmdFailed'))
  }
}
</script>

<template>
  <div class="device-list">
    <div class="toolbar">
      <span class="toolbar-text">{{ t('user.devices.total', { n: devices.length }) }}</span>
      <van-button round type="primary" size="small" icon="plus" @click="router.push('/user/devices/bind')">
        {{ t('user.devices.bind') }}
      </van-button>
    </div>

    <van-skeleton :loading="loading" :row="4" />

    <div v-for="d in devices" :key="d.id" class="device-card sp-card">
      <div class="device-top" @click="goDetail(d)">
        <img class="device-icon" :src="deviceImageSrc(d.type)" :alt="d.name" />
        <div class="device-info">
          <div class="device-name">
            {{ d.petName ? t('user.sync.collarOf', { name: d.petName }) : d.name }}
            <van-tag round :type="toVantTagType(DEVICE_STATUS[d.status].tag)" class="ml-8">{{ t(DEVICE_STATUS[d.status].labelKey) }}</van-tag>
          </div>
          <div class="device-sn">SN: {{ d.sn }}</div>
        </div>
        <van-tag v-if="d.status === 'low-power'" round type="warning">{{ t('user.devices.needCharge') }}</van-tag>
        <van-icon name="arrow" class="device-arrow" />
      </div>

      <div class="device-mid">
        <div class="battery-row">
          <span class="battery-label">{{ t('user.sync.battery', { n: d.battery }) }}</span>
          <van-progress :percentage="d.battery" :color="batteryType(d.battery)" :stroke-width="8" track-color="#eef1f5" />
        </div>
        <div class="device-sub">
          <span class="firmware-cell" @click.stop="goFirmware(d)">
            <template v-if="d.latestFirmware">
              <van-tag v-if="isLatestFirmware(d)" round type="success">{{ t('user.firmware.latestTag') }}</van-tag>
              <van-tag v-else round type="warning">{{ t('user.firmware.upgradeTag') }}</van-tag>
            </template>
            <span>{{ t('user.sync.firmware') }} {{ d.firmware }}</span>
          </span>
          <span>{{ t('user.home.lastSync') }} {{ relativeTime(d.lastSyncAt) }}</span>
        </div>
      </div>
<!-- 
      <div class="device-actions">
        <van-button size="small" round plain icon="info-o" @click="goDetail(d)">
          {{ t('user.devices.detailBtn') }}
        </van-button>
        <template v-if="d.boundPetId">
          <van-button size="small" round plain type="primary" icon="location-o" @click="router.push('/user/health')">
            {{ t('user.devices.findPet') }}
          </van-button>
          <van-button size="small" round plain type="primary" icon="bulb-o" @click="openCommands(d)">
            {{ t('user.devices.command') }}
          </van-button>
          <van-button size="small" round plain type="danger" icon="delete-o" @click="unbind(d)">
            {{ t('user.devices.unbind') }}
          </van-button>
        </template>
        <van-button v-else size="small" round plain type="primary" @click="router.push('/user/devices/bind')">
          {{ t('user.devices.goBind') }}
        </van-button>
      </div>
       -->
    </div>

    <van-empty v-if="!loading && !devices.length" :description="t('user.devices.empty')" />

    <van-action-sheet
      v-model:show="actionVisible"
      :actions="COMMANDS"
      :cancel-text="t('user.devices.cancel')"
      :description="t('user.devices.chooseCmd')"
      teleport="#phone-teleport"
      @select="sendCommand"
    />
  </div>
</template>

<style scoped lang="scss">
.device-list {
  padding: 16px 14px;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  .toolbar-text {
    font-size: 13px;
    color: var(--sp-text-secondary);
  }
}
.device-card {
  padding: 14px;
  margin-bottom: 12px;
}
.device-top {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  .device-icon {
    width: 44px;
    height: 44px;
    object-fit: contain;
    flex-shrink: 0;
  }
  .device-info {
    flex: 1;
    .device-name {
      font-size: 15px;
      font-weight: 600;
    }
    .device-sn {
      margin-top: 3px;
      font-size: 12px;
      color: var(--sp-text-placeholder);
    }
  }
  .device-arrow {
    color: var(--sp-text-placeholder);
  }
}
.device-mid {
  margin: 12px 0 4px;
  .battery-row {
    margin-bottom: 8px;
    .battery-label {
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
  }
  .device-sub {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--sp-text-placeholder);
    .firmware-cell {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }
  }
}
.device-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}
.ml-8 {
  margin-left: 8px;
}
</style>

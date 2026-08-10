<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast, showConfirmDialog } from 'vant'
import {
  getDeviceListApi,
  commandDeviceApi,
  unbindDeviceApi,
  type DeviceJoined,
} from '@/api/modules/device'
import { DEVICE_STATUS, toVantTagType } from '@/utils/consts'
import { relativeTime } from '@/utils/format'

const { t } = useI18n()

const router = useRouter()
const devices = ref<DeviceJoined[]>([])
const loading = ref(false)
const actionVisible = ref(false)
const actionDevice = ref<DeviceJoined | null>(null)
const COMMANDS = computed(() => [
  { name: `🔔 ${t('user.location.cmdFind')}`, value: 'find' },
  { name: `💡 ${t('user.location.cmdLight')}`, value: 'light' },
  { name: `🛰️ ${t('user.location.cmdRefresh')}`, value: 'refresh' },
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

function batteryType(b: number) {
  if (b > 50) return '#ff6b00'
  if (b > 20) return '#ff9500'
  return '#ff3b30'
}

function openCommands(device: DeviceJoined) {
  if (device.status !== 'online') {
    showToast(t('user.devices.offlineCmd'))
    return
  }
  actionDevice.value = device
  actionVisible.value = true
}

async function sendCommand(action: { value: string }) {
  if (!actionDevice.value) return
  actionVisible.value = false
  try {
    const res = await commandDeviceApi({ deviceId: actionDevice.value.id, command: action.value })
    showToast(res.message)
  } catch (e) {
    showToast((e as Error).message || t('user.devices.cmdFailed'))
  }
}

async function unbind(device: DeviceJoined) {
  try {
    await showConfirmDialog({
      title: t('user.devices.unbindTitle'),
      message: t('user.devices.unbindMsg', { sn: device.sn, name: device.petName ?? '' }),
    })
  } catch {
    return
  }
  try {
    await unbindDeviceApi(device.id)
    showToast(t('user.devices.unbindSuccess'))
    await load()
  } catch (e) {
    showToast((e as Error).message || t('user.devices.unbindFailed'))
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
      <div class="device-top">
        <div class="device-icon">📟</div>
        <div class="device-info">
          <div class="device-name">
            {{ d.petName ? t('user.sync.collarOf', { name: d.petName }) : d.name }}
            <van-tag round :type="toVantTagType(DEVICE_STATUS[d.status].tag)" class="ml-8">{{ t(DEVICE_STATUS[d.status].labelKey) }}</van-tag>
          </div>
          <div class="device-sn">SN: {{ d.sn }}</div>
        </div>
        <van-tag v-if="d.status === 'low-power'" round type="warning">{{ t('user.devices.needCharge') }}</van-tag>
      </div>

      <div class="device-mid">
        <div class="battery-row">
          <span class="battery-label">{{ t('user.sync.battery', { n: d.battery }) }}</span>
          <van-progress :percentage="d.battery" :color="batteryType(d.battery)" :stroke-width="8" track-color="#eef1f5" />
        </div>
        <div class="device-sub">
          <span>{{ t('user.sync.firmware') }} {{ d.firmware }}</span>
          <span>{{ t('user.home.lastSync') }} {{ relativeTime(d.lastSyncAt) }}</span>
        </div>
      </div>

      <div class="device-actions">
        <template v-if="d.boundPetId">
          <van-button size="small" round plain type="primary" icon="location-o" @click="router.push('/user/location')">
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
  .device-icon {
    font-size: 26px;
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
    font-size: 12px;
    color: var(--sp-text-placeholder);
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

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast, showConfirmDialog } from 'vant'
import {
  getDeviceApi,
  commandDeviceApi,
  unbindDeviceApi,
  rebindDeviceApi,
  type DeviceJoined,
} from '@/api/modules/device'
import { getPetApi, getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import { DEVICE_STATUS, toVantTagType, SPECIES_ICON, GENDER_LABEL, COMMAND_FEEDBACK } from '@/utils/consts'
import { relativeTime, formatDate } from '@/utils/format'
import { petAvatarSrc } from '@/utils/petAvatar'
import { deviceImageSrc } from '@/utils/deviceImage'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const deviceId = route.params.id as string
const device = ref<DeviceJoined | null>(null)
const boundPet = ref<PetJoined | null>(null)
const actionVisible = ref(false)
const switchVisible = ref(false)
const unboundPets = ref<PetJoined[]>([])

const COMMANDS = computed(() => [
  { name: `🔔 ${t('user.devices.cmdFind')}`, value: 'find' },
  { name: `💡 ${t('user.devices.cmdLight')}`, value: 'light' },
  { name: `🛰️ ${t('user.devices.cmdRefresh')}`, value: 'refresh' },
])

type NetworkKind = 'ble' | 'wifi' | '4g'

const NETWORK_META: Record<NetworkKind, { icon: string; labelKey: string }> = {
  ble: { icon: '🔵', labelKey: 'user.devices.netBle' },
  wifi: { icon: '📶', labelKey: 'user.devices.netWifi' },
  '4g': { icon: '📡', labelKey: 'user.devices.net4g' },
}

/** 各信号等级对应的信号条数 */
const LEVEL_BARS: Record<string, number> = { strong: 4, good: 3, fair: 2, weak: 1 }

/** 信号等级：蓝牙/WiFi 用 dBm 阈值，4G 用百分比阈值 */
function networkSignalLevel(signal: number, method: NetworkKind): string {
  if (method === '4g') {
    if (signal > 80) return 'strong'
    if (signal > 60) return 'good'
    if (signal > 40) return 'fair'
    return 'weak'
  }
  if (signal > -55) return 'strong'
  if (signal > -67) return 'good'
  if (signal > -80) return 'fair'
  return 'weak'
}

function batteryColor(b: number) {
  if (b > 50) return '#ff6b00'
  if (b > 20) return '#ff9500'
  return '#ff3b30'
}

const geofenceText = computed(() => {
  if (!device.value?.geofence) return t('user.devices.geofenceOff')
  return t('user.devices.geofenceOn', { radius: device.value.geofence.radius })
})

async function load() {
  try {
    device.value = await getDeviceApi(deviceId)
    if (device.value.boundPetId) {
      boundPet.value = await getPetApi(device.value.boundPetId).catch(() => null)
    } else {
      boundPet.value = null
    }
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  }
}

/** 下发远程指令，并重新拉取设备（刷新指令会更新信号/电量） */
async function sendCommand(action: { value: string }) {
  if (!device.value) return
  if (device.value.status !== 'online') {
    showToast(t('user.devices.offlineCmd'))
    return
  }
  actionVisible.value = false
  try {
    await commandDeviceApi({ deviceId: device.value.id, command: action.value })
    showToast(t(COMMAND_FEEDBACK[action.value] ?? 'user.devices.cmdSent'))
    await load()
  } catch (e) {
    showToast((e as Error).message || t('user.devices.cmdFailed'))
  }
}

/** 信号刷新（等价于「请求定位」指令） */
function refreshSignal() {
  if (!device.value) return
  sendCommand({ value: 'refresh' })
}

async function unbind() {
  if (!device.value) return
  try {
    await showConfirmDialog({
      title: t('user.devices.unbindTitle'),
      message: t('user.devices.unbindMsg', { sn: device.value.sn, name: device.value.petName ?? '' }),
    })
  } catch {
    return
  }
  try {
    await unbindDeviceApi(device.value.id)
    showToast(t('user.devices.unbindSuccess'))
    router.back()
  } catch (e) {
    showToast((e as Error).message || t('user.devices.unbindFailed'))
  }
}

/** 切换绑定宠物：列出未绑定设备的宠物供选择 */
const switchActions = computed(() =>
  unboundPets.value.map((p) => ({
    name: `${SPECIES_ICON[p.species]} ${p.name}（${p.breed}）`,
    value: p.id,
  })),
)

async function openSwitch() {
  try {
    const pets = await getMyPetsApi()
    unboundPets.value = pets.filter((p) => !p.deviceId)
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
    return
  }
  if (!unboundPets.value.length) {
    showToast(t('user.devices.switchPetEmpty'))
    return
  }
  switchVisible.value = true
}

async function onSwitchSelect(action: { value: string; name?: string }) {
  switchVisible.value = false
  const pet = unboundPets.value.find((p) => p.id === action.value)
  if (!pet) return
  try {
    await showConfirmDialog({
      title: t('user.devices.switchPetTitle'),
      message: t('user.devices.switchPetMsg', { name: pet.name }),
    })
  } catch {
    return
  }
  try {
    await rebindDeviceApi(deviceId, pet.id)
    showToast(t('user.devices.switchPetSuccess'))
    await load()
  } catch (e) {
    showToast((e as Error).message || t('user.devices.switchPetFailed'))
  }
}

function goFirmware() {
  router.push(`/user/devices/${deviceId}/firmware`)
}

function goWifi() {
  router.push(`/user/devices/${deviceId}/wifi`)
}

const isLatestFirmware = computed(() => {
  if (!device.value?.latestFirmware) return true
  return device.value.firmware === device.value.latestFirmware
})

load()
</script>

<template>
  <div v-if="device" class="device-detail">
    <!-- 设备头部 -->
    <div class="hero sp-card">
      <img class="hero-icon" :src="deviceImageSrc(device.type)" :alt="device.name" />
      <div class="hero-info">
        <div class="hero-name">
          {{ device.petName ? t('user.sync.collarOf', { name: device.petName }) : device.name }}
          <van-tag round :type="toVantTagType(DEVICE_STATUS[device.status].tag)" class="ml-8">
            {{ t(DEVICE_STATUS[device.status].labelKey) }}
          </van-tag>
        </div>
        <div class="hero-sn">SN: {{ device.sn }}</div>
      </div>
      <div class="hero-model">{{ device.model }}</div>
    </div>

    <!-- 网络连接 + 电量 -->
    <div class="metric-card sp-card mt-16">
      <div class="metric-header">
        <span class="metric-title">{{ t('user.devices.network') }}</span>
        <van-icon
          v-if="device.status === 'online'"
          name="replay"
          class="signal-refresh"
          @click="refreshSignal"
        />
      </div>

      <div class="network-list">
        <div v-for="net in device.networks" :key="net.method" class="metric-row">
          <span class="metric-icon">{{ NETWORK_META[net.method].icon }}</span>
          <div class="metric-info">
            <div class="metric-label">{{ t(NETWORK_META[net.method].labelKey) }}</div>
            <div v-if="net.supported" class="signal-bars" :class="`signal-bars--${networkSignalLevel(net.signal, net.method)}`">
              <span v-for="i in 4" :key="i" class="signal-bar" :class="{ lit: i <= LEVEL_BARS[networkSignalLevel(net.signal, net.method)] }" />
            </div>
          </div>
          <div class="metric-value">
            <van-tag v-if="!net.supported" round type="default">{{ t('user.devices.netUnsupported') }}</van-tag>
            <template v-else>
              <van-tag round :type="net.connected ? 'success' : 'default'">
                {{ t(net.connected ? 'user.devices.netConnected' : 'user.devices.netDisconnected') }}
              </van-tag>
              <span class="signal-dbm">{{ net.method === '4g' ? `${net.signal}%` : `${net.signal} dBm` }}</span>
            </template>
          </div>
        </div>
      </div>

      <van-divider :style="{ margin: '14px 0' }" />

      <div class="metric-row">
        <span class="metric-icon">🔋</span>
        <div class="metric-info">
          <div class="metric-label">{{ t('user.sync.battery', { n: device.battery }) }}</div>
          <van-progress :percentage="device.battery" :color="batteryColor(device.battery)" :stroke-width="8" track-color="#eef1f5" />
        </div>
        <van-tag v-if="device.status === 'low-power'" round type="warning">{{ t('user.devices.needCharge') }}</van-tag>
      </div>
    </div>

    <!-- 绑定宠物 -->
    <div v-if="boundPet" class="pet-card sp-card mt-16" @click="router.push(`/user/pet/${boundPet.id}`)">
      <img class="pet-avatar" :src="petAvatarSrc(boundPet.name) || boundPet.avatar" :alt="boundPet.name" />
      <div class="pet-info">
        <div class="pet-name">{{ SPECIES_ICON[boundPet.species] }} {{ boundPet.name }}</div>
        <div class="pet-desc">{{ boundPet.breed }} · {{ t(GENDER_LABEL[boundPet.gender]) }}</div>
      </div>
      <span class="pet-view">{{ t('user.devices.viewPet') }}</span>
      <van-icon name="arrow" class="pet-arrow" />
    </div>
    <div v-else class="pet-card sp-card mt-16">
      <div class="pet-empty">{{ t('user.devices.unboundPet') }}</div>
      <van-button size="small" round type="primary" plain @click="router.push('/user/devices/bind')">
        {{ t('user.devices.goBind') }}
      </van-button>
    </div>

    <!-- 设备信息 -->
    <div class="info-card sp-card mt-16">
      <div class="info-title">{{ t('user.devices.deviceInfo') }}</div>
      <van-cell title="IMEI" :value="device.imei" />
      <van-cell :title="t('user.devices.model')" :value="device.model" />
      <van-cell :title="t('user.sync.firmware')" is-link @click="goFirmware">
        <template #value>
          <span class="fw-cell">
            <template v-if="device.latestFirmware">
              <van-tag v-if="isLatestFirmware" round type="success">{{ t('user.firmware.latestTag') }}</van-tag>
              <van-tag v-else round type="warning">{{ t('user.firmware.upgradeTag') }}</van-tag>
            </template>
            <span>{{ device.firmware }}</span>
          </span>
        </template>
      </van-cell>
      <van-cell :title="t('user.devices.wifiConfig')" is-link @click="goWifi">
        <template #value>
          <span>{{ device.wifiSsid ?? t('user.wifi.notConfigured') }}</span>
        </template>
      </van-cell>
      <van-cell
        :title="t('user.devices.activatedAt')"
        :value="device.activatedAt ? formatDate(device.activatedAt) : t('user.devices.notActivated')"
      />
      <van-cell :title="t('user.devices.lastSync')" :value="relativeTime(device.lastSyncAt)" />
      <van-cell :title="t('user.devices.geofence')" :value="geofenceText" />
    </div>

    <!-- 操作 -->
    <div class="action-bar">
      <van-button v-if="device.boundPetId" block round type="primary" icon="location-o" @click="router.push('/user/health')">
        {{ t('user.devices.findPet') }}
      </van-button>
      <van-button v-if="device.boundPetId" block round plain type="primary" icon="bulb-o" @click="actionVisible = true">
        {{ t('user.devices.command') }}
      </van-button>
      <van-button v-if="device.boundPetId" block round plain type="primary" icon="exchange" @click="openSwitch">
        {{ t('user.devices.switchPet') }}
      </van-button>
      <van-button v-if="device.boundPetId" block round plain type="danger" icon="delete-o" @click="unbind">
        {{ t('user.devices.unbind') }}
      </van-button>
    </div>

    <van-action-sheet
      v-model:show="actionVisible"
      :actions="COMMANDS"
      :cancel-text="t('user.devices.cancel')"
      :description="t('user.devices.chooseCmd')"
      teleport="#phone-teleport"
      @select="sendCommand"
    />

    <van-action-sheet
      v-model:show="switchVisible"
      :actions="switchActions"
      :cancel-text="t('user.devices.cancel')"
      :description="t('user.devices.switchPetTitle')"
      teleport="#phone-teleport"
      @select="onSwitchSelect"
    />
  </div>
</template>

<style scoped lang="scss">
.device-detail {
  padding: 16px 14px 26px;
}

/* ---- 设备头部 ---- */
.hero {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #fff4dc, #ffe9b8);

  .hero-icon {
    width: 52px;
    height: 52px;
    object-fit: contain;
    flex-shrink: 0;
  }
  .hero-info {
    flex: 1;
    min-width: 0;
    .hero-name {
      font-size: 16px;
      font-weight: 700;
    }
    .hero-sn {
      margin-top: 4px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
  }
  .hero-model {
    font-size: 12px;
    font-weight: 600;
    color: var(--sp-primary);
    border: 1px solid var(--sp-primary);
    border-radius: 8px;
    padding: 3px 8px;
  }
}

/* ---- 信号 / 电量 ---- */
.metric-card {
  padding: 16px;
}
.metric-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  .metric-title {
    font-size: 15px;
    font-weight: 700;
  }
}
.network-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.metric-row {
  display: flex;
  align-items: center;
  gap: 12px;

  .metric-icon {
    font-size: 24px;
    flex-shrink: 0;
  }
  .metric-info {
    flex: 1;
    min-width: 0;
    .metric-label {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 6px;
    }
  }
  .metric-value {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    font-size: 13px;
    font-weight: 700;
    .signal-dbm {
      font-size: 11px;
      font-weight: 400;
      color: var(--sp-text-secondary);
    }
  }
}

.signal-bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  color: #c0c4cc;

  .signal-bar {
    width: 4px;
    border-radius: 2px;
    background: #e3e6eb;
    &:nth-child(1) { height: 6px; }
    &:nth-child(2) { height: 10px; }
    &:nth-child(3) { height: 14px; }
    &:nth-child(4) { height: 18px; }
    &.lit { background: currentColor; }
  }
}
.signal-bars--strong { color: #22a06b; }
.signal-bars--good { color: #9ecb3d; }
.signal-bars--fair { color: #ff9500; }
.signal-bars--weak { color: #ff3b30; }
.signal-bars--offline { color: #c0c4cc; }

.signal-refresh {
  flex-shrink: 0;
  font-size: 18px;
  color: var(--sp-text-placeholder);
  padding: 4px;
}

/* ---- 绑定宠物 ---- */
.pet-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;

  .pet-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid var(--sp-primary-light);
    flex-shrink: 0;
  }
  .pet-info {
    flex: 1;
    min-width: 0;
    .pet-name {
      font-size: 15px;
      font-weight: 700;
    }
    .pet-desc {
      margin-top: 3px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
  }
  .pet-view {
    font-size: 12px;
    color: var(--sp-primary);
  }
  .pet-arrow {
    color: var(--sp-text-placeholder);
  }
  .pet-empty {
    flex: 1;
    font-size: 14px;
    color: var(--sp-text-placeholder);
  }
}

/* ---- 设备信息 ---- */
.info-card {
  padding: 16px;
  .info-title {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .fw-cell {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}

/* ---- 操作 ---- */
.action-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.mt-16 {
  margin-top: 16px;
}
.ml-8 {
  margin-left: 8px;
}
</style>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import {
  getDeviceApi,
  getDeviceWifiApi,
  configureDeviceWifiApi,
  type DeviceJoined,
  type DeviceWifiInfo,
  type WifiAp,
} from '@/api/modules/device'
import { deviceImageSrc } from '@/utils/deviceImage'

const route = useRoute()
const { t } = useI18n()

const deviceId = route.params.id as string
const device = ref<DeviceJoined | null>(null)
const wifi = ref<DeviceWifiInfo | null>(null)
const scanning = ref(false)
const connecting = ref(false)

/** 密码输入弹窗 */
const dialogVisible = ref(false)
const pendingAp = ref<WifiAp | null>(null)
const password = ref('')

/** 手动输入降级入口 */
const showManual = ref(false)
const manualSsid = ref('')
const manualPassword = ref('')

function rssiBars(signal: number): string {
  if (signal > -55) return '●●●●'
  if (signal > -67) return '●●●○'
  if (signal > -80) return '●●○○'
  return '●○○○'
}

function rssiClass(signal: number): string {
  if (signal > -55) return 'rssi-strong'
  if (signal > -67) return 'rssi-good'
  if (signal > -80) return 'rssi-fair'
  return 'rssi-weak'
}

async function load() {
  try {
    device.value = await getDeviceApi(deviceId)
    wifi.value = await getDeviceWifiApi(deviceId)
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  }
}

async function scan() {
  scanning.value = true
  try {
    // 模拟扫描延迟
    await new Promise((r) => setTimeout(r, 1200))
    wifi.value = await getDeviceWifiApi(deviceId)
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    scanning.value = false
  }
}

function onTapAp(ap: WifiAp) {
  if (ap.ssid === wifi.value?.ssid) return
  if (!ap.secured) {
    doConnect(ap)
    return
  }
  pendingAp.value = ap
  password.value = ''
  dialogVisible.value = true
}

async function doConnect(ap: WifiAp, pwd?: string) {
  connecting.value = true
  try {
    await configureDeviceWifiApi(deviceId, { ssid: ap.ssid, password: pwd })
    showToast(t('user.wifi.connectSuccess'))
    await load()
  } catch (e) {
    showToast((e as Error).message || t('user.wifi.connectFailed'))
  } finally {
    connecting.value = false
  }
}

async function beforeClose(action: string): Promise<boolean> {
  if (action !== 'confirm') return true
  if (pendingAp.value?.secured && !password.value.trim()) {
    showToast(t('user.wifi.passwordPlaceholder'))
    return false
  }
  return true
}

function onDialogConfirm() {
  if (!pendingAp.value) return
  doConnect(pendingAp.value, password.value.trim() || undefined)
}

async function onManualConnect() {
  const ssid = manualSsid.value.trim()
  if (!ssid) {
    showToast(t('user.wifi.ssidPlaceholder'))
    return
  }
  await doConnect({ ssid, signal: 0, secured: !!manualPassword.value.trim() }, manualPassword.value.trim() || undefined)
}

load()
</script>

<template>
  <div v-if="device" class="wifi">
    <!-- 设备头部 -->
    <div class="hero sp-card">
      <img class="hero-icon" :src="deviceImageSrc(device.type)" :alt="device.name" />
      <div class="hero-info">
        <div class="hero-name">{{ device.petName ? t('user.sync.collarOf', { name: device.petName }) : device.name }}</div>
        <div class="hero-sn">SN: {{ device.sn }}</div>
      </div>
    </div>

    <!-- 当前 WiFi 状态 -->
    <div class="status-card sp-card mt-16">
      <div class="status-title">{{ t('user.wifi.current') }}</div>
      <div class="status-row">
        <span class="status-icon">📶</span>
        <div class="status-info">
          <div class="status-ssid">
            {{ wifi?.ssid ?? t('user.wifi.notConfigured') }}
            <van-tag v-if="wifi?.connected" round type="success" class="ml-8">{{ t('user.wifi.connectedTag') }}</van-tag>
          </div>
          <div v-if="wifi?.connected" class="status-signal rssi" :class="rssiClass(wifi.signal)">
            <span>{{ rssiBars(wifi.signal) }}</span>
            <span class="status-dbm">{{ wifi.signal }} dBm</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 扫描附近网络 -->
    <div class="scan-card sp-card mt-16">
      <van-button block round type="primary" :loading="scanning" :loading-text="t('user.wifi.scanning')" @click="scan">
        {{ scanning ? t('user.wifi.scanning') : wifi?.nearby.length ? t('user.wifi.rescan') : t('user.wifi.scan') }}
      </van-button>
    </div>

    <!-- 附近网络列表 -->
    <div v-if="wifi?.nearby.length" class="ap-list mt-12">
      <div class="ap-title">{{ t('user.wifi.nearby') }}</div>
      <div
        v-for="ap in wifi.nearby"
        :key="ap.ssid"
        class="ap-card sp-card"
        :class="{ connected: ap.ssid === wifi.ssid }"
        @click="onTapAp(ap)"
      >
        <div class="ap-left">
          <div class="ap-ssid">{{ ap.ssid }}</div>
          <div class="ap-rssi rssi" :class="rssiClass(ap.signal)">
            <span>{{ rssiBars(ap.signal) }}</span>
            <span class="ap-dbm">{{ ap.signal }} dBm</span>
          </div>
        </div>
        <div class="ap-right">
          <van-icon v-if="ap.secured" name="closed-eye" class="ap-lock" />
          <van-tag v-if="ap.ssid === wifi?.ssid" round type="success">{{ t('user.wifi.connectedTag') }}</van-tag>
          <van-icon v-else name="arrow" class="ap-arrow" />
        </div>
      </div>
    </div>
    <div v-else-if="!scanning" class="ap-empty sp-card mt-12">
      <van-empty :description="t('user.wifi.noNetwork')" />
    </div>

    <!-- 手动输入降级入口 -->
    <div class="manual-section mt-20">
      <van-divider>{{ t('user.wifi.manualTitle') }}</van-divider>
      <div v-if="!showManual" class="manual-tip">
        <span>{{ t('user.wifi.manualHint') }}</span>
        <van-button size="small" type="primary" plain round @click="showManual = true">
          {{ t('user.wifi.manualTitle') }}
        </van-button>
      </div>
      <div v-else class="manual-form sp-card">
        <van-field
          v-model="manualSsid"
          :label="t('user.wifi.ssid')"
          :placeholder="t('user.wifi.ssidPlaceholder')"
          clearable
          :border="false"
        />
        <van-field
          v-model="manualPassword"
          type="password"
          :label="t('user.wifi.password')"
          :placeholder="t('user.wifi.passwordPlaceholder')"
          clearable
          :border="false"
        />
        <div class="manual-actions">
          <van-button size="small" round plain @click="showManual = false">
            {{ t('common.cancel') }}
          </van-button>
          <van-button size="small" round type="primary" :loading="connecting" @click="onManualConnect">
            {{ t('user.wifi.connect') }}
          </van-button>
        </div>
      </div>
    </div>

    <!-- 密码输入弹窗 -->
    <van-dialog
      v-model:show="dialogVisible"
      :title="pendingAp?.ssid"
      show-cancel-button
      :before-close="beforeClose"
      :confirm-button-text="t('user.wifi.connect')"
      :cancel-button-text="t('common.cancel')"
      teleport="#phone-teleport"
      @confirm="onDialogConfirm"
    >
      <van-field
        v-model="password"
        type="password"
        :label="t('user.wifi.password')"
        :placeholder="t('user.wifi.passwordPlaceholder')"
      />
    </van-dialog>
  </div>
</template>

<style scoped lang="scss">
.wifi {
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
}

/* ---- 当前 WiFi 状态 ---- */
.status-card {
  padding: 16px;
  .status-title {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .status-row {
    display: flex;
    align-items: center;
    gap: 12px;
    .status-icon {
      font-size: 26px;
    }
    .status-info {
      .status-ssid {
        font-size: 15px;
        font-weight: 600;
      }
      .status-signal {
        margin-top: 4px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        letter-spacing: 1px;
        .status-dbm {
          font-size: 11px;
          color: var(--sp-text-placeholder);
          letter-spacing: 0;
        }
      }
    }
  }
}

/* ---- 扫描 ---- */
.scan-card {
  padding: 14px 16px;
}

/* ---- 附近网络列表 ---- */
.ap-list {
  .ap-title {
    font-size: 13px;
    color: var(--sp-text-secondary);
    margin: 4px 4px 8px;
  }
}
.ap-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 14px;
  margin-bottom: 10px;
  cursor: pointer;
  border: 2px solid transparent;

  &.connected {
    border-color: var(--sp-primary);
  }
  .ap-left {
    .ap-ssid {
      font-size: 15px;
      font-weight: 600;
    }
    .ap-rssi {
      margin-top: 3px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      letter-spacing: 1px;
      .ap-dbm {
        font-size: 11px;
        color: var(--sp-text-placeholder);
        letter-spacing: 0;
      }
    }
  }
  .ap-right {
    display: flex;
    align-items: center;
    gap: 8px;
    .ap-lock {
      color: var(--sp-text-secondary);
      font-size: 16px;
    }
    .ap-arrow {
      color: var(--sp-text-placeholder);
    }
  }
}
.ap-empty {
  padding: 20px;
}

/* ---- 信号强度颜色 ---- */
.rssi {
  &.rssi-strong { color: #00b578; }
  &.rssi-good { color: #4caf50; }
  &.rssi-fair { color: #ff9800; }
  &.rssi-weak { color: #f44336; }
}

/* ---- 手动输入 ---- */
.manual-section {
  .manual-tip {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--sp-text-secondary);
    text-align: center;
  }
}
.manual-form {
  padding: 8px 16px 12px;
  .manual-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
  }
}

.mt-12 { margin-top: 12px; }
.mt-16 { margin-top: 16px; }
.mt-20 { margin-top: 20px; }
.ml-8 { margin-left: 8px; }
</style>

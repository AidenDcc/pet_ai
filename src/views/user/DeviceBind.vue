<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import { bindDeviceApi, scanBluetoothApi, type BluetoothDevice } from '@/api/modules/device'
import { petAvatarSrc } from '@/utils/petAvatar'

const router = useRouter()
const { t } = useI18n()

/** 步骤：'scan' | 'pet' | 'confirm' */
const step = ref<'scan' | 'pet' | 'confirm'>('scan')

/** 蓝牙扫描 */
const scanning = ref(false)
const bluetoothDevices = ref<BluetoothDevice[]>([])
const selectedDevice = ref<BluetoothDevice | null>(null)

/** 手动输入 SN — 作为蓝牙扫描失败的降级路径 */
const showManual = ref(false)
const manualSn = ref('')

/** 宠物选择 */
const pets = ref<PetJoined[]>([])
const petId = ref('')
const submitting = ref(false)

/** 已选宠物 */
const selectedPet = computed(() => pets.value.find((p) => p.id === petId.value) ?? null)

/** 步骤指示器 */
const steps = computed(() => [
  { key: 'scan', label: t('user.bind.stepScan') },
  { key: 'pet', label: t('user.bind.stepPet') },
])

/** 信号强度描述 */
function rssiLabel(rssi: number): string {
  if (rssi > -55) return '●●●●'
  if (rssi > -67) return '●●●○'
  if (rssi > -80) return '●●○○'
  return '●○○○'
}

function rssiClass(rssi: number): string {
  if (rssi > -55) return 'rssi-strong'
  if (rssi > -67) return 'rssi-good'
  if (rssi > -80) return 'rssi-fair'
  return 'rssi-weak'
}

/** 蓝牙扫描 */
async function startScan() {
  scanning.value = true
  bluetoothDevices.value = []
  selectedDevice.value = null

  try {
    // 模拟扫描延迟
    await new Promise((r) => setTimeout(r, 1500))
    const list = await scanBluetoothApi()
    bluetoothDevices.value = list
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    scanning.value = false
  }
}

/** 选择蓝牙设备 → 进入宠物选择步骤 */
function onSelectDevice(device: BluetoothDevice) {
  selectedDevice.value = device
}

function onConfirmDevice() {
  if (!selectedDevice.value && !manualSn.value.trim()) {
    showToast(t('user.bind.pickDevice'))
    return
  }
  step.value = 'pet'
}

/** 手动输入 SN 确认 */
function onManualConfirm() {
  if (!manualSn.value.trim()) {
    showToast(t('user.bind.snPlaceholder'))
    return
  }
  step.value = 'pet'
}

/** 加载宠物列表 */
async function loadPets() {
  try {
    pets.value = await getMyPetsApi()
    if (pets.value.length) petId.value = pets.value[0].id
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  }
}

/** 最终绑定 */
async function onSubmit() {
  const sn = selectedDevice.value?.sn || manualSn.value.trim()
  if (!sn) {
    showToast(t('user.bind.snPlaceholder'))
    return
  }
  if (!petId.value) {
    showToast(t('user.bind.pickPet'))
    return
  }
  submitting.value = true
  try {
    await bindDeviceApi({ sn, petId: petId.value })
    showToast(t('user.bind.bindSuccessActive'))
    setTimeout(() => router.back(), 800)
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  } finally {
    submitting.value = false
  }
}

/** 返回上一步 */
function goBack() {
  if (step.value === 'pet') {
    step.value = 'scan'
  } else if (step.value === 'confirm') {
    step.value = 'pet'
  }
}

// 进入页面时加载宠物列表 + 自动开始扫描
loadPets()
startScan()
</script>

<template>
  <div class="bind">
    <!-- 步骤指示器 -->
    <div class="steps-bar">
      <div
        v-for="(s, i) in steps"
        :key="s.key"
        class="step-item"
        :class="{ active: step === s.key, done: steps.findIndex((x) => x.key === step) > i }"
      >
        <div class="step-circle">{{ i + 1 }}</div>
        <div class="step-label">{{ s.label }}</div>
        <div v-if="i < steps.length - 1" class="step-line"></div>
      </div>
    </div>

    <!-- ================= 步骤 1：蓝牙扫描 ================= -->
    <div v-if="step === 'scan'" class="step-scan">
      <!-- 扫描状态 -->
      <div class="scan-header sp-card">
        <div class="scan-title-row">
          <span class="scan-icon">📡</span>
          <span class="scan-title">{{ t('user.bind.scanTitle') }}</span>
        </div>

        <van-button
          block
          round
          type="primary"
          :loading="scanning"
          :loading-text="t('user.bind.scanning')"
          :disabled="scanning"
          @click="startScan"
        >
          {{ scanning ? t('user.bind.scanning') : bluetoothDevices.length ? t('user.bind.scanRetry') : t('user.bind.scanBtn') }}
        </van-button>
      </div>

      <!-- 扫描结果列表 -->
      <div v-if="bluetoothDevices.length" class="device-list mt-12">
        <div
          v-for="device in bluetoothDevices"
          :key="device.id"
          class="device-card sp-card"
          :class="{ selected: selectedDevice?.id === device.id }"
          @click="onSelectDevice(device)"
        >
          <div class="device-row">
            <div class="device-left">
              <div class="device-icon">📟</div>
              <div class="device-info">
                <div class="device-name">{{ device.name }}</div>
                <div class="device-sn">SN: {{ device.sn }}</div>
              </div>
            </div>
            <div class="device-right">
              <div class="rssi" :class="rssiClass(device.rssi)">
                <span class="rssi-bars">{{ rssiLabel(device.rssi) }}</span>
                <span class="rssi-val">{{ device.rssi }} dBm</span>
              </div>
              <van-icon v-if="selectedDevice?.id === device.id" name="success" color="var(--sp-primary)" size="20" />
            </div>
          </div>
        </div>
      </div>

      <!-- 扫描空结果 -->
      <div v-if="!scanning && bluetoothDevices.length === 0" class="scan-empty sp-card mt-12">
        <van-empty :description="t('user.bind.scanEmpty')" />
      </div>

      <!-- 确认选择 → 下一步 -->
      <div v-if="selectedDevice" class="confirm-bar mt-16">
        <div class="selected-hint">
          {{ t('user.bind.selectedDevice') }}：<strong>{{ selectedDevice.name }}</strong> (SN: {{ selectedDevice.sn }})
        </div>
        <van-button block round type="primary" size="large" @click="onConfirmDevice">
          {{ t('user.bind.petStep') }}
        </van-button>
      </div>

      <!-- 手动输入 SN 降级入口 -->
      <div class="manual-section mt-20">
        <van-divider>{{ t('user.bind.manualTitle') }}</van-divider>
        <div v-if="!showManual" class="manual-tip">
          <span>{{ t('user.bind.manualHint') }}</span>
          <van-button size="small" type="primary" plain round @click="showManual = true">
            {{ t('user.bind.manualBtn') }}
          </van-button>
        </div>
        <div v-else class="manual-form sp-card">
          <van-field
            v-model="manualSn"
            :label="t('user.bind.sn')"
            :placeholder="t('user.bind.snPlaceholder')"
            clearable
            :border="false"
          />
          <div class="manual-actions">
            <van-button size="small" round plain @click="showManual = false; manualSn = ''">
              {{ t('common.cancel') }}
            </van-button>
            <van-button size="small" round type="primary" @click="onManualConfirm">
              {{ t('common.confirm') }}
            </van-button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= 步骤 2：选择宠物 ================= -->
    <div v-if="step === 'pet'" class="step-pet">
      <div class="form sp-card">
        <!-- 已选设备提示 -->
        <div class="selected-device-bar">
          <span class="sd-icon">📟</span>
          <span class="sd-text">
            {{ selectedDevice ? `${selectedDevice.name} (${selectedDevice.sn})` : `手动输入 (${manualSn})` }}
          </span>
        </div>

        <van-divider />

        <div class="radio-label">{{ t('user.bind.selectPet') }}</div>
        <van-radio-group v-model="petId" direction="vertical" class="pet-radios">
          <van-radio v-for="p in pets" :key="p.id" :name="p.id" class="pet-radio">
            <div class="pet-option">
              <img class="pet-avatar" :src="petAvatarSrc(p.name) || p.avatar" :alt="p.name" />
              <div>
                <div class="pet-name">{{ p.name }}</div>
                <div class="pet-desc">{{ p.breed }} · {{ p.weight }}kg{{ p.device ? t('user.bind.boundSuffix') : '' }}</div>
              </div>
            </div>
          </van-radio>
        </van-radio-group>
        <van-empty v-if="!pets.length" :description="t('user.bind.noPet')" />
      </div>

      <div class="step-pet-actions mt-16">
        <van-button block round plain size="large" @click="goBack">
          {{ t('common.back') }}
        </van-button>
        <van-button block round type="primary" size="large" @click="step = 'confirm'">
          {{ t('user.bind.confirmStep') }}
        </van-button>
      </div>
    </div>

    <!-- ================= 步骤 3：确认绑定 ================= -->
    <div v-if="step === 'confirm'" class="step-confirm">
      <div class="confirm-card sp-card">
        <div class="confirm-title">{{ t('user.bind.confirmStep') }}</div>
        <van-divider />

        <!-- 设备信息 -->
        <div class="confirm-row">
          <span class="confirm-label">📟 {{ t('user.devices.title') }}</span>
          <span class="confirm-value">
            {{ selectedDevice ? `${selectedDevice.name} (${selectedDevice.sn})` : `SN: ${manualSn}` }}
          </span>
        </div>

        <!-- 信号强度（蓝牙设备） -->
        <div v-if="selectedDevice" class="confirm-row">
          <span class="confirm-label">📶 {{ t('user.bind.signalStrength') }}</span>
          <span class="confirm-value rssi" :class="rssiClass(selectedDevice.rssi)">
            {{ rssiLabel(selectedDevice.rssi) }} {{ selectedDevice.rssi }} dBm
          </span>
        </div>

        <!-- 宠物信息 -->
        <div v-if="selectedPet" class="confirm-row pet-row">
          <span class="confirm-label">🐾 {{ t('user.bind.bindTo') }}</span>
          <div class="confirm-pet">
            <img :src="petAvatarSrc(selectedPet.name) || selectedPet.avatar" :alt="selectedPet.name" class="cp-avatar" />
            <div>
              <div class="cp-name">{{ selectedPet.name }}</div>
              <div class="cp-desc">{{ selectedPet.breed }} · {{ selectedPet.weight }}kg</div>
            </div>
          </div>
        </div>
      </div>

      <div class="confirm-actions mt-20">
        <van-button block round plain size="large" @click="goBack">
          {{ t('common.back') }}
        </van-button>
        <van-button block round type="primary" size="large" :loading="submitting" @click="onSubmit">
          {{ t('user.bind.bindBtn') }}
        </van-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.bind {
  padding: 16px 14px;
  padding-bottom: 90px;
  min-height: 100%;
}

/* ==================== 步骤指示器 ==================== */
.steps-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  padding: 0 20px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;

  &.active .step-circle {
    background: var(--sp-primary);
    color: #fff;
    border-color: var(--sp-primary);
  }

  &.done .step-circle {
    background: var(--sp-primary);
    color: #fff;
    border-color: var(--sp-primary);
  }
}

.step-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--sp-border);
  background: var(--sp-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--sp-text-secondary);
  transition: all 0.3s;
  flex-shrink: 0;
}

.step-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--sp-text-secondary);
  margin-left: 4px;

  .active & {
    color: var(--sp-primary);
    font-weight: 700;
  }
}

.step-line {
  width: 32px;
  height: 2px;
  background: var(--sp-border);
  margin: 0 10px;
}

/* ==================== 蓝牙扫描步骤 ==================== */
.scan-header {
  padding: 16px;

  .scan-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
  }

  .scan-icon {
    font-size: 24px;
  }

  .scan-title {
    font-size: 16px;
    font-weight: 700;
  }
}

/* 扫描结果设备卡片 */
.device-card {
  margin-bottom: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;

  &.selected {
    border-color: var(--sp-primary);
    background: rgba(var(--sp-primary-rgb, 0, 180, 166), 0.04);
  }
}

.device-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.device-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.device-icon {
  font-size: 26px;
}

.device-info {
  .device-name {
    font-size: 15px;
    font-weight: 600;
  }
  .device-sn {
    margin-top: 2px;
    font-size: 12px;
    color: var(--sp-text-placeholder);
  }
}

.device-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 信号强度 */
.rssi {
  text-align: right;

  .rssi-bars {
    font-size: 13px;
    letter-spacing: 1px;
    display: block;
  }

  .rssi-val {
    font-size: 11px;
    color: var(--sp-text-placeholder);
  }

  &.rssi-strong .rssi-bars { color: #00b578; }
  &.rssi-good .rssi-bars { color: #4caf50; }
  &.rssi-fair .rssi-bars { color: #ff9800; }
  &.rssi-weak .rssi-bars { color: #f44336; }
}

/* 已选择提示 */
.selected-hint {
  text-align: center;
  font-size: 13px;
  color: var(--sp-text-secondary);
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(var(--sp-primary-rgb, 0, 180, 166), 0.06);
  border-radius: 8px;
}

/* 手动输入区域 */
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

/* ==================== 宠物选择步骤 ==================== */
.selected-device-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  font-size: 14px;

  .sd-icon {
    font-size: 20px;
  }

  .sd-text {
    font-weight: 600;
    color: var(--sp-primary);
  }
}

.form {
  padding: 8px 16px 16px;
}

.radio-label {
  font-size: 14px;
  font-weight: 600;
  margin: 8px 0 10px;
}

.pet-radios {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pet-radio {
  padding: 10px 12px;
  border: 1px solid var(--sp-border);
  border-radius: 12px;

  :deep(.van-radio__icon) {
    margin-right: 10px;
  }
}

.pet-option {
  display: flex;
  align-items: center;
  gap: 10px;

  .pet-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .pet-name {
    font-size: 14px;
    font-weight: 600;
  }

  .pet-desc {
    font-size: 12px;
    color: var(--sp-text-secondary);
  }
}

.step-pet-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ==================== 确认绑定步骤 ==================== */
.confirm-card {
  padding: 16px;
}

.confirm-title {
  font-size: 16px;
  font-weight: 700;
}

.confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;

  &.pet-row {
    align-items: flex-start;
  }
}

.confirm-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--sp-text-secondary);
  flex-shrink: 0;
}

.confirm-value {
  font-size: 14px;
  font-weight: 600;
  text-align: right;
}

.confirm-pet {
  display: flex;
  align-items: center;
  gap: 8px;

  .cp-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }

  .cp-name {
    font-weight: 600;
    font-size: 14px;
  }

  .cp-desc {
    font-size: 12px;
    color: var(--sp-text-secondary);
  }
}

.confirm-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ==================== 通用 ==================== */
.mt-12 { margin-top: 12px; }
.mt-16 { margin-top: 16px; }
.mt-20 { margin-top: 20px; }

.scan-empty {
  padding: 20px;
}
</style>

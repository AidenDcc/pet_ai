<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import {
  getDeviceApi,
  getDeviceFirmwareApi,
  upgradeDeviceFirmwareApi,
  type DeviceJoined,
  type DeviceFirmwareInfo,
} from '@/api/modules/device'
import { deviceImageSrc } from '@/utils/deviceImage'

const route = useRoute()
const { t } = useI18n()

const deviceId = route.params.id as string
const device = ref<DeviceJoined | null>(null)
const info = ref<DeviceFirmwareInfo | null>(null)
const checking = ref(false)
const upgrading = ref(false)

const upgradable = computed(() => info.value?.upgradable ?? false)

const fileSizeText = computed(() => {
  const size = info.value?.latestPackage?.fileSize
  if (!size) return '-'
  return `${(size / 1024 / 1024).toFixed(1)} MB`
})

async function load() {
  try {
    device.value = await getDeviceApi(deviceId)
    info.value = await getDeviceFirmwareApi(deviceId)
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  }
}

async function check() {
  checking.value = true
  try {
    info.value = await getDeviceFirmwareApi(deviceId)
    showToast(upgradable.value ? t('user.firmware.foundNew') : t('user.firmware.alreadyLatest'))
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    checking.value = false
  }
}

async function upgrade() {
  if (!upgradable.value) return
  upgrading.value = true
  try {
    await upgradeDeviceFirmwareApi(deviceId)
    showToast(t('user.firmware.upgradeSuccess'))
    await load()
  } catch (e) {
    showToast((e as Error).message || t('user.firmware.upgradeFailed'))
  } finally {
    upgrading.value = false
  }
}

load()
</script>

<template>
  <div v-if="device" class="firmware">
    <!-- 设备头部 -->
    <div class="hero sp-card">
      <img class="hero-icon" :src="deviceImageSrc(device.type)" :alt="device.name" />
      <div class="hero-info">
        <div class="hero-name">{{ device.petName ? t('user.sync.collarOf', { name: device.petName }) : device.name }}</div>
        <div class="hero-sn">SN: {{ device.sn }}</div>
      </div>
    </div>

    <!-- 版本信息 -->
    <div class="version-card sp-card mt-16">
      <div class="version-row">
        <span class="version-label">{{ t('user.firmware.current') }}</span>
        <span class="version-value">{{ device.firmware }}</span>
      </div>
      <van-divider :style="{ margin: '12px 0' }" />
      <div class="version-row">
        <span class="version-label">{{ t('user.firmware.latest') }}</span>
        <span class="version-value">
          <template v-if="info?.latest">
            <van-tag v-if="!upgradable" round type="success">{{ t('user.firmware.latestTag') }}</van-tag>
            <van-tag v-else round type="warning">{{ t('user.firmware.upgradeTag') }}</van-tag>
            {{ info?.latest }}
          </template>
          <span v-else>-</span>
        </span>
      </div>
    </div>

    <!-- 更新说明 -->
    <div v-if="info?.latestPackage" class="changelog-card sp-card mt-16">
      <div class="changelog-title">{{ t('user.firmware.changelog') }}</div>
      <div class="changelog-name">{{ info.latestPackage.name }} {{ info.latestPackage.version }}</div>
      <div class="changelog-desc">{{ info.latestPackage.description }}</div>
      <div class="changelog-meta">
        <span>{{ t('user.firmware.releaseDate') }}：{{ info.latestPackage.releaseDate }}</span>
        <span>{{ t('user.firmware.fileSize') }}：{{ fileSizeText }}</span>
      </div>
    </div>

    <!-- 操作 -->
    <div class="action-bar">
      <van-button block round plain type="primary" :loading="checking" :loading-text="t('user.firmware.checking')" @click="check">
        {{ t('user.firmware.check') }}
      </van-button>
      <van-button
        v-if="upgradable"
        block
        round
        type="primary"
        :loading="upgrading"
        :loading-text="t('user.firmware.upgrading')"
        @click="upgrade"
      >
        {{ t('user.firmware.upgrade') }}
      </van-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.firmware {
  padding: 16px 14px 26px;
}

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

.version-card {
  padding: 16px;

  .version-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .version-label {
      font-size: 14px;
      color: var(--sp-text-secondary);
    }
    .version-value {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 15px;
      font-weight: 700;
    }
  }
}

.changelog-card {
  padding: 16px;

  .changelog-title {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .changelog-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--sp-primary);
    margin-bottom: 6px;
  }
  .changelog-desc {
    font-size: 13px;
    line-height: 1.6;
    color: var(--sp-text-secondary);
  }
  .changelog-meta {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    font-size: 12px;
    color: var(--sp-text-placeholder);
  }
}

.action-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.mt-16 {
  margin-top: 16px;
}
</style>

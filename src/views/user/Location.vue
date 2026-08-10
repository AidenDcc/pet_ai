<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import {
  getDeviceListApi,
  getDeviceTrackApi,
  updateGeofenceApi,
  commandDeviceApi,
  type DeviceJoined,
} from '@/api/modules/device'
import MockMap from '@/components/MockMap.vue'
import { relativeTime } from '@/utils/format'

const router = useRouter()
const { t } = useI18n()

const pets = ref<PetJoined[]>([])
const activePet = ref<PetJoined | null>(null)
const activeIndex = ref(0)
const devices = ref<DeviceJoined[]>([])
const device = ref<DeviceJoined | null>(null)
const track = ref<{ points: { lat: number; lng: number; ts: number }[]; center: { lat: number; lng: number } } | null>(null)
const fenceRadius = ref(500)
const fenceEnabled = ref(true)
const loading = ref(false)
const saving = ref(false)

async function loadPets() {
  loading.value = true
  try {
    const [petList, devList] = await Promise.all([getMyPetsApi(), getDeviceListApi()])
    pets.value = petList
    devices.value = devList
    if (pets.value.length) {
      activePet.value = pets.value[0]
      await loadTrack()
    }
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function loadTrack() {
  if (!activePet.value) return
  device.value = devices.value.find((d) => d.boundPetId === activePet.value?.id) ?? null
  if (!device.value) {
    track.value = null
    return
  }
  const res = await getDeviceTrackApi(device.value.id)
  track.value = res
  fenceRadius.value = device.value.geofence?.radius ?? 500
  fenceEnabled.value = device.value.geofence?.enabled ?? true
}

function onPetChange(index: number) {
  activePet.value = pets.value[index] ?? null
  track.value = null
  if (activePet.value) loadTrack().catch((e) => showToast((e as Error).message))
}

async function saveFence() {
  if (!device.value) return
  saving.value = true
  try {
    const res = await updateGeofenceApi({
      deviceId: device.value.id,
      center: device.value.geofence?.center ?? track.value?.center ?? { lat: 31.2304, lng: 121.4737 },
      radius: fenceRadius.value,
      enabled: fenceEnabled.value,
    })
    device.value = res
    showToast(fenceEnabled.value ? t('user.location.fenceUpdated') : t('user.location.fenceClosed'))
  } catch (e) {
    showToast((e as Error).message || t('common.saveFailed'))
  } finally {
    saving.value = false
  }
}

async function sendCommand(command: string) {
  if (!device.value) return
  try {
    const res = await commandDeviceApi({ deviceId: device.value.id, command })
    showToast(res.message)
  } catch (e) {
    showToast((e as Error).message || t('user.devices.cmdFailed'))
  }
}

async function refresh() {
  if (!device.value) return
  showToast(t('user.location.locating'))
  await loadTrack()
  showToast(t('user.location.locRefreshed'))
}

loadPets()
</script>

<template>
  <div class="location">
    <!-- 宠物切换 -->
    <van-tabs v-if="pets.length > 1" v-model:active="activeIndex" color="#ff6b00" class="pet-tabs" @change="onPetChange">
      <van-tab v-for="p in pets" :key="p.id" :title="p.name" />
    </van-tabs>

    <van-skeleton :loading="loading" :row="5" class="mt-8" />

    <template v-if="activePet">
      <!-- 未绑定设备 -->
      <van-empty v-if="!device" :description="t('user.location.noDevice')">
        <van-button round type="primary" @click="router.push('/user/devices/bind')">{{ t('user.location.goBind') }}</van-button>
      </van-empty>

      <template v-else>
        <!-- 地图 -->
        <div class="map-card sp-card">
          <div class="map-head">
            <div>
              <div class="map-title">{{ t('user.location.livePosition', { name: activePet.name }) }}</div>
              <div class="map-sub">
                {{ track ? `${t('user.home.lastSync')} ${relativeTime(track.points[track.points.length - 1].ts)}` : t('common.loading') }}
              </div>
            </div>
            <van-button size="small" round plain type="primary" icon="replay" @click="refresh">{{ t('common.refresh') }}</van-button>
          </div>
          <MockMap
            v-if="track"
            :points="track.points"
            :center="device.geofence?.center ?? track.center"
            :radius="fenceRadius"
            :show-fence="fenceEnabled"
          />
        </div>

        <!-- 电子围栏 -->
        <div class="fence-card sp-card mt-16">
          <div class="fence-head">
            <span class="fence-title">{{ t('user.location.geofence') }}</span>
            <van-switch v-model="fenceEnabled" size="22px" color="#ff6b00" />
          </div>
          <div class="fence-value">{{ t('user.location.radiusMeter', { n: fenceRadius }) }}</div>
          <van-slider v-model="fenceRadius" :min="100" :max="2000" :step="100" bar-color="#ff6b00" active-color="#ff6b00" />
          <div class="fence-presets">
            <span v-for="r in [300, 500, 800, 1200]" :key="r" class="preset" :class="{ active: fenceRadius === r }" @click="fenceRadius = r">
              {{ r }}m
            </span>
          </div>
          <van-button block round type="primary" :loading="saving" class="mt-16" @click="saveFence">
            {{ fenceEnabled ? t('user.location.saveFence') : t('user.location.confirmClose') }}
          </van-button>
        </div>

        <!-- 远程指令 -->
        <div class="cmd-card sp-card mt-16">
          <div class="fence-title mb-16">{{ t('user.location.remoteCmd') }}</div>
          <div class="cmd-list">
            <div class="cmd-item" @click="sendCommand('find')">
              <div class="cmd-icon">🔔</div>
              <div class="cmd-text">{{ t('user.location.cmdFind') }}</div>
            </div>
            <div class="cmd-item" @click="sendCommand('light')">
              <div class="cmd-icon">💡</div>
              <div class="cmd-text">{{ t('user.location.cmdLight') }}</div>
            </div>
            <div class="cmd-item" @click="sendCommand('refresh')">
              <div class="cmd-icon">🛰️</div>
              <div class="cmd-text">{{ t('user.location.cmdRefresh') }}</div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped lang="scss">
.location {
  padding: 16px 14px;
  padding-top: 0;
}
.pet-tabs {
  margin-bottom: 12px;
  :deep(.van-tabs__wrap) {
    background: #fff;
    border-radius: 12px;
  }
}
.map-card {
  padding: 14px;
}
.map-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  .map-title {
    font-size: 15px;
    font-weight: 700;
  }
  .map-sub {
    font-size: 12px;
    color: var(--sp-text-secondary);
    margin-top: 3px;
  }
}
.fence-card {
  padding: 16px;
}
.fence-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  .fence-title {
    font-size: 15px;
    font-weight: 700;
  }
}
.fence-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--sp-primary-dark);
  margin: 12px 0 10px;
}
.fence-presets {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  .preset {
    padding: 5px 14px;
    border-radius: 14px;
    background: #f0f3f8;
    font-size: 13px;
    color: var(--sp-text-secondary);
    cursor: pointer;
    &.active {
      background: var(--el-color-primary-light-8);
      color: var(--sp-primary-dark);
      font-weight: 600;
    }
  }
}
.cmd-card {
  padding: 16px;
}
.cmd-list {
  display: flex;
  gap: 12px;
  .cmd-item {
    flex: 1;
    text-align: center;
    padding: 14px 0;
    background: #f7f9fc;
    border-radius: 12px;
    cursor: pointer;
    .cmd-icon {
      font-size: 22px;
    }
    .cmd-text {
      margin-top: 6px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
  }
}
.mb-16 {
  margin-bottom: 16px;
}
</style>

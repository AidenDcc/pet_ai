<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast, showDialog } from 'vant'
import { getFencesApi, createFenceApi, updateFenceApi, deleteFenceApi, type PetFence } from '@/api/modules/fence'
import { getDeviceListApi, getDeviceTrackApi, type DeviceJoined } from '@/api/modules/device'
import { getMyLocationApi } from '@/api/modules/location'
import { haversineMeters, buildMapFences } from '@/utils/geo'
import type { GeoPoint } from '@/types'
import Amap from '@/components/Amap.vue'

const route = useRoute()
const { t } = useI18n()

const petId = route.params.petId as string
const fences = ref<PetFence[]>([])
const loading = ref(false)
const saving = ref(false)

// 手机实时定位 + 宠物位置（用于动态围栏的距离与状态）
const devices = ref<DeviceJoined[]>([])
const track = ref<GeoPoint[]>([])
const phoneLoc = ref<{ lat: number; lng: number } | null>(null)

// 添加/编辑（固定围栏）弹窗
const showForm = ref(false)
const editingFence = ref<PetFence | null>(null)
/** 地图选中心点模式：true 时点击地图设置围栏中心点 */
const pickMode = ref(false)
/** 地图上已选中心点标记 */
const pickMarker = ref<{ lat: number; lng: number } | null>(null)
const form = ref({
  name: '',
  center: { lat: 31.2304, lng: 121.4737 },
  radius: 500,
})

// 动态围栏（跟随手机）：仅一条，只调整半径
const showDynamicForm = ref(false)
const dynamicRadius = ref(500)

/** 固定中心点围栏（列表展示） */
const fixedFences = computed(() => fences.value.filter((f) => f.type !== 'dynamic'))
/** 动态中心点围栏（唯一一条） */
const dynamicFence = computed(() => fences.value.find((f) => f.type === 'dynamic') ?? null)
/** 宠物当前位置（轨迹最后一点） */
const petPos = computed(() => track.value[track.value.length - 1] ?? null)
/** 宠物 ↔ 手机 当前距离（米） */
const distance = computed<number | null>(() => {
  if (!phoneLoc.value || !petPos.value) return null
  return Math.round(haversineMeters(phoneLoc.value, { lat: petPos.value.lat, lng: petPos.value.lng }))
})
/** 动态围栏状态：在围栏内 / 已超出 / 已关闭 / 定位中 */
const dynStatus = computed<'closed' | 'inside' | 'outside' | 'unknown'>(() => {
  const dyn = dynamicFence.value
  if (!dyn || !dyn.enabled) return 'closed'
  if (distance.value === null) return 'unknown'
  return distance.value <= dyn.radius ? 'inside' : 'outside'
})
/** 地图渲染：动态围栏中心覆盖为手机实时定位 */
const mapFences = computed(() => buildMapFences(fences.value, phoneLoc.value))

/** 新增固定围栏：先进入地图选点模式，点选中心点后再弹出设置 */
function openAdd() {
  editingFence.value = null
  form.value = { name: '', center: { lat: 31.2304, lng: 121.4737 }, radius: 500 }
  pickMarker.value = null
  pickMode.value = true
  showForm.value = false
}

function openEdit(fence: PetFence) {
  editingFence.value = fence
  form.value = {
    name: fence.name,
    center: fence.center,
    radius: fence.radius,
  }
  pickMarker.value = fence.center
  pickMode.value = false
  showForm.value = true
}

/** 地图点选中心点回调 */
function onPickCenter(pos: { lat: number; lng: number }) {
  form.value.center = pos
  pickMarker.value = pos
  pickMode.value = false
  showForm.value = true
}

/** 表单里重新选点 */
function repickCenter() {
  showForm.value = false
  pickMode.value = true
}

/** 取消地图选点 */
function cancelPick() {
  pickMode.value = false
  pickMarker.value = null
}

async function loadFences() {
  loading.value = true
  try {
    fences.value = await getFencesApi(petId)
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

/** 加载手机实时定位 + 宠物位置（供动态围栏距离计算） */
async function loadLocation() {
  try {
    const devList = await getDeviceListApi()
    devices.value = devList
    const dev = devList.find((d) => d.boundPetId === petId)
    if (dev) {
      const t = await getDeviceTrackApi(dev.id)
      track.value = t.points
    }
    const loc = await getMyLocationApi(petId)
    phoneLoc.value = loc
  } catch {
    // 定位失败不阻塞页面
  }
}

async function doSave() {
  if (!form.value.name.trim()) {
    showToast(t('user.health.fenceNamePlaceholder'))
    return
  }
  saving.value = true
  try {
    const data = {
      name: form.value.name.trim(),
      center: form.value.center,
      radius: form.value.radius,
    }
    if (editingFence.value) {
      await updateFenceApi(petId, editingFence.value.id, data)
    } else {
      await createFenceApi(petId, data)
    }
    showToast(t('user.health.fenceSaved'))
    showForm.value = false
    await loadFences()
  } catch (e) {
    showToast((e as Error).message || t('common.saveFailed'))
  } finally {
    saving.value = false
  }
}

/** 动态围栏：调整半径 */
function openDynamicEdit() {
  dynamicRadius.value = dynamicFence.value?.radius ?? 500
  showDynamicForm.value = true
}

async function saveDynamicRadius() {
  const dyn = dynamicFence.value
  if (!dyn) return
  saving.value = true
  try {
    await updateFenceApi(petId, dyn.id, { radius: dynamicRadius.value })
    showToast(t('user.health.fenceSaved'))
    showDynamicForm.value = false
    await loadFences()
  } catch (e) {
    showToast((e as Error).message || t('common.saveFailed'))
  } finally {
    saving.value = false
  }
}

/** 动态围栏开关 */
async function onToggleDynamic(enabled: boolean) {
  const dyn = dynamicFence.value
  if (!dyn) return
  try {
    await updateFenceApi(petId, dyn.id, { enabled })
    // showToast(enabled ? t('user.health.geofenceOn', { radius: dyn.radius }) : t('user.health.fenceClosed'))
    await loadFences()
  } catch (e) {
    // showToast((e as Error).message || t('common.opFailed'))
  }
}

async function doDelete(fence: PetFence) {
  try {
    await showDialog({
      title: t('user.health.deleteFence'),
      message: t('user.health.deleteFenceConfirm', { name: fence.name }),
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
      confirmButtonColor: '#ff6b6b',
    })
  } catch {
    return
  }
  try {
    await deleteFenceApi(petId, fence.id)
    showToast(t('user.health.fenceDeleted'))
    fences.value = fences.value.filter((f) => f.id !== fence.id)
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  }
}

onMounted(() => {
  loadFences()
  loadLocation()
})
</script>

<template>
  <div class="fence-manage">
    <!-- 地图预览（新增围栏时用于选中心点） -->
    <div class="map-preview">
      <Amap
        :points="[]"
        :center="null"
        :show-fence="false"
        :fences="mapFences"
        :pick-mode="pickMode"
        :pick-marker="pickMarker"
        @pick-center="onPickCenter"
      />
      <!-- 选点提示 -->
      <div v-if="pickMode" class="pick-hint">
        <span class="pick-hint-text">
          <van-icon name="location-o" />
          {{ t('user.health.pickCenterHint') }}
        </span>
        <van-button size="mini" plain type="default" @click="cancelPick">{{ t('common.cancel') }}</van-button>
      </div>
    </div>

    <!-- 动态中心点围栏（跟随手机，仅一条，只调整半径） -->
    <div v-if="dynamicFence" class="dynamic-card sp-card">
      <div class="df-top">
        <div class="df-title">📱 {{ t('user.health.followPhone') }}</div>
        <van-switch v-model="dynamicFence.enabled" size="20px" color="#2f7cf6" @change="onToggleDynamic" />
      </div>

      <div class="df-status">
        <span class="df-distance">
          {{ t('user.health.currentDistance') }}：
          <strong>{{ distance !== null ? t('user.health.radiusMeter', { n: distance }) : '--' }}</strong>
        </span>
        <span v-if="dynStatus === 'inside'" class="df-badge is-inside">{{ t('user.health.insideFence') }}</span>
        <span v-else-if="dynStatus === 'outside'" class="df-badge is-outside">{{ t('user.health.outsideFence') }}</span>
        <span v-else-if="dynStatus === 'closed'" class="df-badge is-closed">{{ t('user.health.fenceClosed') }}</span>
        <span v-else class="df-badge is-unknown">…</span>
      </div>

      <div class="df-desc">{{ t('user.health.dynamicFenceDesc') }}</div>

      <div class="df-actions">
        <van-button size="small" plain type="primary" icon="edit" @click="openDynamicEdit">
          {{ t('user.health.adjustRadius') }}
        </van-button>
      </div>
    </div>

    <!-- 固定围栏列表 -->
    <div class="fence-list">
      <van-skeleton :loading="loading" :row="3" />

      <van-empty v-if="!loading && !fixedFences.length" :description="t('user.health.noFence')" />

      <div v-for="fence in fixedFences" :key="fence.id" class="fence-card sp-card">
        <div class="fence-card-top">
          <div class="fence-name">{{ fence.name }}</div>
          <van-switch v-model="fence.enabled" size="20px" color="#ff6b00" @change="() => updateFenceApi(petId, fence.id, { enabled: fence.enabled })" />
        </div>
        <div class="fence-meta">
          <span class="fence-radius">🔄 {{ t('user.health.radiusMeter', { n: fence.radius }) }}</span>
          <span class="fence-coord">📍 {{ fence.address ?? t('user.health.positionLoading') }}</span>
        </div>
        <div class="fence-actions">
          <van-button size="small" plain type="primary" icon="edit" @click="openEdit(fence)">{{ t('common.edit') }}</van-button>
          <van-button size="small" plain type="danger" icon="delete-o" @click="doDelete(fence)">{{ t('common.delete') }}</van-button>
        </div>
      </div>
    </div>

    <!-- 添加按钮（仅固定中心点围栏） -->
    <div class="add-bar">
      <van-button block round type="primary" icon="plus" @click="openAdd">
        {{ t('user.health.addFence') }}
      </van-button>
    </div>

    <!-- 固定围栏 添加/编辑弹窗 -->
    <van-popup v-model:show="showForm" position="bottom" round :style="{ padding: '24px 16px' }">
      <div class="form-title">
        {{ editingFence ? t('user.health.editFence') : t('user.health.addFence') }}
      </div>

      <van-field
        v-model="form.name"
        :label="t('user.health.fenceName')"
        :placeholder="t('user.health.fenceNamePlaceholder')"
        maxlength="20"
      />

      <!-- 中心点：地图选点（编辑时也可重新选） -->
      <div class="form-center">
        <span class="form-center-label">{{ t('user.health.fenceCenter') }}</span>
        <span class="form-center-value">
          📍 {{ form.center.lat.toFixed(4) }}, {{ form.center.lng.toFixed(4) }}
        </span>
        <van-button size="mini" plain type="primary" icon="location-o" @click="repickCenter">
          {{ t('user.health.repickCenter') }}
        </van-button>
      </div>

      <div class="form-radius">
        <div class="form-radius-label">
          {{ t('user.health.fenceRadius') }}：<strong>{{ form.radius }}m</strong>
        </div>
        <van-slider
          v-model="form.radius"
          :min="100"
          :max="3000"
          :step="50"
          bar-color="#ff6b00"
          active-color="#ff6b00"
        />
        <div class="radius-presets">
          <span
            v-for="r in [200, 500, 800, 1500]"
            :key="r"
            class="preset"
            :class="{ active: form.radius === r }"
            @click="form.radius = r"
          >{{ r }}m</span>
        </div>
      </div>

      <div class="form-btns">
        <van-button block round type="primary" :loading="saving" @click="doSave">
          {{ t('user.health.saveFence') }}
        </van-button>
      </div>
    </van-popup>

    <!-- 动态围栏：调整半径弹窗（仅半径，无名称/无选点） -->
    <van-popup v-model:show="showDynamicForm" position="bottom" round :style="{ padding: '24px 16px' }">
      <div class="form-title">📱 {{ t('user.health.adjustRadius') }}</div>
      <div class="df-pop-desc">{{ t('user.health.dynamicFenceDesc') }}</div>

      <div class="form-radius">
        <div class="form-radius-label">
          {{ t('user.health.fenceRadius') }}：<strong>{{ dynamicRadius }}m</strong>
        </div>
        <van-slider
          v-model="dynamicRadius"
          :min="100"
          :max="3000"
          :step="50"
          bar-color="#2f7cf6"
          active-color="#2f7cf6"
        />
        <div class="radius-presets">
          <span
            v-for="r in [200, 500, 800, 1500]"
            :key="r"
            class="preset"
            :class="{ active: dynamicRadius === r }"
            @click="dynamicRadius = r"
          >{{ r }}m</span>
        </div>
      </div>

      <div class="form-btns">
        <van-button block round type="primary" :loading="saving" @click="saveDynamicRadius">
          {{ t('user.health.saveFence') }}
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped lang="scss">
.fence-manage {
  padding-bottom: 90px;
}

.map-preview {
  position: relative;
  height: 260px;
  margin: 0;
  /* Amap 默认 320px，若不填满预览区会溢出盖住下方围栏列表 */
  :deep(.amap-wrap) {
    height: 100%;
  }
}

/* 地图选中心点提示条 */
.pick-hint {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;

  .pick-hint-text {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--sp-primary);
  }
}

/* 动态中心点围栏（跟随手机）卡片 */
.dynamic-card {
  margin: 12px 14px 0;
  padding: 14px 16px;

  .df-top {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .df-title {
      font-size: 16px;
      font-weight: 700;
      color: #2f7cf6;
    }
  }

  .df-status {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    font-size: 13px;

    .df-distance {
      color: var(--sp-text-secondary);

      strong {
        color: #333;
        font-size: 15px;
      }
    }

    .df-badge {
      padding: 2px 10px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;

      &.is-inside { background: rgba(52, 199, 89, 0.12); color: #34c759; }
      &.is-outside { background: rgba(255, 59, 48, 0.12); color: #ff3b30; }
      &.is-closed { background: #f0f3f8; color: var(--sp-text-secondary); }
      &.is-unknown { background: #f0f3f8; color: var(--sp-text-secondary); }
    }
  }

  .df-desc {
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--sp-text-secondary);
  }

  .df-actions {
    margin-top: 12px;
  }
}

/* 动态围栏弹窗说明 */
.df-pop-desc {
  padding: 0 16px 6px;
  font-size: 12px;
  color: var(--sp-text-secondary);
  text-align: center;
}

.fence-list {
  padding: 8px 14px 0;
}

.fence-card {
  padding: 14px 16px;
  margin-bottom: 10px;

  .fence-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .fence-name {
      font-size: 16px;
      font-weight: 700;
      color: #333;
    }
  }

  .fence-meta {
    display: flex;
    gap: 12px;
    margin-top: 8px;
    font-size: 12px;
    color: var(--sp-text-secondary);
  }

  .fence-actions {
    display: flex;
    gap: 10px;
    margin-top: 12px;
  }
}

.add-bar {
  padding: 20px 14px;
}

/* Form popup styles */
.form-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
  text-align: center;
}

.form-center {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 13px;

  .form-center-label {
    color: var(--sp-text-secondary);
    flex-shrink: 0;
  }

  .form-center-value {
    flex: 1;
    min-width: 0;
    color: #333;
    font-weight: 600;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.form-radius {
  padding: 16px;
  .form-radius-label {
    font-size: 14px;
    margin-bottom: 10px;
    strong {
      color: var(--sp-primary);
    }
  }
  .radius-presets {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    .preset {
      padding: 4px 12px;
      border-radius: 12px;
      background: #f0f3f8;
      font-size: 12px;
      color: var(--sp-text-secondary);
      cursor: pointer;
      &.active {
        background: var(--el-color-primary-light-8);
        color: var(--sp-primary-dark);
        font-weight: 600;
      }
    }
  }
}

.form-btns {
  padding: 10px 0;
}
</style>

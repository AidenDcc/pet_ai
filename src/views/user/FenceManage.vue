<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast, showDialog } from 'vant'
import { getFencesApi, createFenceApi, updateFenceApi, deleteFenceApi, type PetFence } from '@/api/modules/fence'
import Amap from '@/components/Amap.vue'

const route = useRoute()
const { t } = useI18n()

const petId = route.params.petId as string
const fences = ref<PetFence[]>([])
const loading = ref(false)
const saving = ref(false)

// 添加/编辑弹窗
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

/** 新增：先进入地图选点模式，点选中心点后再弹出设置 */
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
        :fences="fences"
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

    <!-- 围栏列表 -->
    <div class="fence-list">
      <van-skeleton :loading="loading" :row="3" />

      <van-empty v-if="!loading && !fences.length" :description="t('user.health.noFence')" />

      <div v-for="fence in fences" :key="fence.id" class="fence-card sp-card">
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

    <!-- 添加按钮 -->
    <div class="add-bar">
      <van-button block round type="primary" icon="plus" @click="openAdd">
        {{ t('user.health.addFence') }}
      </van-button>
    </div>

    <!-- 添加/编辑弹窗 -->
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

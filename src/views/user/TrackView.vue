<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import dayjs from 'dayjs'
import Amap from '@/components/Amap.vue'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import { getDeviceListApi, getDeviceTrackHistoryApi, type DeviceJoined } from '@/api/modules/device'
import { haversineMeters } from '@/utils/geo'
import { petAvatarSrc } from '@/utils/petAvatar'
import type { GeoPoint } from '@/types'

const route = useRoute()
const { t } = useI18n()

const petId = route.params.petId as string
const DAY = 86400000

const RANGES = [
  { key: 'today', labelKey: 'user.health.trackToday' },
  { key: '3d', labelKey: 'user.health.track3d' },
  { key: '7d', labelKey: 'user.health.track7d' },
  { key: 'custom', labelKey: 'user.health.trackCustom' },
] as const
type RangeKey = (typeof RANGES)[number]['key']

const pet = ref<PetJoined | null>(null)
const device = ref<DeviceJoined | null>(null)
const points = ref<GeoPoint[]>([])
const loading = ref(false)
const empty = ref(false)

const activeRange = ref<RangeKey>('today')
const from = ref(0)
const to = ref(0)
const showCalendar = ref(false)
const customDates = ref<[Date, Date] | null>(null)

const avatarSrc = computed(() => petAvatarSrc(pet.value?.name) ?? pet.value?.avatar ?? '')

/** 区间边界毫秒时间戳 */
function rangeFor(key: RangeKey, custom?: [Date, Date]): { from: number; to: number } {
  const now = Date.now()
  if (key === '3d') return { from: now - 3 * DAY, to: now }
  if (key === '7d') return { from: now - 7 * DAY, to: now }
  if (key === 'custom' && custom) {
    const [s, e] = custom
    const start = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime()
    const end = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999).getTime()
    return { from: start, to: end }
  }
  // 今天：今日 00:00 → 现在
  const d = new Date()
  return { from: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), to: now }
}

function applyRange(key: RangeKey, custom?: [Date, Date]) {
  activeRange.value = key
  customDates.value = custom ?? null
  const r = rangeFor(key, custom)
  from.value = r.from
  to.value = r.to
  loadTrack()
}

async function loadTrack() {
  if (!device.value) return
  loading.value = true
  empty.value = false
  try {
    const res = await getDeviceTrackHistoryApi(device.value.id, { from: from.value, to: to.value })
    points.value = res.points
  } catch {
    // 区间无轨迹等异常统一展示空状态
    points.value = []
    empty.value = true
  } finally {
    loading.value = false
  }
}

/** 点过多时等间隔抽稀，保留首尾（上限 150 个点位标记） */
const displayPoints = computed(() => {
  const pts = points.value
  if (pts.length <= 150) return pts
  const step = (pts.length - 1) / 149
  const out: GeoPoint[] = []
  for (let i = 0; i < 150; i++) out.push(pts[Math.round(i * step)])
  return out
})

/** 估算里程：相邻轨迹点球面距离累加 */
const distanceMeters = computed(() => {
  const pts = displayPoints.value
  let sum = 0
  for (let i = 1; i < pts.length; i++) sum += haversineMeters(pts[i - 1], pts[i])
  return Math.round(sum)
})

/** 是否跨多日：跨天区间定位点较多，改用热力图；单日直接显示轨迹 */
const isMultiDay = computed(() => {
  if (!from.value || !to.value) return false
  return dayjs(to.value).startOf('day').diff(dayjs(from.value).startOf('day'), 'day') >= 1
})

/** 传给地图的点：单日抽稀画轨迹，多日用全量点渲染热力图 */
const mapPoints = computed(() => (isMultiDay.value ? points.value : displayPoints.value))

const isNow = (ts: number) => Date.now() - ts < 60000

/** 所选时间区间文本（结束时间接近现在时显示「现在」） */
const rangeText = computed(() => {
  if (!from.value || !to.value) return ''
  const f = dayjs(from.value).format('MM-DD HH:mm')
  const tt = isNow(to.value) ? t('user.health.trackNow') : dayjs(to.value).format('MM-DD HH:mm')
  return `${f} ~ ${tt}`
})

const calendarMin = computed(() => dayjs().subtract(30, 'day').startOf('day').toDate())
const calendarMax = computed(() => dayjs().endOf('day').toDate())
const calendarDefault = computed<[Date, Date]>(() => customDates.value ?? [dayjs().subtract(7, 'day').toDate(), new Date()])

function onCalendarConfirm(value: Date[]) {
  const [s, e] = value
  if (!s || !e) return
  customDates.value = [s, e]
  applyRange('custom', [s, e])
}

async function loadBase() {
  try {
    const [pets, devs] = await Promise.all([getMyPetsApi(), getDeviceListApi()])
    pet.value = pets.find((p) => p.id === petId) ?? null
    device.value = devs.find((d) => d.boundPetId === petId) ?? null
    if (!device.value) {
      empty.value = true
      showToast(t('user.health.deviceUnbound'))
      return
    }
    applyRange('today')
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  }
}

onMounted(loadBase)
</script>

<template>
  <div class="track-page">
    <Amap
      :points="mapPoints"
      :heatmap="isMultiDay"
      :show-fence="false"
      :center="null"
      fullscreen
    />

    <!-- 时间区间选择 -->
    <div class="range-bar">
      <div
        v-for="r in RANGES"
        :key="r.key"
        class="range-chip"
        :class="{ 'is-active': activeRange === r.key }"
        @click="r.key === 'custom' ? (showCalendar = true) : applyRange(r.key)"
      >
        {{ t(r.labelKey) }}
      </div>
    </div>

    <!-- 底部摘要卡 -->
    <div v-if="!loading && !empty && displayPoints.length" class="summary-card">
      <img class="sum-avatar" :src="avatarSrc" alt="" />
      <div class="sum-info">
        <div class="sum-pet">{{ pet?.name }}</div>
        <div class="sum-range">{{ rangeText }}</div>
      </div>
      <div class="sum-stats">
        <div class="sum-stat">
          <span class="stat-num">{{ displayPoints.length }}</span>
          <span class="stat-label">{{ t('user.health.trackPointsLabel') }}</span>
        </div>
        <div class="sum-stat">
          <span class="stat-num">{{ distanceMeters }}m</span>
          <span class="stat-label">{{ t('user.health.trackDistanceLabel') }}</span>
        </div>
      </div>
    </div>

    <!-- 空状态 / 加载 -->
    <div v-if="!loading && empty" class="empty-overlay">
      <van-empty :description="t('user.health.trackEmpty')" />
    </div>

    <!-- 自定义日期区间 -->
    <van-calendar
      v-model:show="showCalendar"
      type="range"
      :min-date="calendarMin"
      :max-date="calendarMax"
      :default-date="calendarDefault"
      :title="t('user.health.trackPickerTitle')"
      @confirm="onCalendarConfirm"
    />
  </div>
</template>

<style scoped lang="scss">
.track-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f5f7fa;
}

/* 时间区间 chips（叠在地图上） */
.range-bar {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  z-index: 10;

  .range-chip {
    padding: 6px 14px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(8px);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
    font-size: 13px;
    font-weight: 600;
    color: #666;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s;

    &.is-active {
      background: var(--sp-primary, #ff6b00);
      color: #fff;
    }

    &:active {
      transform: scale(0.94);
    }
  }
}

/* 底部摘要卡 */
.summary-card {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 14px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.15);
  z-index: 10;

  .sum-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
    object-fit: cover;
    flex-shrink: 0;
    background: #eef1f5;
  }

  .sum-info {
    flex: 1;
    min-width: 0;

    .sum-pet {
      font-size: 14px;
      font-weight: 700;
      color: #333;
    }

    .sum-range {
      margin-top: 2px;
      font-size: 11px;
      color: var(--sp-text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .sum-stats {
    display: flex;
    gap: 14px;
    flex-shrink: 0;

    .sum-stat {
      text-align: center;

      .stat-num {
        display: block;
        font-size: 15px;
        font-weight: 800;
        color: var(--sp-primary, #ff6b00);
      }

      .stat-label {
        font-size: 10px;
        color: var(--sp-text-placeholder);
      }
    }
  }
}

/* 空状态 */
.empty-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  z-index: 5;
  pointer-events: none;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { showToast } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import { getReportListApi, generateMyReportApi, type ReportJoined } from '@/api/modules/report'
import { SPECIES_ICON } from '@/utils/consts'

const router = useRouter()
const { t } = useI18n()

const DAY = 86400000

const pets = ref<PetJoined[]>([])
const reports = ref<ReportJoined[]>([])
const loading = ref(false)

/** 页签：未读 / 全部 */
const tab = ref<'unread' | 'all'>('unread')

/** 筛选条件 */
const filterPetId = ref('')
const filterTime = ref<[number, number] | null>(null) // [from, to] 毫秒
const filterScore = ref<[number, number] | null>(null) // [min, max] 0-100

/** 弹层显隐 */
const petPopupVisible = ref(false)
const showCalendar = ref(false)
const scorePopupVisible = ref(false)
const scoreDraft = ref<[number, number]>([0, 100])

/** 手动生成报告 */
const genVisible = ref(false)
const genPetId = ref('')
/** 时间段：本周 / 本月 / 自定义 */
const genRangeType = ref<'week' | 'month' | 'custom'>('week')
const genCustomRange = ref<[Date, Date] | null>(null)
const genCalendarVisible = ref(false)
const generating = ref(false)

const hasFilter = computed(
  () => !!filterPetId.value || !!filterTime.value || !!filterScore.value,
)

const petText = computed(() => {
  const p = pets.value.find((x) => x.id === filterPetId.value)
  return p ? p.name : t('user.reports.filterPet')
})

const timeText = computed(() => {
  if (!filterTime.value) return t('user.reports.filterTime')
  return `${dayjs(filterTime.value[0]).format('MM-DD')}~${dayjs(filterTime.value[1]).format('MM-DD')}`
})

const scoreText = computed(() => {
  if (!filterScore.value) return t('user.reports.filterScore')
  return `${filterScore.value[0]}-${filterScore.value[1]}`
})

const emptyText = computed(() =>
  tab.value === 'unread' ? t('user.reports.unreadEmpty') : t('user.reports.empty'),
)

const genCustomText = computed(() => {
  if (!genCustomRange.value) return t('user.reports.custom')
  return `${dayjs(genCustomRange.value[0]).format('YYYY-MM-DD')} ~ ${dayjs(genCustomRange.value[1]).format('YYYY-MM-DD')}`
})

const calendarMin = computed(() => dayjs().subtract(365, 'day').startOf('day').toDate())
const calendarMax = computed(() => dayjs().endOf('day').toDate())
const calendarDefault = computed<[Date, Date]>(() => {
  if (filterTime.value) return [new Date(filterTime.value[0]), new Date(filterTime.value[1])]
  return [dayjs().subtract(30, 'day').toDate(), new Date()]
})

async function loadReports() {
  loading.value = true
  try {
    reports.value = await getReportListApi({
      unread: tab.value === 'unread',
      petId: filterPetId.value || undefined,
      from: filterTime.value?.[0],
      to: filterTime.value?.[1],
      minScore: filterScore.value?.[0],
      maxScore: filterScore.value?.[1],
    })
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function loadPets() {
  try {
    pets.value = await getMyPetsApi()
    await loadReports()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  }
}

function onTabChange() {
  loadReports().catch(() => undefined)
}

function onPetSelect(id: string) {
  filterPetId.value = id
  petPopupVisible.value = false
  loadReports().catch(() => undefined)
}

function onCalendarConfirm(value: Date[]) {
  const [s, e] = value
  if (!s || !e) return
  filterTime.value = [dayjs(s).startOf('day').valueOf(), dayjs(e).endOf('day').valueOf()]
  showCalendar.value = false
  loadReports().catch(() => undefined)
}

function openScore() {
  scoreDraft.value = filterScore.value ?? [0, 100]
  scorePopupVisible.value = true
}

function confirmScore() {
  const [min, max] = scoreDraft.value
  filterScore.value = min <= 0 && max >= 100 ? null : [min, max]
  scorePopupVisible.value = false
  loadReports().catch(() => undefined)
}

function resetScore() {
  scoreDraft.value = [0, 100]
  filterScore.value = null
  scorePopupVisible.value = false
  loadReports().catch(() => undefined)
}

function resetFilters() {
  filterPetId.value = ''
  filterTime.value = null
  filterScore.value = null
  loadReports().catch(() => undefined)
}

/* ---- 手动生成报告（与运营端逻辑一致：选宠物 → 选时间 → 生成） ---- */

function openGenerate() {
  genPetId.value = pets.value.length === 1 ? pets.value[0].id : ''
  genRangeType.value = 'week'
  genCustomRange.value = null
  genVisible.value = true
}

/** 解析当前选择的时间段，返回时间戳范围与粒度；无效返回 null */
function resolveGenRange(): { startAt: number; endAt: number; timeRange: 'day' | 'week' | 'month' } | null {
  const now = Date.now()
  if (genRangeType.value === 'week') return { startAt: now - 6 * DAY, endAt: now, timeRange: 'week' }
  if (genRangeType.value === 'month') return { startAt: now - 29 * DAY, endAt: now, timeRange: 'month' }
  const [s, e] = genCustomRange.value ?? []
  if (!s || !e) return null
  const startAt = s.getTime()
  const endAt = Math.min(e.getTime() + DAY - 1, now)
  const days = (endAt - startAt) / DAY
  const timeRange = days <= 1.5 ? 'day' : days <= 10 ? 'week' : 'month'
  return { startAt, endAt, timeRange }
}

function onGenCalendarConfirm(value: Date[]) {
  const [s, e] = value
  if (!s || !e) return
  genCustomRange.value = [dayjs(s).startOf('day').toDate(), dayjs(e).startOf('day').toDate()]
  genCalendarVisible.value = false
}

async function doGenerate() {
  if (!genPetId.value) {
    showToast(t('user.reports.selectPet'))
    return
  }
  const range = resolveGenRange()
  if (!range) {
    showToast(t('user.reports.selectTimeRange'))
    return
  }
  if ((range.endAt - range.startAt) / DAY > 30) {
    showToast(t('user.reports.rangeTooLong'))
    return
  }
  generating.value = true
  try {
    const report = await generateMyReportApi(genPetId.value, range)
    showToast(t('user.reports.generated'))
    genVisible.value = false
    await loadReports()
    router.push(`/user/reports/${report.id}`)
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  } finally {
    generating.value = false
  }
}

function reviewLabel(r: ReportJoined) {
  if (r.doctorReview === 'pending') return { labelKey: 'user.reports.pendingReview', type: 'warning' as const }
  if (r.doctorReview === 'approved') return { labelKey: 'user.reports.approved', type: 'success' as const }
  if (r.doctorReview === 'rejected') return { labelKey: 'user.reports.rejected', type: 'danger' as const }
  return { labelKey: 'user.reports.ai', type: 'primary' as const }
}

loadPets()
</script>

<template>
  <div class="reports">
    <!-- 未读 / 全部 -->
    <van-tabs v-model:active="tab" color="#ff6b00" class="report-tabs" @change="onTabChange">
      <van-tab name="unread" :title="t('user.reports.unreadTab')" />
      <van-tab name="all" :title="t('user.reports.allTab')" />
    </van-tabs>

    <!-- 筛选栏：宠物 / 时间 / 评分 -->
    <div class="filter-bar">
      <div class="filter-chip" :class="{ 'is-active': !!filterPetId }" @click="petPopupVisible = true">
        <span>{{ petText }}</span>
        <van-icon name="arrow-down" />
      </div>
      <div class="filter-chip" :class="{ 'is-active': !!filterTime }" @click="showCalendar = true">
        <span>{{ timeText }}</span>
        <van-icon name="arrow-down" />
      </div>
      <div class="filter-chip" :class="{ 'is-active': !!filterScore }" @click="openScore">
        <span>{{ scoreText }}</span>
        <van-icon name="arrow-down" />
      </div>
      <span v-if="hasFilter" class="filter-reset" @click="resetFilters">{{ t('user.reports.reset') }}</span>
    </div>

    <van-skeleton :loading="loading" :row="4" />

    <div
      v-for="r in reports"
      :key="r.id"
      class="report-card sp-card"
      @click="router.push(`/user/reports/${r.id}`)"
    >
      <div class="report-top">
        <span v-if="!r.readAt" class="unread-dot" />
        <div class="report-main">
          <div class="report-head">
            <span class="report-pet">{{ SPECIES_ICON[r.species] }} {{ r.petName }}</span>
            <span class="report-period">{{ r.period }}</span>
          </div>
          <div class="report-summary ellipsis">{{ r.summary }}</div>
        </div>
        <div class="report-score">
          <div class="score-num" :class="{ warn: r.score < 85 }">{{ r.score }}</div>
          <div class="score-label">{{ t('user.reports.score') }}</div>
        </div>
      </div>
      <div class="report-bottom">
        <van-tag v-if="r.abnormal.length" round type="warning">{{ t('user.reports.abnormalCount', { n: r.abnormal.length }) }}</van-tag>
        <van-tag v-else round type="success">{{ t('user.reports.normal') }}</van-tag>
        <van-tag round :type="reviewLabel(r).type">{{ t(reviewLabel(r).labelKey) }}</van-tag>
      </div>
    </div>

    <van-empty v-if="!loading && !reports.length" :description="emptyText" />

    <!-- 宠物筛选 -->
    <van-popup v-model:show="petPopupVisible" position="bottom" round teleport="#phone-teleport">
      <div class="filter-popup">
        <div class="filter-popup-title">{{ t('user.reports.filterPet') }}</div>
        <div class="filter-option" :class="{ 'is-active': filterPetId === '' }" @click="onPetSelect('')">
          <span>{{ t('user.reports.allPets') }}</span>
          <van-icon v-if="filterPetId === ''" name="success" color="#ff6b00" />
        </div>
        <div
          v-for="p in pets"
          :key="p.id"
          class="filter-option"
          :class="{ 'is-active': filterPetId === p.id }"
          @click="onPetSelect(p.id)"
        >
          <span>{{ SPECIES_ICON[p.species] }} {{ p.name }}</span>
          <van-icon v-if="filterPetId === p.id" name="success" color="#ff6b00" />
        </div>
      </div>
    </van-popup>

    <!-- 时间区间筛选 -->
    <van-calendar
      v-model:show="showCalendar"
      type="range"
      :min-date="calendarMin"
      :max-date="calendarMax"
      :default-date="calendarDefault"
      :title="t('user.reports.filterTime')"
      @confirm="onCalendarConfirm"
    />

    <!-- 评分区间筛选 -->
    <van-popup v-model:show="scorePopupVisible" position="bottom" round teleport="#phone-teleport">
      <div class="filter-popup">
        <div class="filter-popup-title">{{ t('user.reports.filterScore') }}</div>
        <div class="score-range-value">{{ scoreDraft[0] }} ~ {{ scoreDraft[1] }} {{ t('user.reports.score') }}</div>
        <van-slider v-model="scoreDraft" range :min="0" :max="100" :step="5" active-color="#ff6b00" />
        <div class="score-range-hint">{{ t('user.reports.scoreRangeHint') }}</div>
        <div class="filter-popup-footer">
          <van-button size="small" plain round @click="resetScore">{{ t('user.reports.reset') }}</van-button>
          <van-button size="small" round type="primary" @click="confirmScore">{{ t('common.confirm') }}</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 手动生成报告 -->
    <van-popup v-model:show="genVisible" position="bottom" round teleport="#phone-teleport">
      <div class="filter-popup gen-popup">
        <div class="filter-popup-title">{{ t('user.reports.generate') }}</div>
        <div class="gen-field">
          <div class="gen-label">{{ t('user.reports.selectPet') }}</div>
          <div class="gen-pet-options">
            <div
              v-for="p in pets"
              :key="p.id"
              class="filter-option"
              :class="{ 'is-active': genPetId === p.id }"
              @click="genPetId = p.id"
            >
              <span>{{ SPECIES_ICON[p.species] }} {{ p.name }}</span>
              <van-icon v-if="genPetId === p.id" name="success" color="#ff6b00" />
            </div>
          </div>
        </div>
        <div class="gen-field">
          <div class="gen-label">{{ t('user.reports.timeRange') }}</div>
          <van-radio-group v-model="genRangeType" direction="horizontal">
            <van-radio name="week">{{ t('user.reports.thisWeek') }}</van-radio>
            <van-radio name="month">{{ t('user.reports.thisMonth') }}</van-radio>
            <van-radio name="custom">{{ t('user.reports.custom') }}</van-radio>
          </van-radio-group>
          <div v-if="genRangeType === 'custom'" class="gen-custom" @click="genCalendarVisible = true">
            <span>{{ genCustomText }}</span>
            <van-icon name="arrow-down" />
          </div>
        </div>
        <div class="gen-hint">{{ t('user.reports.rangeHint') }}</div>
        <div class="filter-popup-footer">
          <van-button size="small" plain round @click="genVisible = false">{{ t('common.cancel') }}</van-button>
          <van-button size="small" round type="primary" :loading="generating" @click="doGenerate">
            {{ t('common.confirm') }}
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 生成报告：自定义时间区间 -->
    <van-calendar
      v-model:show="genCalendarVisible"
      type="range"
      :min-date="calendarMin"
      :max-date="calendarMax"
      :title="t('user.reports.custom')"
      @confirm="onGenCalendarConfirm"
    />

    <!-- 悬浮生成报告按钮（不随页面滚动） -->
    <van-button class="fab" type="primary" icon="plus" round @click="openGenerate">
      {{ t('user.reports.generate') }}
    </van-button>
  </div>
</template>

<style scoped lang="scss">
.reports {
  padding: 0 14px 16px;
}

.report-tabs {
  :deep(.van-tabs__wrap) {
    background: #fff;
    border-radius: 12px;
    margin-bottom: 10px;
  }
}

/* ---- 筛选栏 ---- */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 110px;
    padding: 6px 12px;
    border-radius: 16px;
    background: #fff;
    font-size: 12px;
    color: var(--sp-text-secondary);
    cursor: pointer;

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    &.is-active {
      color: #fff;
      background: var(--sp-primary);
    }
  }

  .filter-reset {
    margin-left: auto;
    font-size: 12px;
    color: var(--sp-primary);
    cursor: pointer;
  }
}

/* ---- 列表卡片 ---- */
.report-card {
  padding: 14px;
  margin-bottom: 12px;
  cursor: pointer;
}
.report-top {
  display: flex;
  align-items: center;
  gap: 10px;

  .unread-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff3b30;
    flex-shrink: 0;
  }
  .report-main {
    flex: 1;
    min-width: 0;
    .report-head {
      display: flex;
      align-items: baseline;
      gap: 8px;
      .report-pet {
        font-size: 14px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .report-period {
        flex: 1;
        min-width: 0;
        font-size: 11px;
        color: var(--sp-text-placeholder);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    .report-summary {
      margin-top: 4px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
  }
  .report-score {
    text-align: center;
    flex-shrink: 0;
    .score-num {
      font-size: 24px;
      font-weight: 800;
      color: var(--sp-success);
      &.warn {
        color: var(--sp-warning);
      }
    }
    .score-label {
      font-size: 11px;
      color: var(--sp-text-placeholder);
    }
  }
}
.report-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--sp-border);
}

/* ---- 筛选弹层 ---- */
.filter-popup {
  padding: 16px;
  max-height: 60vh;
  overflow-y: auto;

  .filter-popup-title {
    font-size: 15px;
    font-weight: 700;
    text-align: center;
    margin-bottom: 12px;
  }
  .filter-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 4px;
    font-size: 14px;
    border-bottom: 1px solid var(--sp-border);
    cursor: pointer;

    &:last-child {
      border-bottom: none;
    }
    &.is-active {
      color: var(--sp-primary);
      font-weight: 600;
    }
  }
  .score-range-value {
    text-align: center;
    font-size: 20px;
    font-weight: 800;
    color: var(--sp-primary);
    margin-bottom: 12px;
  }
  .score-range-hint {
    margin-top: 8px;
    font-size: 12px;
    color: var(--sp-text-placeholder);
    text-align: center;
  }
  .filter-popup-footer {
    display: flex;
    gap: 12px;
    margin-top: 16px;
    .van-button {
      flex: 1;
    }
  }
}

/* ---- 悬浮生成按钮 ---- */
.fab {
  position: fixed;
  right: 16px;
  bottom: 32px;
  z-index: 200;
  box-shadow: 0 4px 16px rgba(255, 107, 0, 0.35);
}

/* ---- 生成报告弹层 ---- */
.gen-popup {
  .gen-field {
    margin-bottom: 16px;
  }
  .gen-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--sp-text-secondary);
    margin-bottom: 8px;
  }
  .gen-pet-options {
    max-height: 180px;
    overflow-y: auto;
  }
  .gen-custom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    background: #f7f9fc;
    font-size: 13px;
    color: var(--sp-text-secondary);
    cursor: pointer;
  }
  .gen-hint {
    margin-top: 4px;
    font-size: 12px;
    color: var(--sp-text-placeholder);
    line-height: 1.6;
  }
}
</style>
